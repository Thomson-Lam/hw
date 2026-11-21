# road-lab: frozen state machines

## A. Session (one run on the phone)

| State | Event | Next | Output / side effect |
|---|---|---|---|
| PackSelect | tap pack | Opening | POST runs; rules + grown tiles loaded |
| Opening | render | MoodBefore | fixed opening stretch, compiled, no LLM |
| MoodBefore | tap mood | Travelling | runs.mood_before; requestAhead() |
| Travelling | scroll, paved ahead | Travelling | horse pace update; lookahead requests |
| Travelling | scroll, reach fallback tile | Travelling | coverage −1, no stall |
| Travelling | linger ≥ 2.2 s on signpost | Travelling | signpost unfolds (long fact text) |
| Travelling | backtrack | Travelling | road behind fixed; trace "backtrack" |
| Travelling | same topic skipped 2× at rush | Travelling | (avoid topic) → ruleOk → legend; trace "rule" |
| Travelling | erase rule / undo grown tile | Travelling | abort pending; drop LLM tiles ahead; requestAhead() |
| Travelling | reach fork | AtFork | lead-in tiles already compiled |
| AtFork | tap branch | Travelling | lead-in appended; request with choice |
| AtFork | scroll past without tap | AtFork | road does not continue past an unchosen fork |
| Travelling | reach checkpoint | Travelling | seen += kind; fact text by pace |
| Travelling | finance: realign (pick other account after toll seen) | Travelling | pending effect revoked; disclosures re-required |
| Travelling | reach toll-booth | AtToll | compiler already proved pack preconditions |
| AtToll | adjust input (amount / slot / pick) | AtToll | finance amount clamped to room; vista updates |
| AtToll | confirm (click) | Campfire | the ONLY effect; trace "effect"; merch → grown tile |
| AtToll | decline | Travelling | short road back to toll-booth within budget |
| Campfire | tap mood | End | runs.mood_after, reached_rome=1 |
| any | tap exit | Exit | runs.ended_at; trace "exit" |
| any (sun-life) | tap crisis exit | Help | 9-8-8 call/text tile; road ends |
| any | pack swapped from brain view | PackSelect→Opening | new run for new pack |
| any | reload | PackSelect | rules + grown tiles restored from SQLite; road not restored |

## B. Paver job (server)

| State | Event | Next | Output |
|---|---|---|---|
| Idle | request | Calling | AbortController per route+index |
| Calling | 200 text | Compiling | ms, tokens traced |
| Calling | 401/402/403 | Stopped | session.stopped=true; all later requests return stopped; road continues on fallback |
| Calling | 5xx / network / timeout 8 s | Failed | fallback kept |
| Calling | abort (rule erased, route changed) | Aborted | trace "abort" |
| Compiling | ok | Accepted | client replaces fallback if not yet reached, else Late |
| Compiling | reject, attempt < 3 | Calling | errors appended as feedback |
| Compiling | reject, attempt = 3 | Failed | rejects by invariant traced |

## C. Rule lifecycle

| State | Event | Next | Output |
|---|---|---|---|
| None | 2nd skip of topic | Proposed | (avoid topic) |
| Proposed | ruleOk (not a checkpoint, not a pack-required kind) | Active | rules row; legend line |
| Proposed | conflicts with pack invariant | Refused | trace "rule-refused" (e.g. cannot avoid risk) |
| Active | erase | Erased | erased_at set; road ahead re-paved |
| Active | reload | Active | loaded from SQLite |

## D. Grown tile lifecycle

| State | Event | Next | Output |
|---|---|---|---|
| None | deftile in LLM stretch compiles | Active | grown_tiles row |
| None | merch save-pick confirmed | Active | grown "merch-board" with model, license, attribution |
| None | deftile fails compile | Refused | trace reason |
| Active | undo | Undone | undone_at; not offered to compiler |
| Active | reload / next run | Active | available as kit tile |

## E. Pack invariants

| Pack | Rome predicate | Invariants (beyond universal) | Effect | Facts source |
|---|---|---|---|---|
| canada-life | reached toll-booth :effect contribute | disclose-first (risk, fees before toll); limits (limits checkpoint before toll; amount ≤ room); goal-realign (pending effect revoked on account change) | (contribute :account tfsa|fhsa) amount+freq from slider | facts table (illustrative sim account: $300/mo spare, room from sim data) |
| sun-life | reached toll-booth :effect book | no-diagnosis (guard banned terms); crisis-exit (renderer + pack declares; help tile ends road); no-surprise-cost (coverage + cost checkpoints before toll); no-silent-booking (universal) | (book :category counselling|physio|checkup) slot from user | simulated benefits plan (coverage, used, left per category) + 9-8-8 |
| merch-trail | reached toll-booth :effect save-pick | merch-license (allowlist); attribution (CC-BY/BY-SA picks render attribution); phone-size (STL ≤ 5 MB); real-results (pick id ∈ this run's results) | (save-pick) id from user's chosen candidate | Printables search rows (server) |

## F. Personas (lab + sim)

| Persona | tile dwell | fork dwell | behaviour |
|---|---|---|---|
| rusher | 350 ms | 900 ms | skips signposts; reaches Rome fastest |
| steady | 1200 ms | 2000 ms | — |
| lingerer | 3000 ms | 4000 ms | unfolds signposts |
| switcher | rush → linger at tile 5 | — | pace surprise |
