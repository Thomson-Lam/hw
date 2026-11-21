# road-lab validation (2026-11-21)

| # | Step | Result | Artifact |
|---|---|---|---|
| 1 | `npm run lab -- fixtures` | 50 fixtures + 3 injects + 27 fallback walks, 0 failures, exit 0. Mutants (disabled disclose-first, removed phone-size fixture) → exit 1 | 01-fixtures.txt, 01-fixtures-mutation.txt, 10/15-fixtures*.txt |
| 2a | lab sim, 3 packs × 4 personas, seed 1 (+ 120 more over 10 seeds) | 12/12 and 132/132 at Rome; unsafe_on_road 0; effects_without_click 0 | 11-lab-sim.txt, 05-lab-sim-aggregate.md, lab-runs/ |
| 2b | lab live (gemini-3.5-flash-lite), one steady run per pack | 3/3 at Rome; unsafe 0; no-click effects 0; LLM coverage 0.42 / 0.38 / 1.0; Gemini broke pack rules often (limits-first 9, no-surprise-cost 16, fork-values 10) and the compiler stopped each one | 12-lab-live.txt, lab-runs/*live* |
| 3 | `npm run check` (lint + typecheck + build) | exit 0, 0 warnings (after the turbopackIgnore fix) | 13-npm-check.txt, 14-npm-check-final.txt |
| 4 | prod server, temp SQLite, Playwright 375 px | gate 307/401/404; 3 packs + light run reach Rome; realign → FHSA; decline → loop; crisis → 9-8-8 help tile; LLM tiles replace fallback; rule (avoid stocks) from 2 skips, erased, regrown; brain injects rejected (disclose-first, no-diagnosis, merch-license); pack swap restarts phone | prod/e2e-report.txt, prod/screens/ |
| 5 | restart server | rule `(avoid stocks)` and grown tile `merch-board: Low poly horse` still there; runs table has moods and reached_rome | prod/e2e-report.txt (E) |
| 6 | forced 402 (stub GEMINI_API_BASE) | 1 stub hit; run stopped=1; road reached Rome on fallback (llm 0); later pave → "model calls stopped for this run", stub hits still 1 | prod/e2e-report.txt (F), 03-paver-dev.txt |
| 7 | screenshots reviewed | dark + light, all packs, STL colour per theme (oklch fix), brain view | prod/screens/, dev-screens/ |

Bugs found by validation and fixed: IntersectionObserver keyed on length (toll booth never "reached"); campfire/help counted as filler past budget; lead-in tiles skipped pack invariants; runs moods never written; key not visible to routes via next.config alone; Turbopack whole-project trace warning; THREE could not parse oklch (white horse in light mode).
Scripts to rerun: scripts/validate.mjs, walk.mjs, brain.mjs, light.mjs (paths point at /Users/tlam/hw/playground).
