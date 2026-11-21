# Road Lab — How It Works

## What It Does
One engine, three roads. You scroll down a road that an LLM paves as you move, and a closed compiler checks every stretch before you see it. Each road (a *pack*) ends at one real action: an automatic contribution (Canada Life), a covered appointment (Sun Life), or a printable horse saved for Hack Western merch (Merch Trail).

## Architecture
```
 phone /prototypes/road-lab                                server (next start, local only)
 ┌──────────────────────────────────────────┐            ┌─────────────────────────────────────────────┐
 │ IntersectionObserver ─▶ RoadSession.visit │            │ /api/road-lab/pave ─▶ paveStretch()          │
 │   horse: dwell → pace, skips → rules      │  ctx JSON  │   gemini-3.5-flash-lite ─▶ compile()         │
 │ ensureAhead(): pack.fallback(ctx)         │ ─────────▶ │   rejected? errors back, ≤3 attempts         │
 │   └▶ compile() ─▶ road (always paved)     │            │   401/402/403 ─▶ runs.stopped = 1            │
 │ onPave(src): compile() again ─▶ replace   │ ◀───────── │ /search (Printables) /stl (proxy)            │
 │   unreached fallback stretch              │            │ /rules /tiles /runs /trace (node:sqlite)     │
 │ choose(): lead-in tile, choice in ctx     │            │ /control (pack swap) /inject (demo rejects)  │
 │ confirm(): the ONLY effect (click)        │            └─────────────────────────────────────────────┘
 └──────────────────────────────────────────┘                         ▲ polls trace every 500 ms
                                                     laptop /prototypes/road-lab/brain
```
Same `RoadSession` code runs in the lab CLI with personas on a virtual clock.

## The closed language
`(stretch TILE…)` with tiles `signpost`, `vista`, `bridge`, `fog`, `checkpoint`, `fork` (2–3 branches, each with one `:lead` tile), `toll-booth`; Merch Trail adds `search` and `pick`. `mood`, `campfire`, `help` are engine-only. `(deftile NAME (params) TILE)` grows a reusable tile (expansion depth ≤ 8). The reader rejects anything else; nothing is ever evaluated.

**The LLM never writes facts.** Claims come only by fact id (pack facts table) or result id (search rows). LLM labels are 1–6 words and pass the grounded-text guard (no numbers missing from the context, no claim words, no clinical terms in Sun Life).

## Invariants
- **Universal (19):** syntax, size, no-noise, engine-only, stretch-size, fork-arity, fork-last, fork-values, lead-kind, no-silent-effect, unknown-fact, unknown-topic, checkpoint-kind, grounded-text, label-length, user-rule, all-roads-to-rome, grown-tile, termination.
- **canada-life:** disclose-first (risk + fees before the toll booth), limits-first, goal-realign (limits shown for the *current* account).
- **sun-life:** no-diagnosis, crisis-exit (after 9-8-8 only `help` may follow), no-surprise-cost (coverage + cost for the chosen care before booking).
- **merch-trail:** real-results, merch-license (allowlist), phone-size (STL ≤ 5 MB), pick-shown, search-form, attribution.

`all-roads-to-rome`: filler tiles may only use the slack left after the unmet steps (`pack.requirements`), so every road reaches its toll booth.

## Frontend
- **State:** `RoadSession` (engine/session.ts) is an external store (`useSyncExternalStore`). Device id in `localStorage` (`pg:road-lab:device`).
- **Loop:** fixed opening → lookahead 3 tiles of compiled fallback → each fallback stretch requests an LLM stretch → the LLM stretch replaces it only if the user has not reached it. Forks carry lead-in tiles, so a choice never waits on the model.
- **Horse:** pace = mean of the last 3 dwells (rush < 700 ms, linger > 2200 ms). A signpost passed in < 700 ms is a skip; two skips of a topic grow `(avoid topic)` (protected topics excepted). Rules show in the legend and can be erased; the road ahead re-paves.
- **Pace at render:** facts show one line; they unfold after 2.2 s on the tile, or always at linger pace.
- **Responsive:** single column `max-w-md`, every control ≥ 44 px, icon-only header buttons on mobile. Brain view is a 1–3 column grid.
- **Motion:** fact unfold animates `grid-template-rows` with ease-out; STL models turn only without `prefers-reduced-motion`.
- **Theme:** tokens only; the STL material reads `--foreground`.

## API
| Route | Request → Response |
|---|---|
| `POST /api/road-lab/runs` | `{pack, device}` → `{id}`; `PATCH` `{id, mood_before|mood_after|reached_rome|ended_at|ctx}`; `GET ?id` |
| `POST /api/road-lab/pave` | `{run, ctx, startIndex}` → `{ok, src}` or `{ok:false, stopped, error}` |
| `POST /api/road-lab/search` | `{run, query}` → `{rows}` (allowlisted, ≤ 5 MB STL, merch-trail only) |
| `GET /api/road-lab/stl` | `?print&file` → STL bytes from files.printables.com |
| `GET/POST/DELETE /api/road-lab/rules` | avoid rules per device + pack (protected topics → 409) |
| `GET/POST/DELETE /api/road-lab/tiles` | grown tiles (must compile as one deftile; merch-board from save-pick) |
| `GET/POST /api/road-lab/trace` | trace events of the latest or given run |
| `GET/POST /api/road-lab/control` | current pack + nonce (brain view swap) |
| `POST /api/road-lab/inject` | `{case}` → compiles a known-bad stretch with the live ctx |

## AI Usage
- **Model:** `gemini-3.5-flash-lite`, no thinking, temperature 0.7, ≤ 500 output tokens, 8 s timeout. Chosen from a live benchmark: p50 854 ms for 4 tiles, 6/6 valid within 3 attempts; `gemini-3.8-flash` took ~6.4 s and ran out of tokens on thinking.
- **How:** server-side REST `generateContent` (`server/gemini.ts`); key from repo-root `.env` (`server/env.ts`), never sent to the client. `GEMINI_API_BASE` overrides the host (validation uses a 402 stub).
- **System prompt:** the pack's persona (who the road is for, where it ends) + the grammar + compiler rules (labels ≤ 6 words, no facts, no effect words, avoid topics, spend road only within SLACK).
- **User prompt:** PACE, MOOD, PATH, CHOICES, NEEDS (ordered), SLACK, AVOID, NUMBERS, TOPICS, CHECKPOINTS, FORK KEYS, GROWN TILES, FACTS (id, topic, short text), RESULTS (merch).
- **Rewrite loop:** compiler errors go back as the next user turn, ≤ 3 attempts; then the fallback stays.

## Key Dependencies
`node:sqlite` (built in), `three` (STL viewer), shadcn `Button`/`Badge`/`Slider`/`Sheet`, `tsx` (lab CLI), Playwright (validation).

## Component Tree
```
page.tsx → RoadLab
  ├─ PackPicker
  └─ RoadScreen (useSyncExternalStore)
      ├─ RoadHeader → Legend (Sheet)
      └─ RoadView → TileCard → FactText | ForkTile | MoodTile | PickTile → StlViewer | TollBooth | CampfireTile | HelpTile
brain/page.tsx → BrainView → Panel × 6, Verdicts
```

## Error Handling
- Every route is wrapped in `safe()` (500 with a message). Bad input → 400, unknown run → 404, protected rule → 409, bad grown tile → 422, Printables down → 502.
- Model 401/402/403 → `runs.stopped = 1`; later pave calls return `stopped` without calling the model (ROADLAB-5). The road keeps going on the fallback paver.
- A fallback stretch that fails to compile is never rendered; it counts as `unsafe` (lab metric, must be 0).
- Search results for a replaced search tile are ignored. LLM replies for reached or dropped stretches are ignored (`late`).
- `localStorage` access goes through `lib/controls` storage (try/catch).

## Lab
```
npm run lab -- fixtures                         # every invariant has a reject fixture; fallback walks reach Rome
npm run lab -- run <pack|all> <persona|all> [--live] [--seed n]   # → lab/runs/<id>/{summary.json,report.md}
npm run lab -- compare <idA> <idB>
```
Personas: rusher (350 ms/tile), steady (1.2 s), lingerer (3 s), switcher (rush → linger). Metrics: stall_s, llm_coverage, pave_calls, rewrites, rejects_by_invariant, replaced, late, unsafe_on_road (must be 0), effects_without_click (must be 0), rules_added, paver p50/p95.

## File Structure
```
road-lab/
├─ page.tsx  road-lab.tsx  types.ts  metadata.json  HOW_IT_WORKS.md
├─ engine/  reader.ts compiler.ts guard.ts road.ts horse.ts session.ts prompt.ts
├─ packs/   index.ts common.ts canada-life.ts sun-life.ts merch-trail.ts
├─ server/  db.ts http.ts env.ts gemini.ts paver.ts printables.ts
├─ ui/      api.ts pack-picker road-screen road-header road-view tile-card fact-text fork-tile mood-tile
│           pick-tile stl-viewer toll-booth campfire-tile help-tile legend
├─ brain/   page.tsx brain-view.tsx use-trace.ts panel.tsx verdicts.tsx
└─ lab/     cli.ts fixtures.ts runner.ts data/printables-horse.json runs/
app/api/road-lab/{runs,pave,search,stl,rules,tiles,trace,control,inject}/route.ts
```
