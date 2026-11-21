# Uncharted: Product Requirements Document

**Working name:** Uncharted (alternate: Base Rate)
**Date:** 2026-11-21
**Status:** Hackathon build, v1
**Tracks:** Canada Life Future Me Challenge, Organizers Choice: Most Adventurous

---

## 1. Summary

Uncharted is a mobile web app that replaces the doom feed with a feed of your own futures.

The user types a fear ("layoffs in my field") or a dare ("quit and travel for four months"). A Monte Carlo simulator runs their finances through 5,000 five-year futures under that scenario. The user swipes through a sample of those futures as cards, shown at their real frequency. One card in the feed offers a small weekly saving. Tapping it reshuffles the same futures with the buffer in place, and the user sees how many change.

The core claim: doomscrolling is a sampling problem. A doom feed shows the worst futures every time. Uncharted shows all of them in proportion and gives the user one lever.

## 2. Problem

Canada Life and Deloitte's 2026 research on Gen Z savers found that uncertainty about the future, on top of cost of living, keeps young Canadians from long-term saving. Findings this product is built on:

- Gen Z averages about 74 minutes of doomscrolling a day. Each extra daily hour is associated with a 4.4% lower probability of setting up automatic long-term contributions.
- Gen Z withdraws from RRSPs more often than millennials did at the same age (12% more) and than Gen X (42% more).
- One in eight Gen Z respondents believe humanity will go extinct in their lifetime.
- Fear-based and dystopian messaging backfired in testing. Messages about resilience, agency and small concrete steps worked.
- Flexibility and control worked better than a fixed target such as retirement at 65.
- Canada Life's response (October 2026) lets employees direct their own contributions to short and medium-term goals while the employer match goes to retirement.

Existing tools answer this with a smooth projection to age 65. The target user does not believe in that line, so they ignore it.

## 3. Users

**Primary:** Canadians aged 19 to 27, in school or in their first few jobs, often on contract or part-time work, with under $5,000 saved. They scroll bad news daily and have no automatic savings set up.

**Demo audience:** Canada Life judges (assume some have actuarial or pension backgrounds) and hackathon organizers. They will use the app on their own phones for 60 to 90 seconds.

### Seeded personas (fictional, illustrative numbers)

| ID | Persona | Net income / mo | Essentials / mo | Savings | Saves now / mo | EI eligible |
|---|---|---|---|---|---|---|
| maya | Maya, 23, contract analyst, Toronto | $3,400 | $2,600 | $1,200 | $0 | No |
| dev | Dev, 21, student with part-time job, London ON | $1,400 | $1,150 | $400 | $0 | No |
| sam | Sam, 26, full-time nurse, Halifax | $4,300 | $3,000 | $6,500 | $150 | Yes |

## 4. Goals and non-goals

### Goals

1. A user goes from a typed fear or dare to a swipeable feed of their futures in under five seconds.
2. The feed is statistically honest: displayed cards match the simulated outcome proportions.
3. The user sees the effect of one small weekly saving on the same set of futures.
4. The session ends on one concrete action, not a chart.
5. The full demo path runs in under 90 seconds on a phone.

### Non-goals

- No bank connection. Open banking is not live in Canada yet. Personas are seeded and editable.
- No real money movement.
- No accounts or login.
- No projection to retirement age. Horizon is five years.
- No investment or product recommendations. This is an educational simulation.
- No content classification inside the browser extension (stretch goal uses a manual button).

## 5. Design principles

1. **Honest sampling.** Cards are drawn in proportion to simulated outcomes. This must be literally true in the code because it is the pitch.
2. **Same world, one change.** The with-buffer and without-buffer runs share the same random draws. Future #2317 is the same future in both. Only the user's saving differs.
3. **Every rough card carries a way through.** A rough or hard card shows either the recovery or what the lever would have changed. No card ends on dread.
4. **The model does the math, the LLM does the reading.** The LLM classifies text into a fixed scenario library. It never invents a number.
5. **Say when it doesn't matter.** If a fear barely moves the user's outcomes, the app says so plainly.
6. **Calm tone.** No alarm colours, no countdowns, no shame copy.

## 6. User flow

1. **Pick a persona** (or edit four numbers: income, essentials, savings, current monthly saving).
2. **Enter a fear or a dare.** One text box plus preset chips.
3. **Swipe the feed.** 20 cards per session, vertical swipe.
4. **Hit the lever card** after card 5: "Add $25 a week and reshuffle." Tapping it reruns the feed with the buffer on. Each card now shows its before and after outcome.
5. **See the tally.** Counts across all 5,000 futures, before and after.
6. **Take one action.** A single next step with plain instructions.
7. **Open the map** (optional). 5,000 dots, one per future. Tap a dot to open its card.

## 7. Functional requirements

Priority: P0 is required for the demo. P1 is built if P0 is done by the milestone. P2 is stretch.

### 7.1 Simulator (P0)

| ID | Requirement |
|---|---|
| SIM-1 | Simulate 5,000 paths over 60 monthly steps, vectorized in numpy. |
| SIM-2 | Model job loss, expense shocks, rent growth, inflation on essentials, income growth and returns on positive balances. |
| SIM-3 | Accept a scenario from the library (section 8) that modifies parameters. |
| SIM-4 | Accept `weekly_extra` (0, 10, 25, 50). Run baseline and lever with identical random draws from one seed. |
| SIM-5 | Classify each path as `fine`, `rough_recovered` or `hard` (section 7.2). |
| SIM-6 | Record per path: outcome, event list, monthly balance series, end balance, minimum balance. |
| SIM-7 | Return a full result in under one second. |

**Monthly step, per path:**

```
1. Every 12 months: income *= 1 + raise; essentials *= 1 + inflation; rent part *= 1 + rent_growth
2. If employed: draw job loss against monthly hazard. If lost, draw months_out.
3. Cash flow:
     employed            -> balance += base_saving + weekly_extra * 52 / 12
     unemployed          -> balance += replacement_rate * income - essentials   (0 income if not EI eligible)
     on a dare           -> balance -= essentials (plus one-time cost at dare start)
4. Draw expense shock. If hit, balance -= shock size.
5. Positive balance earns the blended monthly return. Negative balance is charged the debt rate.
6. Count down months_out. Re-employ at zero.
```

`weekly_extra` is capped at the persona's discretionary room (income minus essentials minus base saving).

**Default parameters.** These are demo defaults and are not calibrated. Label them as assumptions in the UI and replace with sourced values (Statistics Canada, Bank of Canada) if time allows.

| Parameter | Default |
|---|---|
| Monthly job-loss hazard | 0.01 |
| Months out of work | geometric, mean 3 |
| Income replacement while out (EI stand-in) | 0.5 of net if eligible, else 0 |
| Expense shock | 6% chance per month, lognormal, median $500 |
| Inflation on essentials | 2.5% a year, sd 1% |
| Rent growth | 3% a year |
| Annual raise | 3%, sd 2% |
| Positive balance | 60% in savings at 3% a year, 40% in a balanced fund (5% mean, 10% volatility) |
| Debt rate on negative balance | 20% a year |

### 7.2 Outcome definitions (P0)

- **Fine:** balance never goes below zero.
- **Rough but recovered:** balance goes below zero at some point and is at or above zero at month 60.
- **Hard:** balance is below zero at month 60, or below zero for six months or more.

For a dare, also compute **affordable**: balance stays at or above zero from the dare's start until six months after income resumes.

### 7.3 Honest sampling (P0)

| ID | Requirement |
|---|---|
| SAMP-1 | A session shows 20 cards. Allocate slots to the three outcomes in proportion to the tally, using largest-remainder rounding. |
| SAMP-2 | Within each outcome, pick paths uniformly at random. Shuffle the 20. |
| SAMP-3 | After the lever is tapped, show the same 20 future IDs with their new outcomes. Do not resample. |
| SAMP-4 | Always show the full 5,000-path tally, since an outcome under 2.5% may get zero cards. |

### 7.4 Fear or dare input (P0 presets, P1 free text)

| ID | Requirement |
|---|---|
| IN-1 (P0) | Preset chips: three fears and two dares from the library. |
| IN-2 (P1) | Free text box. An LLM call with structured output returns `kind`, `scenario_id` and `intensity`. |
| IN-3 (P1) | If nothing in the library fits, return `kind: none` and show: "This one doesn't change your money much. Here are your futures as they stand." |
| IN-4 (P1) | A dare asks three follow-up fields: start month, months without income, one-time cost. The user sets these numbers. |
| IN-5 (P1) | If the LLM call fails or takes over three seconds, fall back to keyword matching. |

### 7.5 Feed and cards (P0)

| ID | Requirement |
|---|---|
| FEED-1 | Full-screen vertical cards with CSS scroll-snap. One card per screen. |
| FEED-2 | Card shows: future number, outcome label with icon, two-sentence story, balance sparkline with event markers, end balance. |
| FEED-3 | Story text is generated from templates filled by the path's events. No LLM call per card. |
| FEED-4 | Lever card appears after card 5 and again after card 15. Chips for $10, $25, $50 a week. |
| FEED-5 | After the lever is on, each card shows a before and after line: "Without the buffer: 3 months in debt. With it: covered." |
| FEED-6 | Outcome is never encoded by colour alone. |

**Story templates (examples):**

- Fine, no events: "Nothing dramatic happened. You ended with $9,400 and options."
- Rough but recovered: "Laid off in month 26. Four months out, two of them on credit. Back to zero by month 33."
- Hard: "A long gap in year two put you $3,100 behind. With $25 a week from today, this future ends at zero debt."
- Dare, affordable: "You left in March 2028 with $7,900. You came back with $1,200 and were working again in two months."

### 7.6 Tally and action (P0)

| ID | Requirement |
|---|---|
| TALLY-1 | Show counts out of 5,000 for each outcome, before and after the lever. For a dare, show the affordable share. |
| TALLY-2 | Show the list of assumptions behind the run, one tap away. |
| ACT-1 | One action only: set up an automatic weekly transfer of the chosen amount. Show plain steps and a "remind me" option stored locally. |
| ACT-2 | One line of context on workplace plans: your own contributions can go to nearer goals while an employer match builds for later. Informational only. |
| ACT-3 | Disclaimer on this screen: simulated outcomes, educational tool, not financial advice. |

### 7.7 Futures map (P1)

| ID | Requirement |
|---|---|
| MAP-1 | One screen with 5,000 dots on canvas. X axis: balance at month 60. Dots grouped by outcome. |
| MAP-2 | Tap a dot to open that future's card. |
| MAP-3 | Toggle between baseline and lever. Dots animate to new positions. |

### 7.8 Browser extension (P2)

| ID | Requirement |
|---|---|
| EXT-1 | Chrome Manifest V3. A toolbar button sends the selected text or page title to the web app as a fear. |
| EXT-2 | Optional per-site timer on a fixed list of news and social sites. After N minutes, show a small prompt linking to the app. |

## 8. Scenario library

The LLM maps text to one entry plus an intensity (mild, moderate, severe). All numbers are fixed in code.

| ID | Kind | What changes (moderate) |
|---|---|---|
| layoff | fear | Job-loss hazard 0.03 a month, mean 5 months out |
| hours_cut | fear | Income down 30% for 9 months, starting at a random month in year 1 |
| rent_spike | fear | One-time 15% rent jump at a random month in year 1 |
| inflation | fear | Essentials inflation 6% a year for 2 years |
| market_drop | fear | 25% drop on the invested share at a random month in the first 24 |
| time_off | dare | N months with no income, plus a one-time cost |
| move_city | dare | One-time cost, essentials change by X% afterward |
| back_to_school | dare | N months at reduced income, plus tuition as one-time cost |

Mild and severe scale the moderate values by 0.5 and 1.5.

## 9. API

Backend holds the latest simulation in memory, keyed by `sim_id`.

**POST `/api/simulate`**

```json
{
  "persona": {"id": "maya"},
  "scenario": {"id": "layoff", "intensity": "moderate", "params": {}},
  "weekly_extra": 25,
  "seed": 42
}
```

Response:

```json
{
  "sim_id": "a1b2",
  "scenario": {"id": "layoff", "kind": "fear", "label": "Layoffs in your field"},
  "assumptions": ["Job-loss chance 3% a month", "No EI for contract work"],
  "tally": {
    "baseline": {"fine": 2410, "rough_recovered": 1630, "hard": 960},
    "lever":    {"fine": 3720, "rough_recovered": 980,  "hard": 300}
  },
  "cards": [
    {
      "future_id": 2317,
      "baseline": {"outcome": "rough_recovered", "end_balance": 310,  "min_balance": -1840,
                   "series": [1200, 1200, 1150], "story": "Laid off in month 26..."},
      "lever":    {"outcome": "fine", "end_balance": 6240, "min_balance": 420,
                   "series": [1200, 1308, 1417], "story": "Laid off in month 26. The buffer covered it."},
      "events": [{"month": 26, "type": "job_loss", "months": 4}]
    }
  ],
  "map": [{"future_id": 0, "baseline_end": 5120, "lever_end": 11800,
           "baseline_outcome": "fine", "lever_outcome": "fine"}]
}
```

The tally numbers above are placeholders to show shape.

**POST `/api/classify`**

```json
{"text": "everyone says AI is going to take entry level jobs"}
```

```json
{"kind": "fear", "scenario_id": "layoff", "intensity": "moderate",
 "label": "Entry-level jobs dry up", "needs": []}
```

**GET `/api/sim/{sim_id}/future/{future_id}`** returns one full card (for map taps).

**GET `/api/personas`** returns the seeded personas.

## 10. Technical approach

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React, Vite, TypeScript | Mobile first. CSS scroll-snap for the feed. SVG sparklines. Canvas for the map. |
| Backend | Python, FastAPI, numpy, pydantic | One process. Simulation is stateless apart from the in-memory cache. |
| LLM | Any provider with structured output | Used only in `/api/classify`. |
| Hosting | Static frontend host plus one small backend service | Share by QR code. |
| Offline fallback | Precomputed JSON for every preset chip, bundled in the frontend | The demo must survive bad wifi. |

**Privacy:** nothing is stored server side beyond the in-memory simulation. Free text is sent to the LLM provider for classification, and the UI says so.

## 11. Demo success criteria

- A judge scans a QR code and reaches the feed in two taps.
- Preset fear to first card in under two seconds.
- Tapping the lever visibly changes at least a few of the 20 cards and the tally.
- The displayed card mix matches the tally proportions (verified by a unit test).
- Same seed gives the same result twice.
- The preset path works with the backend unreachable.

## 12. Milestones and cut line

Times are hours from build start. Adjust to the real deadline.

| By | Milestone | Scope |
|---|---|---|
| H+1 | Contract locked | Personas, API shapes, mock JSON file committed |
| H+5 | **M1: honest feed** | SIM, SAMP, FEED with presets, lever, tally. This is a complete demo. |
| H+9 | M2: fear or dare | Free text classify, dare inputs, action screen |
| H+12 | M3: map | Futures map with tap-through |
| H+14 | M4: stretch | Extension button |
| H+16 | Freeze | Deploy, offline fallback, backup video recorded |
| H+18 | Pitch | Two rehearsals with a timer |

**Cut order if behind:** extension, then map, then free text. Never cut the lever or the tally.

**Suggested split:**

- A: simulator, scenario library, sampling, tests.
- B: feed UI against the mock JSON from hour one.
- C: classifier prompt, story templates, tally and action screens.
- D: personas, copy, pitch, submission page, backup video.

With two people, combine A with C and B with D.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Rough futures feel like more doom | Principle 3. Test on three people outside the team before M2. |
| Judges challenge the numbers | Assumptions panel one tap away. Parameters labelled as assumptions. Fixed library, no LLM-invented values. |
| "Discover the unknown" read literally by organizers | Open that pitch with the link: your next ten years are the unknown. |
| Lever barely moves the tally for some personas | Tune presets beforehand so the demo persona shows a clear effect. Still report honestly when the effect is small. |
| Wifi or LLM failure during demo | Offline preset JSON, keyword fallback, backup video. |
| Scope creep | Cut order above. M1 is the product. |

## 14. Pitch hooks

**Canada Life (30 seconds):**
"Gen Z doomscrolls 74 minutes a day. That feed has a sampling problem: it shows the worst futures every single time. So we rebuilt it with honest sampling. Paste the headline that scared you and swipe through five thousand of your own futures at their real odds. Most are fine. Some are rough. One tap on twenty-five dollars a week reshuffles the deck. Same thumb, same habit, a feed that tells the truth."

**Most Adventurous (30 seconds):**
"The biggest unknown anyone here will explore is their own next ten years. Most of us only see it through a feed that shows the worst version. We built a way to go look. Type a fear or a dare, like quitting to travel for four months, and swipe through five thousand of your own futures. Then open the map and visit any one of them. Explorers don't wait for certainty. They pack for it."

## 15. Open questions

1. Can one project be submitted to both tracks?
2. Submission deadline, and is judging at tables or on a stage?
3. Team size and who owns frontend?
4. Which LLM provider do we have credits for?
5. Is there time to replace default parameters with sourced Canadian figures?

## 16. Sources

- Canada Life, Gen Z retirement planning research: https://www.canadalife.com/investing-saving/retirement/group-retirement-savings/gen-z-retirement-planning-savings.html
- Wealth Professional, coverage of the Canada Life and Deloitte findings: https://www.wealthprofessional.ca/news/industry-news/gen-z-retirement-savings-threatened-by-existential-dread-canada-life-research-finds/393753
- Insurance Business, coverage of the October 2026 plan options: https://www.insurancebusinessmag.com/ca/news/group-benefits/canada-life-lets-gen-z-save-short-term-while-employer-match-stays-for-retirement-593079.aspx
- Benefits and Pensions Monitor, job-tenure figures: https://www.benefitsandpensionsmonitor.com/pensions/retirement-planning/gen-zs-existential-dread-is-reshaping-workplace-savings-canada-life/394423
