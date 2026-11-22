# Hack Western 13: tracks

> **Scope update (Nov 21, 23:30).** We narrowed to one product: the money road in `Uncharted-PRD.md` section 0.
> Purpose: *Uncharted turns the scary headline you just scrolled past into a picture of your own future, and shows you how a small weekly saving keeps the bad versions survivable.*
> Submitting to: **Canada Life** (main), **MLH Gemini**, **Most Adventurous**. Dropped: Sun Life, the engine/packs pitch, the compiler brain view as a pitch point.

Source: https://hack-western-13.devpost.com/ (pulled 2026-11-21 03:11 EST). Theme: **"Discover the unknown."** Site visual: layered parallax mountains (green valley front, blue-grey ridges behind), a "Descend" call to action.

**Deadline: Nov 22, 2026 @ 9:00am EST.** All code must be written between Fri Nov 20 9pm and Sun Nov 22 9am.

## Judging criteria (all prizes)
| Criterion | Question judges ask |
|---|---|
| Innovation & Creativity | Is the idea new, or is technology used in an unexpected way? |
| Technical Complexity | Complex algorithms, integrations, or hardware? |
| Completeness | Does it work as intended? Any major bugs? |
| Design | Is it user-friendly, visually appealing, intuitive? |

## All tracks
Legend: **TARGET** = we aim for it · maybe = cheap to add if time allows · no = out of scope

| Track | Prize | Brief | Us |
|---|---|---|---|
| First / Second / Third Place Overall | iPad / AirPods Pro 3 / Fitbit Air per member | Best overall against the four criteria | **TARGET**: one clear purpose, a real simulator (5,000 futures, same random draws before and after), polished road UI |
| Organizers Choice: Most Adventurous | Arc'teryx toque per member | "A hack that enables others to discover the unknown." | **TARGET**: your next five years are the unknown; the road paves itself as you go |
| Best Health Hack by Sun Life | $100 Amazon card per member | Creative technical solution to a real health problem. Pitch must show **who it helps** and **what impact** it could have. | no (dropped to keep one clear purpose) |
| The Canada Life Future Me Challenge | $100 Visa card per member | Help Gen Z take **meaningful action toward their financial future** through motivation, visualization, behavioral nudges, education, or innovation. Turn uncertainty into confidence. | **TARGET** (core): money worry → your futures at real odds → a short money lesson → $25 a week → an automatic transfer |
| [MLH] Best Use of Gemini API | MLH swag kits | Push what is possible with Google Gemini API | **TARGET**: Gemini Decisions API reads the worry (money or not, which scenario); Gemini writes the weekly-saving options, checked against the persona's real room |
| [MLH] Best Use of Entire | Mini projector | Use Entire Sessions / Graph / Brain / Trails for agent-human collaboration | maybe: we already work agent-first; only if setup is trivial |
| [MLH] Best Domain Name from GoDaddy Registry | Digital gift card | Register a domain with GoDaddy Registry | maybe: 5 minutes, e.g. a `.xyz`-style road name |
| Best Use of QNX | $1,000 / $250 ×2 | Embedded AI on QNX OS, demo on hardware | no |
| Hire Your First AI Employee by TinyFish | $75 card + credits | Browser-job AI agent with TinyFish, post on X/LinkedIn | no |
| Best Hardware Prototype by PCBWay | $50 PCB credit | Hardware prototype | no |
| [MLH] Best Use of Solana | Hardware wallets | Solana app | no |
| [MLH] Best Use of Tiger Data | Stream Deck Mini | Tiger Data / Postgres time-series | no (our traces are tiny) |
| [MLH] Best Use of Vultr | Assorted | Deploy on Vultr | no (Vercel) |
| [MLH] Best Use of Auth0 | Headphones | Use Auth0 APIs | no |

## How one project hits the targets
| Track | What the judge must see in the demo |
|---|---|
| Overall | One sentence of purpose on the title screen, then a working road in under 90 seconds; the futures change for real when the weekly amount changes |
| Most Adventurous | The road paving ahead of you; "your next five years are the unknown, so go look" |
| Canada Life | Each part of the brief on screen: visualization (5,000 futures), education (the dial and the "where to keep it" cards), behavioural nudge ($25 a week, automatic), action (the transfer steps), with the disclaimer |
| Gemini (MLH) | Free text such as "AI is taking entry-level jobs" routed to the layoff scenario; Gemini-written weekly options |

Demo script: `docs/demo-script.md`.
