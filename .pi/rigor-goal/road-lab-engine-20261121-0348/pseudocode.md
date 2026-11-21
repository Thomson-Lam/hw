# road-lab: frozen pseudocode

One engine, three packs (canada-life, sun-life, merch-trail), one playground prototype `road-lab`. Local only.

## Files
```
playground/app/prototypes/road-lab/
  page.tsx metadata.json HOW_IT_WORKS.md road-lab.tsx types.ts data.ts
  engine/  reader.ts compiler.ts invariants.ts guard.ts horse.ts loop.ts fallback.ts prompt.ts trace.ts
  packs/   index.ts canada-life.ts sun-life.ts merch-trail.ts
  ui/      one file per component (tiles, mood check, toll booth, legend, stl viewer, pack picker, exits)
  brain/   page.tsx brain-view.tsx            → route /prototypes/road-lab/brain
  lab/     cli.ts personas.ts fixtures.ts report.ts runs/<id>/{summary.json,report.md}
  server/  db.ts (node:sqlite) gemini.ts printables.ts   (server-only)
playground/app/api/road-lab/{pave,search,stl,rules,tiles,runs,trace}/route.ts
playground/.data/road-lab.db  (gitignored)
```

## Closed language
```
stretch   := (stretch TILE+)              ; 3–4 tiles from the LLM; fallback may emit 2–4
TILE      := (signpost FACT-ID | LABEL)    ; fact text resolved at render, sized by pace
           | (vista LABEL [FACT-ID])       | (bridge FACT-ID) | (fog)
           | (checkpoint KIND)             ; KIND ∈ pack.checkpointKinds, text from pack facts
           | (fork BRANCH BRANCH [BRANCH]) ; must be the last tile
BRANCH    := (branch LABEL :lead TILE)     ; lead-in tile per branch, written in the same call
           | (toll-booth :effect EFFECT)   ; EFFECT ∈ pack.effects; amounts/ids from user input or pack data
           | (campfire) | (search QUERY :KW VAL...)   ; search only in merch-trail; tool runs server-side
           | (pick RESULT-ID)              ; merch-trail candidate; id must come from this run's results
           | GROWN-NAME args...            ; via (deftile NAME (params) TILE), expansion depth ≤ 8
LABEL     := string, ≤ 6 words, passes guard
```
Exit (and health crisis exit) are drawn by the renderer on every stretch; the LLM cannot remove them.

## compile(src, ctx, pack) → { ok, tiles, errors[] }
```
forms = read(src)                                  # syntax error → reject "syntax"
expand deftile (bound 8)                           # unknown/too deep → reject "grown-tile"/"termination"
for each tile t (in order, seen = ctx.seen):
  kind ∉ core kit ∪ pack.tiles ∪ grown            → reject "no-noise"
  :effect on non-toll-booth                        → reject "no-silent-effect"
  fork arity ∉ 2..3                                → reject "fork-arity"; fork not last → "fork-last"
  fact id ∉ pack.facts                             → reject "unknown-fact"
  checkpoint kind ∉ pack.checkpointKinds           → reject "checkpoint-kind"
  every LABEL: guard(label, ctx.numbers, pack.bannedTerms) → reject "grounded-text" | pack term rule
  topic ∈ ctx.rules.avoid and kind ≠ checkpoint    → reject "user-rule"
  pack.invariants(t, seen, ctx)                    → pack rejections (see state-machine.md)
budget: tiles used ≥ pack.budget[pace] and no toll-booth → reject "all-roads-to-rome"
```
Universal invariants (engine, every pack): syntax, no-noise, fork-arity, fork-last, no-silent-effect, unknown-fact, grounded-text, user-rule, all-roads-to-rome, grown-tile, termination.

## guard(label, numbers, banned)
```
any number token not in ctx.numbers                → reject "grounded-text: ungrounded number"
matches CLAIM = zero|no fees|guarantee*|risk-free|always|never lose|best|cheapest|safest|safe|%|per cent
                                                   → reject "grounded-text: claim word"
matches pack.banned (health: anxiety|depress*|diagnos*|disorder|you have|sounds like|adhd|ptsd)
                                                   → reject "no-diagnosis"
words > 6                                          → reject "label-length"
```

## Loop (client, road-lab.tsx + engine/loop.ts)
```
start(pack):
  run = POST /api/road-lab/runs {pack}; rules = GET /api/road-lab/rules?pack; grown = GET tiles
  road = pack.opening()                            # fixed: mood check + first fork; compiled; no LLM
  requestAhead()
on scroll tick (rAF):
  horse.observe(tile dwell, direction)             # pace = rush <700ms | linger >2200ms | steady; mean of last 3 tiles
  if pos changed: trace("horse", {pace, pos})
  if paved - pos < 3 and last tile not fork/toll/campfire: requestAhead()
requestAhead():
  fb = fallback(pack, ctx); res = compile(fb) ; assert res.ok else trace("bug") ; append(res.tiles, source=fallback)
  POST /api/road-lab/pave {pack, ctx, startIndex} (AbortController keyed by route+index)
on pave response {ok, tiles, attempts, ms, errors[]}:
  if ok and user has not reached startIndex: replace fallback tiles at startIndex.. with LLM tiles (source=llm)
  else: drop (late) ; trace verdicts either way
on tap branch b:
  route += b; lead-in tile of b appended (already compiled with fork); requestAhead() with choice in ctx
on linger ≥ 2200 ms on signpost: unfold (long fact text)
on skip (signpost with topic passed at rush pace) twice for same topic:
  rule = (avoid topic); if compile.ruleOk(rule, pack) [checkpoints exempt]: POST rules; legend shows; trace("rule")
on erase rule / undo grown tile: DELETE → abort pending, drop LLM tiles ahead of pos, requestAhead()
on goal realign (finance: change account at fork after toll seen): revoke pending effect, re-open disclosures
on toll booth:
  finance: slider amount ≤ pack.limits(room); confirm → effect contribute → trace("effect")
  health : shows covered + out-of-pocket (facts); confirm → effect book(category, slot)
  merch  : shows picked model, license, attribution; confirm → effect save-pick → POST tiles (grown "merch-board")
  then campfire → mood check (after) → PATCH run {mood_after} → end
```

## Paver (server, /api/road-lab/pave)
```
if session.stopped (prior 401/402/403): return {ok:false, stopped:true}
prompt = pack.system + grammar + ctx (pace, mood, path, seen, rules, budget, numbers, facts ids, grown, results ids)
for attempt in 1..3:
  text = gemini("gemini-3.5-flash-lite", prompt, temperature 0.7, maxOutputTokens 500, no thinking)
  if HTTP 401|402|403: session.stopped = true; trace("paver-stop"); return {ok:false, stopped:true}
  src = text from first "(stretch"; res = compile(src, ctx, pack)
  trace("compile", {attempt, ok, errors, ms, tokens})
  if res.ok: return {ok:true, tiles}
  prompt += model text + "Compiler rejected:" + errors
return {ok:false, errors}                          # client keeps fallback
```

## Merch search (server, /api/road-lab/search)
```
form (search printables "horse" :style s :supports x) → GraphQL searchPrints2(query, limit 30)
rows = items → {id, title, license, likes, fileSize(stl), image, stlFileId}
filter license ∈ ALLOW {Public Domain, CC Attribution, CC Attribution-ShareAlike, BSD}; stl ≤ 5 MB
return rows (facts) ; ids stored in ctx.results ; STL fetched via /api/road-lab/stl?print=&file= (getDownloadLink → proxy)
```

## Persistence (server/db.ts, node:sqlite, file playground/.data/road-lab.db)
```
rules(id, pack, device, form, source, created_at, erased_at)
grown_tiles(id, pack, device, name, form, created_at, undone_at)
runs(id, pack, device, started_at, ended_at, mood_before, mood_after, reached_rome)
trace(id, run_id, t, stage, json)
device = cookie "rl_device" (random id)
```

## Brain view (/prototypes/road-lab/brain)
```
poll GET /api/road-lab/trace?since=… every 500 ms (latest run)
panels: horse pace timeline · paver calls (model, ms, tokens, attempts) · compiler verdicts with invariant names
      · active rules (erasable) · grown tiles (undo) · pack invariants list · Rome
pack swap button: POST runs {pack: next} → phone road restarts on next poll of /api/road-lab/runs/current
demo buttons ("inject" a known-bad stretch per pack through the SAME compile path, trace shows the rejection):
  finance: toll-booth before risk ; health: label "sounds like anxiety" ; merch: pick of a NonCommercial id
```

## Lab CLI (`npm run lab -- <cmd>`)
```
fixtures                    → every invariant: ≥1 reject fixture rejected, valid fixtures accepted; exit 1 on miss
run <pack> <persona> [--live] [--seed n] → headless loop (sim paver or Gemini) → lab/runs/<id>/{summary.json,report.md}
compare <idA> <idB>         → metric diff table
metrics: stall_s, llm_coverage, calls, rewrites, rejects_by_invariant, fallbacks, unsafe_on_road (must be 0),
         effects_without_click (must be 0), tiles_to_rome, reached_rome
```
