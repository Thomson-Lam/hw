# Road Scroll: pitching it as an engine (Overall · Canada Life · Sun Life)

> **Superseded (Nov 21, 23:30).** We no longer pitch the general engine, the health pack or the Merch Trail. The product is the money road only: see `Uncharted-PRD.md` section 0 and `docs/demo-script.md`. Kept for history.

Nov 21, 2026 · builds on `idea-breakdown.md`

> Build note (2026-11-21 03:50): the build uses **lead-in tiles at forks plus a deterministic fallback road**, not Spaceship pre-paving (decision after the loop sim; see `.pi/rigor-goal/road-lab-engine-*/decisions.md`). "Nothing waits" still holds. A third pack, **Merch Trail** (an agent searches Printables for a 3D-printable horse for Hack Western merch), is also in scope.

## 1. The reframe in one breath

**Road Scroll is not a finance app. It is an engine that grows software around one person, safely.** An LLM writes the interface as you move. A closed compiler checks every piece before you see it. A domain pack supplies the rules, the building blocks, and the destination. Finance is the first pack. Health is the second.

> The LLM supplies the freedom. The compiler supplies the trust. The pack supplies the meaning.

Why this is the right cut, from first principles:

- An app is frozen decisions: someone chose the screens, the rules and the order in advance, for everyone. That is the "factory."
- An LLM alone can make anything, which is why nobody trusts it near money or health.
- A closed language plus a checker turns "anything" into "anything that satisfies these invariants." That is what makes per-person software possible: you don't need to trust the model, only the rules.
- The rules are the only domain-specific part. Swap them and the same engine grows a different world with different edges and a different destination.

So "general app that grows with you" is accurate, but don't pitch it in those words (see section 6). Pitch it as **one engine, many roads, each road with its own edges.**

## 2. What is engine and what is pack

| Layer | Part | Same for every domain? |
| --- | --- | --- |
| Engine | **Horse**: reads movement (pace, lingering, skipping, backtracking) in under 500 ms | Yes |
| Engine | **Paver (LLM)**: writes the next stretch as a program in the closed Lisp | Yes |
| Engine | **Compiler**: no eval, bounded execution, every primitive declares its effects; checks the program against the pack's invariants, rejects or asks for a rewrite | Yes |
| Engine | **Spaceship**: pre-paves 2–3 forks ahead so nothing waits *(build: replaced by lead-in tiles + fallback road)* | Yes |
| Engine | **Growth + rollback**: new tiles the LLM invents are checked, kept for that user, and undoable | Yes |
| Engine | **Universal invariants**: ≤3 branches per fork, exit always visible, no noise, irreversible effects only at a clicked toll booth, learned rules visible and erasable | Yes |
| Pack | **Domain invariants**: e.g. "risk and fees seen before the toll booth" | No |
| Pack | **Terrain kit**: the starting tiles and their meaning | No |
| Pack | **Effects + data**: what a toll booth can actually do (`:contribute`, `:book`) and the simulated data behind it | No |
| Pack | **Rome**: the one real action the road always ends in | No |

The sentence for judges: **"Six invariants are universal. The rest is a pack, and a pack is about a page of rules."**

## 3. The two demo packs

### Finance pack (Canada Life): the road to an automatic contribution

- **Rome:** an automatic contribution set up (account, amount, frequency).
- **Domain invariants:** risk and fees shown before the toll booth; realigning a goal sends pending money actions back for confirmation; contribution limits checked before commit.
- **Terrain:** signpost (TFSA, FHSA), vista ("you at 30"), bridge (market drops), fork, toll booth, campfire.
- **Status:** the core build. Everything in `idea-breakdown.md` still holds.

### Health pack (Sun Life): the road to care you're already covered for

- **The problem it targets:** people with benefits who never use them. Same avoider, same "I'll deal with it later," different cost.
- **Rome:** one booked appointment the person's plan already covers (counselling, physio, a check-up), with the covered amount and out-of-pocket cost shown.
- **Domain invariants:**
  - `no-diagnosis`: no element may make a clinical claim ("you have anxiety"). The road suggests kinds of care, never conditions.
  - `crisis-exit`: a crisis exit (call or text 988) is visible on every stretch, alongside the normal exit.
  - `no-surprise-cost`: covered amount and out-of-pocket cost are seen before the booking toll booth.
  - `no-silent-booking`: a booking only happens at a clicked toll booth (the universal rule, reused).
- **Terrain:** mostly reused tiles with new labels (signpost "what does my plan cover?", fork "talk to someone / move my body / not sure", vista "covered this year: $X left"), plus a booking toll booth.
- **Data:** a simulated benefits plan (coverage per category, amount used, amount left). No real plan integration.
- **Build cost:** small if the engine is real; this is the proof that it is. If time runs out, fall back to the mood check from the original plan (one tap at the start and end of the finance road).

Evidence for the health pack:

- In an Abacus Data survey for the Canadian Life and Health Insurance Association, 36% of 3,800 people with benefits reported never having used their mental health coverage ([CTV News](https://edmonton.ctvnews.ca/using-up-2022-benefits-can-help-canadians-avoid-bigger-problems-costs-down-the-road-health-care-pros-1.6201233)).
- A Mental Health Commission of Canada study (survey circulated by Sun Life, among others) found only 39% of those with mental health benefits had used them for psychological services in the past year ([MHCC report](https://mentalhealthcommission.ca/wp-content/uploads/2022/05/Extended-Mental-Health-Benefits-in-Canadian-Workplaces-Employee-and-Employer-Perspectives-Research-Report.pdf)).
- Pacific Blue Cross: more than half of B.C. employees with a plan weren't sure whether it covers mental health services ([Benefits Canada](https://www.benefitscanada.com/?p=120646)).
- 2023 Benefits Canada Healthcare Survey: 38% of plan members reported extreme or very high daily stress ([Newswire](https://newswire.ca/news-releases/two-fifths-38-report-extreme-to-very-high-level-of-daily-stress-804082798.html)).
- Confusion, not missing coverage, is often why benefits go unclaimed ([Insurance Business](https://www.insurancebusinessmag.com/ca/news/group-benefits/canadian-women-are-leaving-paidfor-health-benefits-unclaimed-580432.aspx)).

Cautions: these are older surveys (2022–2023) and mostly adults overall, not Gen Z specifically. Say "people with benefits," not "Gen Z," unless you find a Gen Z number. Same rule as before: "linked to," never "causes."

## 4. The pitch, per track

Each judge hears the same engine. What changes is the opening problem, which pack you lead with, and the closing line.

### Overall: "software with no factory"

**Who's judging:** the four criteria (innovation, technical complexity, completeness, design). They want to see something new that works.

**Problem (20 s).** Every app is a factory product: the same screens and rules for a billion people, decided in advance. LLMs could build software per person, but nobody lets an LLM near anything that matters, because you can't trust what it makes.

**Insight (15 s).** You don't have to trust the model. You have to trust the rules. If the LLM can only write in a closed language, and a compiler checks every program against fixed invariants before it runs, then the model can be as creative as it likes and still never break a promise.

**What we built (20 s).** Road Scroll, an engine. You scroll down a road. A fast model reads how you move. The LLM paves the next stretch as a program. The compiler checks it. Forks are pre-paved so nothing waits. When the kit doesn't have the right tile, the LLM invents one, the compiler approves it, and it's yours forever, with undo.

**Demo (90 s).** Two people, two different roads, same destination (finance pack). Brain view shows the compiler rejecting a stretch that hid the risk checkpoint. Then the swap: load the health pack, same engine, and a new road grows with new edges.

**Close (10 s).** "Apps are frozen decisions. This is software that grows around you, inside rules that can't bend. One engine, two worlds, a page of rules each."

**What earns which criterion:**

- Innovation: rules-as-code that grow per user and are checked live. Prior art covers adaptive pacing (Left 4 Dead's AI Director) and grown vocabulary (Infinite Craft); checked, persistent, per-user rules have little.
- Technical complexity: interpreter + static checker + speculative generation + a behaviour model, all live, all visible in the brain view.
- Completeness: one pack done well beats two half-done. Finance first.
- Design: the road, the horse, Hack Western's mountains. No cards, no chat bar.

### Canada Life Future Me: "real steering, not the illusion of it"

**Who's judging:** people who commissioned the doomscrolling research. Their brief: help Gen Z take meaningful action toward their financial future and turn uncertainty into confidence.

**Problem (20 s).** Your research with Deloitte: Gen Z doomscrolls about 74 minutes a day, and each extra hour is linked to a 4.4% lower chance of setting up automatic contributions. You also found what works: small steps and a stronger sense of control, not fear.

**Insight (15 s).** People doomscroll because the feed is the one place that feels like steering. It's an illusion: every option was picked for them. Saving feels like the opposite, someone else's forms. So give them real steering: fewer choices, each one actually theirs.

**What we built (15 s).** A road that ends in an automatic contribution, every time. Rush, skip or wander, you still arrive. Skipped roads become rules you can see and erase. Money only moves when you click.

**Demo (90 s).** Maya, as in `idea-breakdown.md`. Then the judge takes the phone and gets a longer road to the same toll booth.

**The engine line (10 s), say it once:** "Under the road is a compiler holding your rules. That's why it's safe to let an AI build a money experience per person: nothing reaches the screen that hides risk or moves money without a click."

**Close (10 s).** "You told us doomscrolling costs Gen Z their savings. We stopped competing for their attention and built the road that works without it."

Keep the health pack out of this pitch, or mention it in one line at most. Canada Life also sells health benefits, so "the same engine can lead to care you're already covered for" is a fine aside if they ask about scale.

### Sun Life Health: "the road to care you already paid for"

**Who's judging:** a health and benefits company. The brief asks for a creative technical solution to a real health problem, and the pitch must show **who it helps** and **what impact** it could have.

**Problem (20 s).** About a third of Canadians with mental health coverage have never used it. Many aren't sure what their plan covers. The care exists and is paid for; people just never get to it. That's an avoidance problem, not an information problem: another pamphlet won't fix it.

**Who it helps (10 s).** Plan members who are stressed and avoid admin: they won't read the benefits booklet, but they will scroll.

**What we built (15 s).** The same road engine, with a health pack. The road ends at one booked appointment your plan already covers. The compiler enforces health-specific rules: the road never diagnoses, the crisis exit is always visible, and you see your covered amount and out-of-pocket cost before you book.

**Demo (60–90 s).** Stressed user, rushing: the road straightens, skips the long explanations, offers three kinds of care, shows "$400 of counselling covered this year, $0 used," and ends at a booking. Brain view shows the compiler rejecting a stretch where the LLM wrote "sounds like anxiety" (breaks `no-diagnosis`). That rejection is the Sun Life money shot: it shows why an LLM health tool is safe here.

**Impact (15 s).** One booked appointment per avoider, using money already spent on premiums. For a plan sponsor, unused coverage becomes care. For the person, one less thing to dread.

**Close (10 s).** "We didn't build a wellness app you have to open every day. We built a road you only need to travel once."

If the health pack doesn't get built, the fallback pitch is the original one: money stress is a health problem (64% of Gen Z feel financial stress multiple times a week, per TD), and the finance road reduces it by removing surprises and noise, shown with the before/after mood check. It's weaker, so build the pack if the engine allows.

## 5. One demo, three cuts

Build one 3-minute demo and reorder it per room:

| Segment | Overall | Canada Life | Sun Life |
| --- | --- | --- | --- |
| Opening problem | Factory software / can't trust LLMs | Their doomscrolling stat | Unused coverage |
| Main road | Finance, two users | Finance, Maya then judge | Health |
| Compiler rejection shown | Hidden risk checkpoint | Hidden risk checkpoint | Diagnosis claim |
| Pack swap moment | Yes, the climax | Optional, one line | Yes, briefly, finance → health ("same engine") |
| Close | One engine, many roads | Real steering | A road you travel once |

The pack swap is the single moment that proves "engine, not app." Make it live and fast: one click in the brain view, the invariants panel changes, Rome changes, the road starts over with new tiles.

## 6. Watch-outs with the engine framing

- **Don't say "platform," "general-purpose," or "operating system" without showing two packs running.** Judges score what they see. One pack plus a claim reads as scope creep; two packs plus a live swap reads as architecture.
- **Don't lead with the engine for sponsor judges.** Canada Life and Sun Life care about their user and their outcome. The engine is the "why it's safe" line, not the headline.
- **Be precise about the compiler.** It's static checking over a deliberately limited language, not formal proof. "Checked against invariants before it runs" is true; "provably safe" is not.
- **Completeness beats breadth.** If the health pack threatens the finance road's polish, cut the health pack and pitch Sun Life with the mood check.
- **Keep the horse rules-first.** A decision model is nice-to-have; a rules-based horse that works is the demo.

## 7. Lines to reuse

- "Apps are frozen decisions. Road Scroll grows the software around you."
- "You don't have to trust the model. You have to trust the rules."
- "The LLM supplies the freedom. The compiler supplies the trust. The pack supplies the meaning."
- "One engine. Many roads. A page of rules each."
- "Pave your own road. We'll hold the edges."
- "Built to be avoided."
