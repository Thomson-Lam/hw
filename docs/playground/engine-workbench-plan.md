# Road Engine + Workbench: DRAFT plan

**Status: SUPERSEDED (2026-11-21 03:50).** The loop experiments changed the design: Spaceship speculation is dropped, the demo runs local only (no Vercel), and rules persist in SQLite. The frozen model replaces this file when the goal starts.

## Decisions (2026-11-21)
- Phase: pre-prototype. Speed of trying ideas is the top priority.
- No shared engine library and no frozen cross-prototype contract. We build **one minimal starter template**. Each prototype copies it and then changes anything.
- LLM provider is a per-run choice. The template has adapters for Cerebras, Gemini, Anthropic, and a simulated paver. Trying them is an experiment.
- Hosting: local only for the hackathon. No Vercel.

## Goal
Build "the tool that builds the tool": a headless Road engine plus a workbench. With them, anyone on the team (or an agent) can change one thing, such as a prompt, model, rule, invariant, horse threshold, or cache policy, then run it against fixed scenarios and get **numbers**, in minutes. UI is a wireframe with no aesthetics until the mechanics prove out.

## Shape

```
              scenario (persona trace + config)          live (phone scroll)
                          │                                     │
                          ▼                                     ▼
 events ──▶ HORSE (rules | decision model) ──▶ intent: rushing/lingering/lost/curious
                          │
                          ▼
                          │  request stretch
                          ▼
             PAVER (LLM | simulated | fallback tiles) ──▶ Lisp program text
                          │
                          ▼
             COMPILER (reader → checker → invariants) ──reject──▶ rewrite (≤ N) ──▶ fallback
                          │ accept
                          ▼
             ROAD (accepted stretches) ──▶ renderer (wireframe prototype / brain view)
                          │
                          ▼
             TRACE (JSONL, every stage stamped) ──▶ METRICS ──▶ report.md for humans and agents
```

Every box is a **seam with a simulated version and a live version** (an `AsyncIterable` that takes an `AbortSignal`). Sim mode is deterministic: it uses a seeded RNG, a fake clock, and a recorded LLM. Live mode uses real models.

## Structure: starter template, copied per prototype

```
playground/
├── templates/road-lab/          starter kit: not a route, prototypes never import it
│   ├── engine/                  lisp/ invariants/ horse/ paver/ loop/ trace/ metrics/
│   ├── lab/                     cli.ts, scenarios/, experiments/
│   ├── ui/                      wireframe road + brain view
│   ├── page.tsx metadata.json HOW_IT_WORKS.md
│   └── TEMPLATE.md              what each part does and where to change it
├── scripts/new-prototype.mjs    npm run new -- <slug> --from road-lab   (copy + rename SLUG)
└── scripts/lab.mjs              npm run lab -- <slug> run|report|compare ...   (tsx runs <slug>/lab/cli.ts)
```

- A copy is a fork. It owns all of its code.
- If a change proves useful, a person moves it back into the template with a PR. Nothing syncs automatically.
- API keys stay server-side in `.env.local` and Vercel env. Live LLM calls go through `app/api/<slug>/pave/route.ts`. Every call appends to a token-usage log.
- Committed: `experiments/<name>.{json,md}` and each run's `summary.json`. Ignored: raw `trace.jsonl`.

## Pieces, in build order
1. **Lisp core**: reader, evaluator with a step budget, primitives that declare their effects, and a checker that computes effect bounds. Pure TS, no React. The CLI command is `engine check file.lisp`.
2. **Invariants**: the six rules from the brief as checker passes. Each pass gets passing and failing fixtures.
3. **Trace + metrics**: the event schema, a JSONL writer, and `engine report <run>`.
4. **Scenarios**: synthetic persona scroll traces (rusher "Maya", lingerer, avoider, backtracker) plus recorded real traces from phones.
5. **Horse**: rules first. It replays traces and outputs intent over time.
6. **Paver**: a provider adapter, versioned prompt files, a token/cost log, and fallback tiles.
8. **Loop runner**: `engine run <scenario> --config x` runs everything headless.
9. **Wireframe prototypes** in the playground. They use the engine: the brain view (timeline, cache tree, compiler verdicts) and a plain road you can scroll.

## Metrics every run reports
| Area | Metric |
|---|---|
| Compiler | accept rate, reject reasons by invariant, rewrites per stretch, check time p50/p95 |
| Safety | invariant violations that reached the road (**must be 0**), money effects without a toll-booth click (**must be 0**) |
| Paver | latency p50/p95, tokens, cost, malformed-output rate, fallback-tile rate |
| Horse | intent changes/minute, agreement with labelled traces |
| Product | time and distance to toll booth, forks per road, branches per fork (≤3), exit always visible |

A run writes `runs/<id>/{trace.jsonl, summary.json, report.md}`. `engine compare <a> <b>` diffs two summaries, so an agent can say "B reduces stalls 40% at +12% tokens" with evidence.

## Workflow for testing an idea
1. Write `experiments/<name>.json`: hypothesis, scenarios, the config change, and the metric that must move.
2. Run `engine run` → `engine compare baseline <name>`.
3. Write the verdict in `experiments/<name>.md` (kept or dropped, with the numbers).

## Verification
- Unit tests and golden fixtures for the reader, checker, and invariants.
- Property-based tests (fast-check) on the real checker: random programs never pass with a violation.
- `/create-formal-verification-skill`, once the checker exists. Likely targets: (a) no-silent-money / goal-realign as a state machine. It suits a TLA+ model.
