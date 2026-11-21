# road-lab: decisions

| # | Decision | Chosen | Evidence / who set it |
|---|---|---|---|
| D1 | Scope | One engine, three packs (canada-life, sun-life, merch-trail) + core; build all 4 parts | user: "one engine, and 3 paths", "do all 4" |
| D2 | Pack = swappable config: same compiler, different predicate + ruleset + facts + effect | yes | user answer Q1 (round 3) |
| D3 | LLM output unit | (stretch …) of 3–4 tiles, fact ids + labels ≤ 6 words, one lead-in tile per fork branch | sim: 4 tiles/call stalls 3.5× less than 1 tile @800 ms (/tmp/road-loop-proto/results.md) |
| D4 | Facts | LLM never writes facts; structural fact-id slots + grounded-text guard; stop = reject + rewrite + fallback | user: "LLM never gets a chance to make up facts, and when it does we stop it"; live: 6/25 accepted outputs had made-up claims; guard alone missed 1 → structure needed |
| D5 | Paver model | gemini-3.5-flash-lite, no thinking, temp 0.7, ≤500 out tokens | live: p50 854 ms, 6/6 valid ≤3 attempts; gemini-3.8-flash 6.4 s, 0/6 @4 tiles (live-results.md) |
| D6 | Loop | fixed opening; lookahead 3 tiles from feedback; lead-in at forks; pace at render; deterministic fallback compiled by same compiler; LLM replaces unreached fallback tiles | sim leadin: after-first-tile stall 0.02–0.64 s, 0 wasted (leadin-results.md); user approved |
| D7 | Spaceship | removed entirely (code, docs, reference repo) | user: "completely ditch spaceship" |
| D8 | Model API errors | 401/402/403 stops all calls for the session | live run: 48 calls hit 402 before stopping |
| D9 | Horse | rules: rush < 700 ms, linger > 2200 ms, mean of last 3 tile dwells | sim; pitch doc "keep the horse rules-first" |
| D10 | Fork input | tap the branch sign | delegated by user ("up to u"); swipe conflicts with scroll, linger = unfold |
| D11 | Persistence | SQLite via built-in node:sqlite, file playground/.data/road-lab.db; rules, grown_tiles, runs, trace | user: "rules need to stay, ideally sqlite"; node:sqlite OK on v26.9.0 |
| D12 | Hosting | local only; phone joins over LAN; no Vercel | user: "local only, no vercel" |
| D13 | Health pack | pitch-doc design: Rome = booked covered appointment; no-diagnosis, crisis-exit (9-8-8 on every stretch), no-surprise-cost, no-silent-booking; Worry-road "what's weighing on you" fork as opening | user pasted docs/pitch-engine.md after approving Worry road; newer and more specific |
| D14 | General pack | Merch Trail: agent searches Printables for a 3D-printable horse; candidates render as STL on the road; save-pick → grown "merch-board" tile | user: "I still like the merch trail"; Printables GraphQL + STL download + three.js render verified (/tmp/horse-research) |
| D15 | Merch license | allowlist {Public Domain, CC-BY, CC-BY-SA, BSD}; blocklist rejected | blocklist wrongly passed "Standard Digital File License"; 10/30 horse results pass allowlist |
| D16 | Location | single playground prototype road-lab; packs are files inside it; brain view at /prototypes/road-lab/brain | follows D2 + playground/AGENTS.md self-contained rule |
| D17 | Brain view sync | brain view polls trace every 500 ms; pack swap via runs API | local server; no websockets needed |
| D18 | Demo rejections | brain view "inject" buttons run a known-bad stretch through the same compile path | pitch doc §5 rejection moments |
| D19 | Gemini key | read GEMINI_API_KEY; next.config loads repo-root .env via @next/env | key lives in /Users/tlam/hw/.env (gitignored) |
| D20 | UI style | wireframe first, playground design tokens, 375 px | user: "minimal UI with no aesthetics" |
