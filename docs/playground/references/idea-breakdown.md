# Road Scroll — Hack Western 13 Project Guide

Nov 21, 2026 · @Thomson

## What the project is

Road Scroll is a world you scroll through, built by an AI as you move, that always ends in one real financial action: setting up an automatic contribution. Your movement paves the road; rules you wrote while calm hold its edges.

The core insight: people doomscroll because the feed is the one place that feels like steering. But it is an illusion of steering: you choose from options someone else picked, for their benefit. Planning and saving feel like someone else's rules, so people avoid them. Road Scroll gives back real steering: fewer choices, each one actually yours, and the road remembers.

- **No app, no cards, no chat bar.** You scroll down a road through a mountain landscape (the Hack Western look, with a horse as the rider).
- **The road grows from what you do.** Lingering, rushing, skipping and clicking shape what is paved next. Roads you avoid become rules. Signs you click become choices.
- **All roads lead to Rome.** However you travel, the road bends back toward one destination: an automatic contribution. Avoiders get the shortest road. Nobody has to engage; they only have to arrive once.
- **Built to be avoided.** We do not compete with TikTok for attention. We build the road that works without it.

Taglines in play: "Pave your own road. We'll hold the edges." · "Built to be avoided." · "Real steering, not the illusion of it."

The concept merges two inspirations: Spaceship (aggressive speculative generation, so steering feels instant) and Geoffrey Huntley's Jiti (software that grows while running, checked, kept and undoable).

## Core requirements

Six rules are settled. Each one is enforced by the compiler, not just promised.

| Requirement | What it means | Why |
| --- | --- | --- |
| No surprises | Bad news is allowed; surprises are not. Risk, fees and limits are shown before commitment, sized to the user's pace, never removed. A later drop matches what she was told. | Trust. Losing money unexpectedly is the worst outcome. |
| Free goals | A goal can start as a feeling and sharpen into an action. The user can realign at any time. No clear goal means start with cheap exploration. | Avoiders often start with "stop feeling bad about money." |
| Realigning never moves money silently | When the goal changes, pending money actions go back to a toll booth for confirmation. | Money stays under explicit control. |
| 2 to 3 branches per fork, maximum | The exit is always visible and does not count as a branch. | Too many options freeze people. Freedom comes from many small choices. |
| Money only moves at a clicked toll booth | Avoidance shapes what is offered; only a clicked sign decides. | Otherwise the app becomes "the factory" again. |
| No noise | Every element is a choice, a required checkpoint, the goal, or the exit. Nothing else. | Removes engagement bait, and every click becomes clean labelled data. |

Also settled:

- The goal (Rome) is always visible on the horizon and gets closer on any route.
- Rules learned from the user's path are visible in a map legend, and each can be erased.
- Required checkpoints look the same on every road, so they read as landmarks, not obstacles.

## Tech: method and strategy

The stack is five parts in one loop: one compiler, one LLM, one spaceship, one horse, one goal.

&#91;embedded content: the paving loop · 6 steps, 1 rejection loop\]

Every stretch the LLM writes goes through the compiler; a rejected stretch goes back for a rewrite, and only approved road is rendered.

| Part | Role | Speed | Built as |
| --- | --- | --- | --- |
| Horse | Reads movement (scroll speed, pauses, backtracking, cursor drift, clicks) and decides the next step: rushing, lingering, lost or curious | Under 500 ms | Rules first; a decision model (Jev or Gemini Decision) later |
| LLM (the paver) | Writes the next stretch of road as a program in the closed Lisp, using the user's rules and path | Seconds, in the background | Gemini or a fast provider |
| Compiler (the guardrails) | Checks every program against the invariants; rejects or asks for a rewrite | Milliseconds | Small Lisp interpreter and checker hosted in TypeScript |
| Spaceship (the headlights) | Pre-paves 2 to 3 forks just past the visible road; untaken forks are dropped | Continuous | A cache of pre-generated stretches, invalidated on surprise |
| Goal (Rome) | The fixed destination: an automatic contribution set up | Fixed | Simulated account and contribution flow |

**The closed Lisp.** It is written in TypeScript so the UI stays in React. It is closed (no eval, no escape to JS, only primitives the world provides). It always terminates (bounded loops or a step budget). Every primitive declares its effects (`:invest`, `:notify`, `:show-balance`), so worst-case bounds can be computed before anything runs. This is static analysis over a deliberately limited language, not machine-checked proof.

**The invariants.** The core requirements become compiler checks:

```lisp
(invariant fork-arity       (<= (branches fork) 3))
(invariant exit-visible     (has-exit every-stretch))
(invariant disclose-first   (before toll-booth (seen risk-checkpoint fees-checkpoint)))
(invariant no-silent-money  (requires (clicked toll-booth) every-money-effect))
(invariant goal-realign     (on goal-change (revoke-pending money-effects)))
(invariant no-noise         (every element (in-kinds choice checkpoint goal exit)))
```

**The terrain kit grows (the Jiti part).** The world starts with a small set of road elements: signpost, vista, fork, bridge, fog, toll booth, campfire. When none of them fits a user, the LLM invents a new tile. The compiler checks it, and it becomes part of that user's world permanently, reusable with no AI call. Following Jiti, every attempt is checkpointed and can be rolled back.

**The brain view.** A second screen (the laptop) shows the loop live: what the horse read, which forks were pre-paved, what the compiler rejected, and which rule a skip just wrote. This is where the technical complexity becomes visible to judges.

**Fallbacks.** A set of pre-made tiles keeps the road from stalling when the LLM lags or the compiler rejects something.

**Demo surface.** One responsive web app. The phone is the product the judge holds; the laptop is the brain view, synced over one WebSocket.

Open question: how steering works on a scroll (cursor drift, clicking a branch, or lingering).

## Product and UX walkthrough

Scrolling is travelling: the mountain layers move in parallax, the road comes toward you, and the horse rides it.

1. **Arrival.** The user opens the page and is already partway down a road (endowed progress: "you already did step 1 by opening this"). Rome is on the horizon. A one-tap mood check sits at the first fork: "How do you feel about money right now?"
2. **The first stretch.** A short default road. Its first forks are cheap questions in disguise: fast or scenic, fog or signposts.
3. **Moving.** Scroll speed is pace. Stopping is lingering. Scrolling back is looking over your shoulder. Nothing exists ahead until you get near it, but the next forks are already paved, so nothing waits.
4. **The road adapts.** A rusher gets a straight road with one-line signs. A lingerer gets signposts that unfold into detail. Roads the user skips fade and become rules in the map legend.
5. **Checkpoints.** Every road passes the same required landmarks (risk, fees, limits), sized to the user's pace: one plain sentence for a rusher, the full explanation for a lingerer.
6. **The toll booth.** The commitment: account type, amount and frequency for an automatic contribution, shown as a believable setup screen. Money only moves when the user clicks here.
7. **The campfire.** The road ends. The scroll stops. A second mood check. Nothing left to doomscroll.
8. **Coming back.** Rarely, and only when something changed (a raise, new contribution room). The user sees how far the road grew without them, at a glance, then leaves.

| Road element | What it does |
| --- | --- |
| Signpost | A short concept ("TFSA"). Linger and it unfolds. |
| Vista | Your future, e.g. "you at 30," as a landscape that grows as you adjust the amount. |
| Fork | A real choice, 2 to 3 branches, each pre-paved. |
| Bridge | Crosses something scary (risk, market drops) at your pace. |
| Fog | What you have not explored. It clears as you approach. |
| Roundabout | The doomscroll loop: circle as long as you like; the next exit gets shorter. |
| Toll booth | The commitment: setting up the automatic contribution. |
| Campfire | The end of the road. |
| Grown tiles | New elements the LLM invents for this user, approved by the compiler, kept forever. |

## Pitch: the abstract version

Every app you own was built by a factory. Same grid for a billion thumbs, same rules, tuned for whoever profits from your time. The feed feels like freedom, because your thumb decides where to go. But someone else decided what is under it. That is the illusion of steering.

Planning your future feels like the opposite: forms, defaults, someone else's rules. So you go where the wheel at least turns.

Road Scroll is software with no factory. There is no app, only a road, and it does not exist until you move. The way you move paves it. Linger and it opens up. Rush and it straightens. Skip a road and it fades, and your skip becomes a rule. The AI lays the asphalt. A compiler holds the edges, with rules you set yourself. Nothing reaches the road that breaks them.

Everyone's road looks different. Every road ends in the same place: a future you chose.

Pave your own road. We'll hold the edges.

## Pitch: the realistic version, with Maya

**The problem (20 seconds).** Canada Life and Deloitte found Gen Z spends about 74 minutes a day doomscrolling, and each extra hour is linked to a 4.4% lower chance of setting up automatic contributions. Their own research says Gen Z wants small steps and a stronger sense of control, not fear.

**Meet Maya (10 seconds).** Maya is 21, in second year at Western. She has a part-time job and about $300 a month she could save. She signed up for an investing app in first year and opened it three times. Each time she saw red numbers and closed it.

**The walkthrough (2 minutes, live, the judge holds the phone).**

1. Maya opens Road Scroll. She is already partway down a mountain road. Rome sits on the horizon, labelled "your future, on autopilot." One tap: she feels "stressed" about money.
2. She scrolls fast. The horse picks up pace and the road straightens. Signs shrink to one line. On the laptop, the brain view shows: "rushing, paving the short road."
3. She passes a signpost for stocks without slowing. It fades behind her. The legend gains a line: "No individual stocks." She could tap it to erase it.
4. A fork with three branches: TFSA, FHSA, or "not sure." She lingers on TFSA. The sign unfolds into a two-line explanation. The road bends that way.
5. A checkpoint every road passes: "In a bad year, $1,000 could drop to about $800. That's normal." One sentence, because she is rushing.
6. The toll booth: $40 a paycheck into a TFSA. A vista shows "you at 30" growing as she drags the amount. She clicks confirm.
7. The campfire. The road ends. The scroll stops. One tap: now she feels "okay."

**The contrast (30 seconds).** Hand the phone to the judge. They take their time. Their road is longer, with bridges and vistas Maya never saw. It ends at the same toll booth. The brain view shows why the two roads differ, and that the compiler rejected one road the AI tried to pave because it hid the risk checkpoint.

**The close (20 seconds).** "You told us doomscrolling costs Gen Z their savings. We stopped competing for their attention and built the road that works without it. Real steering, not the illusion of it."

The demo's claim: two people with different attention reach the same automatic contribution through visibly different roads, and the brain view shows why.

## Track fit and evidence

Canada Life is the core; Overall comes from build quality; Sun Life gets a slide and the mood check, and is cut first if it costs build time.

| Track | Framing | What it costs to build |
| --- | --- | --- |
| Canada Life Future Me | Real steering, not the illusion of it. The road ends in an automatic contribution, the exact action their research measures. | The core build |
| Overall | A world the AI grows as you move, held in by verified rules from your own choices. | Nothing extra; build quality and the brain view |
| Sun Life Health | Money stress is a health problem. We reduce it by removing surprise and noise and giving back control. | One mood check at the start and end |
| Most Adventurous | "Discover the unknown": a road that does not exist until you explore it. | Nothing extra |

**Evidence to use.**

- Canada Life and Deloitte: Gen Z spends about 74 minutes a day doomscrolling, about 70% more than the rest of the population; each extra hour is associated with a 4.4% lower probability of setting up automatic contributions ([Insurance Business](https://www.insurancebusinessmag.com/ca/news/group-benefits/canada-life-lets-gen-z-save-short-term-while-employer-match-stays-for-retirement-593079.aspx)).
- Canada Life: where Gen Z feels existential dread, they are 16% less likely to own and enrol in longer-term savings and 3% less likely to set up auto contributions ([Benefits and Pensions Monitor](https://www.benefitsandpensionsmonitor.com/pensions/retirement-planning/gen-zs-existential-dread-is-reshaping-workplace-savings-canada-life/394423)).
- Canada Life's own recommendation: clear acknowledgment, practical support, and small achievable steps that give a stronger sense of control ([HR Reporter](https://www.hrreporter.com/opinion/editors-desk/doomscrolling-vs-the-rrsp/395041)). Gen Z responds to agency and perseverance, not fear ([money.ca](https://money.ca/retirement/gen-z-canadians-rrsp-withdrawals-retirement-savings)).
- TD: only 37% of Gen Z feel in control of their finances; 64% feel financial stress multiple times a week ([money.ca](https://money.ca/news/gen-z-feel-pressure-to-fake-financial-stability)).
- A scoping review found consistent associations between doomscrolling and anxiety, depression, stress and reduced resilience, mostly in cross-sectional studies ([Sharpe et al.](https://eprints.chi.ac.uk/8522/1/Scoping%20Review%20Manuscript.docx)).
- Mental Health Research Canada (summer 2026, 4,005 respondents): 46% say the cost of living is hurting their mental health ([Wealth Professional](https://www.wealthprofessional.ca/news/industry-news/cost-of-living-is-driving-a-mental-health-care-crisis-in-canada/393602)).

**Cautions.** Say "linked to," never "causes": almost all of this is correlation. Avoid "decision fatigue" and "ego depletion" (weak replication record) and "choice overload" as a law (inconsistent findings). Avoid "doom" in taglines: Canada Life found Gen Z unreceptive to fearmongering and dystopian framing.

**Prior art to acknowledge.** Left 4 Dead's AI Director (adaptive pacing), Nevermind (biofeedback horror), Infinite Craft (LLM-grown vocabulary, cached forever), experience-driven procedural content generation (Yannakakis and Togelius, 2011). What has little prior art: growing actual rules as code that persists, is checked against fixed invariants, and runs live with undo.

## Appendix: exact turn log from square one

Every turn from "circle back to square one" onward, word for word. Headings inside replies are shown at a smaller level so they don't break this doc's outline; quoted excerpts you attached are shown in quotes before your message.

### Turn 1

**You:** let us circle back to square one; when geoff huntley did his demo, what did he actually show?

**Claude:**

Less than the hype suggests. The blog post and the repo show a **terminal REPL with toy string functions**. There's no app UI and no end-user product. I couldn't watch the 41-second screen recording embedded in the post, so I'm working from the post and the README.

#### What's actually shown

The repo's own description is "Live Common Lisp image repair with OpenAI tools, persistent revisions, and a conversational CLI". It runs in a terminal with a chat mode and a Lisp mode.

The whole demo session is:

```
chat> Add uppercase-string. Return an uppercased copy of the input.
chat> Add reverse-string. Return a reversed copy without modifying the input.
chat> Uppercase "Hello", then reverse the result using those functions.
chat> Save that combination as shout-backwards.
chat> /describe shout-backwards
chat> /execute (shout-backwards "Hello")
```

The result is plain Lisp: `(defun shout-backwards (text) (reverse-string (uppercase-string text)))`. That's the "growing": you ask for functions in chat, they become real code in a running program, you combine them, and the combinations become new vocabulary.

#### What's actually interesting is the machinery underneath, not the demo

- **Develop vs. execute.** One tool changes the program and one tool just uses it, so the model always knows whether it's editing or running.
- **Checkpoint before every attempt.** Every development or execution attempt takes a checkpoint before reading, compiling, or evaluating. A failed or signalled safety invariant rejects the attempt and restores its checkpoint.
- **Preview mode.** You can try something, see the result, and have the state rolled back automatically.
- **Revisions and rollback.** Accepted changes become versions, and `/rollback` publishes an earlier state as a new revision, so the intervening history is kept.
- **Fixing a crash while it's still happening.** This is the Lisp-specific part. When code throws an error, the program pauses instead of crashing. The model can then write a fix and resume that same paused call, without restarting anything.

#### What this means for us at square one

What Huntley showed is explicit, developer-facing growth: someone asks, and the program gains a capability while it's running, safely, with undo. It isn't growth driven by watching behaviour, and it isn't real-time. The attention-adaptive card feed we've been designing has drifted a long way from Jiti. It borrows the word "growing," but none of the mechanism.

If you want to keep what's actually impressive about Jiti, the moment to show judges would be something like: **the app hits something it can't do, grows that ability while running (nothing reloads), checks it against its safety rules, and can be rolled back.** That's a different product from the one we've been designing.

So the root question is: is the core of your idea Huntley's mechanism (live, safe, undoable self-modification), or the experience we drifted into (an interface that adapts to your attention)? They can coexist, but one has to be the main idea and the other has to support it. Which one got you excited in the first place?

### Turn 2

**You:** has someone done something adjacent to this before: procedurally generated game loop based on what the user does?

**Claude:**

Yes, a lot. Games have been doing "adapt to what the player does" for almost 20 years. What's still largely unsolved is a game that grows its own *rules*, as opposed to its content or difficulty. Roughly in order of how close each is to your idea:

#### Adapting pacing and difficulty (closest to the control loop we sketched)

- **Left 4 Dead's "AI Director" (2008).** This is the famous one. It estimates each player's stress from damage taken, nearby enemies and so on, and adjusts what spawns to run cycles of build-up, peak and relief. It's essentially the three-speed attention loop we designed, applied to a zombie game. "An AI Director for your attention" is a ready-made way to describe your idea.
- **Resident Evil 4's hidden difficulty.** It quietly adjusts enemy aggression based on how well you're doing.

#### Adapting to your body (closest to the camera and stress idea)

- **Nevermind (2015).** A horror game that reads your heart rate or webcam emotion. The more scared you get, the harder it becomes, so the game is really about learning to stay calm. It's direct prior art for anything biometric. Cite it rather than claiming the idea is new.

#### Building a model of the player that shapes the world

- **Silent Hill: Shattered Memories (2009).** It builds a psychological profile from your choices and where you look, then changes characters and scenes to match.
- **Shadow of Mordor's Nemesis system (2014).** Enemies remember how they fought you and evolve.
- **Academic research.** "Experience-driven procedural content generation" (Yannakakis and Togelius, 2011) formalized exactly this: model the player's experience, then generate content to steer it.

#### LLM-era projects

- **Infinite Craft (Neal Agarwal, 2024).** This is the closest to Jiti. You combine two elements, an LLM invents the result once, and it's cached forever, so the game's vocabulary grows through play. It's Huntley's "combine and save as new function" pattern as a toy.
- **AI Dungeon (2019).** Open-ended LLM storytelling that follows whatever the player does.
- **Neural game engines** (Google's GameNGen running Doom, Oasis for Minecraft, DeepMind's Genie). These generate the game's frames in real time from your inputs. Impressive, but there are no persistent rules underneath, so things drift.

#### The open problem

A July 2026 survey of AI-native games names it directly: the open question is how generative AI can move beyond content generation and become part of reliable, compelling game mechanics. It also describes how successful designs rely on "mechanical invariants." These are the parts of the game that do not change, even if the AI's response varies. That's very close to your closed, verifiable Lisp idea: the AI is allowed to grow things, but only within rules that are guaranteed to hold.

So, comparing to your idea:

- **Adapting pacing to the player** is well-trodden (L4D's Director, Nevermind).
- **Growing vocabulary by combining things** has been done as a toy (Infinite Craft).
- **Growing actual mechanics as code that persists and is checked against fixed rules, while running and with undo** (Jiti's machinery applied to a game loop) is the part with little prior art. If anything here is novel, it's that.

### Turn 3

**You:** going to throw words at u. Respond OK.

**Claude:** OK.

### Turn 4

**You:** a long winding road of decisions. Going down the road, check cues, generate new things, spaceship style. Practicality:  not very. Flashiness: high.

(do not respond OK). throw some words back at me

**Claude:**

Fog of war. Road paved six feet ahead of your headlights. Forks already rendered before you reach them, and the road you didn't take crumbles behind you. Guardrails, as literal guardrails. Signposts that rewrite themselves as you approach.

Temple Run meets Infinite Craft. A choose-your-own-adventure with a gas pedal. The road only exists where you're looking. Hesitate and the road slows down; rush and it straightens. Detours. Roundabouts as doomscroll loops you keep circling. An exit ramp. Toll booths as commitments. Mile markers counting age 21, 25, 30.

Road tiles that never existed until you needed one, then exist forever. A map you draw by driving. The roads you've grown, retraced as a constellation. The rear-view mirror as rollback. A dashboard as the brain view. A night drive as calm mode. Rumble strips as gentle nudges. A destination of "future you," always just over the hill.

Practicality is low, flashiness is high, so the risk is a screensaver. Speculative paving is the Spaceship part, new tile types are the Jiti part, guardrails are the checker.

### Turn 5

**You:** (quoting: "Guardrails, as literal guardrails. Signposts that rewrite themselves as you approach.") guardrails make u not fall off the road. But the road is paved as u go. up to u.

**Claude:**

Then the guardrails don't choose the road. They just go wherever you pave.

You steer, the road appears, and the rails come with it. Pave toward the cliff and the rail bends you back, gently, without stopping you. No rail ever says "turn left." Each one only says "not over the edge."

So there's no map and no destination you were assigned, only edges you agreed to earlier when you were calm. You drive freely inside promises you made to yourself.

Your swerves pave the road. The checker drops in a rail only where the road meets the drop. The AI lays down the asphalt; you hold the wheel.

A tagline, maybe: "Pave your own road. We'll hold the edges."

### Turn 6

**You:** why app? why uniformity? embrace chaos. exploration. freedom.

**Claude:**

Then there's no app, just terrain. No screens, only places. No navigation bar, only a horizon. No two people's roads look alike. Yours winds and mine is a straight line through fog, and someone else's is a spiral staircase. No uniform design system, just a world that has grown around how you move.

It doesn't need an onboarding flow; you're dropped somewhere and you start walking. No feature list either. Features are places you haven't been yet. Things grow where you linger, the path behind you fades out, and nothing is pre-built beyond your next step.

Everything can be chaos except the edges. The rules stay fixed and the surface is free to change.

One push back, so it doesn't turn into noise: chaos needs a single constant for anyone watching to follow. A judge has 3 minutes and needs one anchor, whether that's the road, the traveller or the destination over the hill. Let everything else be wild, but keep that one thing still.

### Turn 7

**You:** then we have a starting point. One compiler. One LLM. One spaceship, one horse, one goal.

**Claude:**

Here's how I'd map each "one."

**One compiler for the edges.** Your closed Lisp and its checker. Nothing grows that it hasn't verified, and nothing verified ever falls off the road.

**One LLM to pave.** It's slow, deliberate and creative. It lays road ahead and invents new tiles the world has never had, and every tile passes through the compiler before it touches the ground.

**One spaceship for the headlights.** Speculative paving: the forks ahead are already rendered, and the ones you don't take dissolve behind you. That's what makes slow paving feel instant.

**One horse for instinct.** This is the decision model, the fast part that reacts in milliseconds: it shies at hesitation and speeds up on confidence. It doesn't think, it feels the ground. The LLM is the rider planning the route, and the horse decides the next step.

**One goal, over the hill.** For Canada Life, that's the future you, reached through the automatic contribution. For the world itself, it's wherever you were going without knowing it.

That's five parts with one loop through them, and it's already a buildable stack. The one open question I'd put to you: is the horse the decision model, or is it the person?

### Turn 8

**You:** rules dictate familiarity. rules make people comfortable. Which is why apps are solid. they have rules. but apps do not fit the user. apps are manufactured by big tech to control you.

**Claude:**

Rules aren't the problem; the question is who wrote them.

An app's rules come from the factory: the same grid for a billion thumbs, tuned for whoever profits from your time. Familiar, comfortable, and pointed at someone else's goal.

Flip the authorship. The rules come from you, written when you're calm: "never more than once a week," "never a red number by surprise," "the feed ends." Those stay fixed and familiar, and they're yours. Everything above them is free to grow, bend and get weird. You keep the comfort and lose the leash.

That's the split: rules from the user, terrain from the machine. The compiler enforces your rules, not theirs.

To be fair to apps, though: uniformity isn't only control. Shared conventions are why your grandmother can find the back button, why a screen reader works, and why nobody has to relearn "save." A familiar layout is partly a commons, not just a cage. So the target is to keep the parts of convention that help everyone (back, undo, consent, accessibility) and drop the parts that serve the factory (infinite scroll, streaks, red badges).

Your rules are the guardrails and everything else is open road. "Software that obeys you, not the factory."

### Turn 9

**You:** who wrote the rule? Who decided how my life should act? Which is why I doomscroll; I decide where the app goes.

**Claude:**

You decide where the thumb goes. Who decided what's under it?

A feed feels like freedom, with infinite choice and endless next. But every option was chosen for you before your thumb moved. You're steering a car on rails someone else laid. Swiping is steering without authorship: you choose from a menu you didn't write.

That might be the real insight, and maybe your pitch: **people doomscroll because it's the one place that feels like steering.** Planning, saving and investing all feel like someone else's rules (forms, defaults, "experts"), so you go where the wheel at least turns.

So don't take the wheel away; make it real. Fewer choices, but each one actually paves road. The feed offers a thousand options and none of them are yours; your road might offer three forks, all of them yours, and the road remembers.

The doomscroll is the illusion of steering. The road is actual steering.

Canada Life's stat says each additional hour of doomscrolling is associated with fewer automatic contributions. Maybe that's not a willpower problem. Maybe saving just never felt like your road.

### Turn 10

**You:** we getting somewhere. road scroll. scroll cool. scroll good. theme clear: hackwestern website like theme, big on horse. no "cards", no "apps". Rules for the LLM -> compiler -> generate UI, grab components, grab data -> render things the user wants to see. The user's input controls the road they pave.

**Claude:**

Now it has a look. The site already has the pieces: layered mountain hero images (`mountain-1` through `mountain-4`), a deep teal theme colour (`#1b4960`), trees, and taglines like "Discover the unknown", "Build something unexpected" and "A world of exploration". There's no horse on the site, but Western's mascot is the Mustang, so the horse is very much on theme.

#### Road scroll

Scrolling is travelling. The mountain layers move in parallax, the road comes toward you, and the horse rides it. Scroll speed is your pace. Stopping is lingering. Scrolling back up is looking back over your shoulder. Nothing exists ahead until you get near it.

#### The pipeline, your version

```
Your movement (scroll speed, pauses, backtracking, cursor drift, clicks)
      │
      ▼
 HORSE: fast instinct (decision model, under 500 ms)
   "rushing / lingering / lost / curious" → which fork to pave next
      │
      ▼
 LLM: the paver. Writes the next stretch of road as a program in your closed Lisp,
   using your rules and the path so far
      │
      ▼
 COMPILER: the guardrails. Checks the program against your rules, rejects it or
   asks for a rewrite, never lets the road leave the edges
      │
      ▼
 RESOLVE: grab components (from the terrain kit) + data (simulated accounts, rates)
      │
      ▼
 RENDER: the next stretch appears ahead of you. Two or three forks are already
   paved just past the visible road (the Spaceship part); the forks you don't take
   dissolve behind you.
```

#### You still need building blocks, they're just terrain instead of cards

This is your UX designer's palette:

| Road element | What it does |
| --- | --- |
| **Signpost** | A short concept ("TFSA →"). Linger and it unfolds. |
| **Vista / lookout** | Your future, e.g. "you at 30" as a landscape that grows as you adjust the amount. |
| **Fork** | A real choice, like which account. Each branch is pre-paved. |
| **Bridge** | Gets you across something scary (risk, market drops) with an explanation that matches your pace. |
| **Fog** | What you haven't explored yet. It clears as you approach. |
| **Toll booth / waystation** | The commitment: setting up the automatic contribution. |
| **Campfire** | The end. The road stops and the scroll ends, so there's nothing left to doomscroll. |
| **New, grown tiles** | Things the LLM invents for you that the compiler approves, which then become part of your world permanently. |

That last row is the Jiti part: the terrain kit itself grows.

#### The one thing still unresolved

**How do you steer on a scroll?** Scrolling only goes forward and back. Choosing a fork needs a second input. Options:

- **Cursor drift:** the side of the screen you lean toward is where the road bends.
- **Clicking a branch.**
- **Lingering:** whatever you pause on, the road bends toward it.

Lingering is the purest fit for "your movement paves the road." Cursor drift is the flashiest. Whichever you pick decides what the horse has to read, so it's the next decision to make.

### Turn 11

**You:** terrain kit grows, new roads open, new things found, discovered, new actions done. Cool concept, cool game. techy enough to work for the spon track. What else needed? "I am canada life user. I don't like using the app. I want to doomscroll. I do not want to engage with your app. I scroll down the other road. I just don't use that road. The road becomes a rule. for the agent to work with for your investments. Road signs u click on become a choice. Your choice of the road leads back to islands. All loads lead to Rome."

**Claude:**

You just described the core mechanic: **avoidance is data.** The road you don't take says as much as the one you do.

Playing it back:

- **Skipping a road writes a rule.** Never going near "stocks" becomes "keep it simple, no picking individual stocks." Rushing past every chart becomes "show me outcomes, not graphs."
- **Clicking a sign is a choice.** It's explicit, and it's yours.
- **The agent works with both.** In the background, it builds your plan from the rules your path wrote.
- **All roads lead to Rome.** However you wander, the road bends back toward the one destination. Rush, skip or wander, and you still arrive. The world is shaped by you; where it ends up isn't up for negotiation.

That last point is a strong pitch for Canada Life: you don't need users to engage, you need them to arrive. A doomscroller who skips everything still reaches Rome by the shortest road.

#### What's still needed

**1. A hard line between rules and money.** Avoidance can shape the road, but it can't move money. If skipping "risk" quietly decided an investment, that's the factory deciding again. So the compiler enforces one rule that never changes: **money only moves at a toll booth you clicked.** The road you skipped can only shape what's offered; the sign you clicked decides. This is also your strongest answer when a Canada Life judge asks whether it's safe.

**2. A visible legend.** Rules written from your path have to be visible. Show a map legend like "Learned from your road: no individual stocks · outcomes over charts · short stops." Tap a line and you can erase it. Without that, "the road becomes a rule" reads as surveillance. With it, it reads as authorship.

**3. The doomscroll road, literally.** You can't watch TikTok, but the world can have its own loop: a roundabout with endless signs that you can circle as long as you want. The world doesn't punish it; it just notices, and the next exit gets shorter. You're not fighting the doomscroll, you're giving it an exit ramp.

**4. Defining Rome.** For the demo, it has to be one concrete thing. I'd say it's an automatic contribution set up: account, amount and frequency, which comes straight from Canada Life's own statistic.

**5. The first road.** With zero history, the agent knows nothing. The first stretch needs to be a short default road whose first forks are cheap questions in disguise (fast or scenic? fog or signposts?).

**6. The brain view.** The live "why" panel on the laptop: what the horse read, which forks were pre-paved, what the compiler rejected, and which rule your skip just wrote. That's what earns the technical-complexity points.

**7. Fallbacks for slow paving.** When the LLM lags or the compiler rejects something, the road can't just end. Keep a set of pre-made tiles, so the world never stalls in front of a judge.

#### One question

**What are the islands?** I can read them three ways:

- **Goals** (emergency fund, first home, travel), each its own island your road leads you to, all of them on the way to Rome.
- **Account types** (TFSA, FHSA, RRSP) as places you can visit.
- **Places to rest**, where you stop, get your bearings, and the world takes stock of your path.

Which did you mean? It decides what the forks along the road are actually choosing between.

### Turn 12

**You:** (quoting: "That last point is a strong pitch for Canada Life: you don't need users to engage, you need them to arrive. A doomscroller who skips everything still reaches Rome by the shortest road.") if people will avoid ur app no matter what u did, dont fight it. Embrace it?

**Claude:**

Yes. And it's not even a radical idea, because automatic contributions already work this way. They exist for people who won't show up. The best-known finding in behavioural economics on saving is that switching retirement plans from opt-in to automatic enrolment dramatically raises participation. People don't get more disciplined; the system just stops needing them to show up.

So don't build an app people should use. Build one they only need to get through once.

**What "embrace avoidance" means in the design:**

- **One trip to Rome.** The shortest road (rush, skip everything) still reaches the toll booth in about a minute. Avoiders get the express lane.
- **Absence is a signal too.** Time away isn't failure. While you're gone, the world keeps growing: fog thickens over roads you'll never take, and the automatic contribution keeps paving your future on the vista.
- **Returns are rare, short and earned.** The world only calls you back when something actually changed, like a raise or new contribution room. No streaks, no guilt, no red badges.
- **Coming back is a look at the view, not a chore.** Open it after three months and you see how far your road has grown without you, at a glance, and then you leave.

**A tension to name rather than hide:** a sponsor might hear "built to be avoided" and think "less app usage." But look at what their stat actually measures: setting up automatic contributions, not time spent in the app. Embracing avoidance aligns with their real metric better than engagement does. Say it out loud in the pitch: *"You told us doomscrolling costs Gen Z their savings. We stopped competing for their attention, and built the road that works without it."*

The one limit: embracing avoidance doesn't mean embracing never arriving. Someone has to reach the toll booth once, or nothing happens. So everything gets designed backwards from that single visit: the road can be as short as needed, but it has to end in Rome.

Tagline candidates:

- **Built to be avoided.**
- **One road. Once. Then live your life.**

### Turn 13

**You:** now investment app strategy for pitch almost solid. Health - not needed, maybe stats make argument stronger? "Healthy doomscrolling" --> doomscrolling --> mental health problem? Find sources?

**Claude:**

Yes, the evidence connects doomscrolling, mental health and saving. But the best finding isn't about mental health, it's from Canada Life's own research, and it backs up your "real steering" insight almost word for word. I'd use these stats to strengthen the Canada Life pitch rather than to chase Sun Life.

#### 1. Canada Life's own research (lead with this)

This is research Canada Life did with Deloitte Canada:

- **The numbers.** Gen Z spends about 74 minutes a day doomscrolling, roughly 70% more than the rest of the population, and each extra hour is associated with a 4.4% lower probability of setting up automatic contributions toward long-term savings.
- **Fear is the driver, not just cost of living.** Coverage of the research says the cause runs deeper than housing costs or debt - it is fear of the future itself. Where people feel that existential dread, they're 16 per cent less likely to own and enroll in longer-term savings and 3 per cent less likely to set up auto contributions.
- **What works, in their words:** "They want clear, honest acknowledgment of their reality, practical support and small, achievable steps that help them feel a stronger sense of control." They also found Gen Z best responds to messages about perseverance and agency rather than fear.

That last point is your pitch. "A stronger sense of control" is exactly what "steering versus the illusion of steering" means. Quote it back to the sponsor judges.

#### 2. Doomscrolling and mental health

- A scoping review found that across predominantly cross-sectional studies, consistent associations were found with anxiety, depression, stress, and reduced resilience.
- A study in the US and Iran found doomscrolling predicted higher levels of existential anxiety (though the association was moderate, rather than strong). That's the same "existential dread" Canada Life measured.

#### 3. Financial stress and mental health in Canada

- A TD survey found only 37% of Gen Z report feeling in control of their finances, and 64% say they experience financial stress multiple times a week — a higher rate than any other generation surveyed.
- Mental Health Research Canada polled 4,005 people this summer and found 46 per cent of people in Canada say the cost of living is hurting their mental health.

#### How to use this

The causal chain for the pitch: **doomscrolling → existential dread → no sense of control → no automatic contributions.** Your product breaks the chain at "control." Three slides' worth: their stat, their own recommendation (agency, small steps, control), and your road.

Two cautions:

- **Don't overclaim.** Almost all of this is correlation, not proof that doomscrolling causes the harm. Say "linked to" or "associated with," never "causes." A Deloitte-literate judge will notice.
- **Rethink "healthy doomscrolling."** The phrase contradicts itself, and Canada Life found Gen Zs were generally unreceptive to headlines relying on fearmongering, dystopian framing. "Doom" in your tagline works against their own findings. Frame it around agency instead, something like "scroll with direction" or "your road, your rules."

On Sun Life: the mental-health chain is real, but your product isn't a health intervention. I'd mention it in one line of the pitch ("money stress is a health problem; 64% feel it weekly") rather than build anything health-specific. If you submit to that track too, it's a free extra entry, not something to design for.

### Turn 14

**You:** (quoting: "steering versus the illusion of steering" means.) hi this is a new guy at the keyboard, explain the concept in ASD-STE-100, Maya is steering vs Maya is under the illusion of steering (illusion is what we do, our solution)?

**Claude:**

A correction first: in the earlier explanation, the illusion belongs to the feed, not to our product. Our product is meant to give real control. There is one risk, though, and it's in the last section.

Here's the concept in ASD-STE-100 style.

#### 1. Maya and the feed: the illusion of steering

1. Maya moves her thumb.
2. The feed shows a new video.
3. Maya thinks that she controls the feed.
4. But the app selected all of the videos before Maya moved her thumb.
5. Maya can only select from a list that the app made.
6. The app uses her choices to keep her in the app for a longer time.
7. The app does not use her choices to help her goals.

**Result:** Maya feels control, but she does not have control. This is the illusion of steering.

#### 2. Maya and the road: real steering

1. Maya moves along the road.
2. Each choice that Maya makes changes the road ahead.
3. When Maya does not use a road, that road becomes a rule. Example: Maya does not go to "stocks," so the rule is "no individual stocks."
4. Each rule shows on the map. Maya can delete each rule.
5. Money moves only when Maya clicks a sign.

**Result:** Maya controls the path, the rules and the money. This is real steering.

#### 3. Comparison

| Item | Feed | Road |
| --- | --- | --- |
| Who makes the options? | The app | Maya's choices |
| Who gets the benefit? | The app | Maya |
| Can Maya see the rules? | No | Yes |
| Can Maya change the rules? | No | Yes |
| Does it stop? | No | Yes, at the goal |

#### 4. Warning: risk of an illusion in our product

All roads go to one goal: automatic contributions. If we hide this goal, our product also gives an illusion of steering. To prevent this:

1. Show the goal to Maya at the start.
2. Let Maya accept the goal or change it.
3. Let Maya leave the road at any time.

**Note:** If you do these three steps, Maya steers the route and also agrees to the goal. Then the steering is real.

### Turn 15

**You:** (quoting: "Show the goal to Maya at the start.") hi, dumbo back. show goal make Maya know, "I can take the path I want without the unpleasant stuff, but still get to a result I want and I desired when I started to work towards to". Apply product design and UI/UX theory (idk) and tell me if this is me yapping BS?

**Claude:**

It's not BS. What you described matches a few well-established design principles. Your wording has one hole in it, though.

#### Why it holds up

- **Equifinality** (a systems-theory term): many paths, one end state. Your "all roads lead to Rome" has a real name, and it's a legitimate design pattern.
- **Self-determination theory** (Deci and Ryan): people stick with things when they feel *autonomy* (I chose this) and *competence* (I can do this). A free path gives autonomy, and a guaranteed arrival gives competence. That's also basically Canada Life's own finding: small, achievable steps and a sense of control.
- **The goal-gradient effect** (Kivetz and colleagues, 2006): people speed up as a goal gets visibly closer, as in the coffee-card studies. A destination always visible on the horizon, getting nearer, uses this directly.
- **The endowed-progress effect** (Nunes and Drèze, 2006): a loyalty card that starts with 2 of 10 stamps already filled gets completed more often than one with 0 of 8, even though both need eight stamps. Start Maya partway down the road: "You already did step 1 by opening this."
- **Nudge-style choice architecture** (Thaler and Sunstein): a set destination with freedom along the way is "guide, but keep choice." It's ethical when it's transparent and you can leave, which we already covered.

#### Where it is BS: "without the unpleasant stuff"

Some unpleasant stuff can't be skipped:

- **Risk.** "You can lose money" can't disappear because Maya avoided the risk road.
- **Hard limits.** TFSA over-contribution has a real penalty, 1% a month on the excess.
- **Fees and what she's agreeing to.**

If skipping deletes those, you've built the factory again, just a friendlier one. The fix fits your system neatly: **unpleasant things can get smaller, slower or friendlier, but they can't disappear.** The compiler enforces required stops, maybe two or three checkpoints that every route passes through, sized to the user's pace. A rusher gets one plain sentence about risk. Someone lingering gets the full explanation. Nobody gets zero.

The honest version of your sentence: *"I can take the path I want, and the hard parts come in a size I can handle, and I still reach the result I wanted."*

#### Smaller risks

- **Maya might not have a goal at the start.** Avoiders often don't. "Desired when I started" may really be "stop feeling bad about money." Let the goal start fuzzy (a feeling) and get sharper along the road into an action, like "$40 a paycheck into a TFSA."
- **Too many forks.** Give Maya a lot of freedom and she freezes. Keep every fork to two or three branches. The freedom comes from many small choices over the trip, not one giant menu.

#### UI decisions this gives you

1. Rome is always visible on the horizon and visibly gets closer, whatever route she takes.
2. Progress shows distance left, not steps completed, since routes differ in length.
3. The road starts partway along.
4. The required checkpoints look the same on every road, so they read as landmarks, not obstacles.
5. Exits are always visible, which is what keeps it honest.

### Turn 16

**You:** (quoting the "Some unpleasant stuff can't be skipped" list and the "Maya might not have a goal" / "Too many forks" bullets) core requirement found: never hide unpleasant, so never show unexpected shit, never show "ooops, lost all ur money boo boo".

another core requirement: 1) make goals free, allow re-alignment, if user goal not clear, start with cheap exploration. 2) Avoid big fork fork, 2-3 is MAX. Confirm?

**Claude:**

Confirmed, with small refinements so each one is precise enough for your compiler to check.

**Requirement A: no surprises.** Refine "never show unexpected stuff" to: **bad news is allowed, surprises are not.** Losses can happen, and the app can't promise they won't. What it can promise is that nothing happens that Maya wasn't told about first, at her pace.

- Before the toll booth, show the bad case in plain terms. For example: "In a bad year, $1,000 could drop to about $800. That's normal, and it usually recovers over years." Check with an advisor-type mentor before quoting real percentages in the demo.
- When a drop happens later, it matches what she was told. That turns "oops, you lost all your money" into "this is the bad year we talked about."
- Her balance is never hidden, only not pushed at her. She can always look; the app just never flashes red numbers at her unprompted.

**Requirement B: free goals.**

- A goal can start as a feeling and get sharper over time.
- Maya can realign it at any time.
- With no clear goal, start with cheap exploration.

One addition: realigning never silently changes money. If the goal changes, the road and the rules can update freely, but any automatic contribution tied to the old goal comes back to a toll booth for her to confirm.

**Requirement C: no more than 3 branches per fork.** One clarification: the exit ("not now" or "leave") doesn't count as a branch. It's always visible on top of the 2–3 options.

**These all become compiler checks**, which turns them from good intentions into real guardrails:

```lisp
(invariant fork-arity       (<= (branches fork) 3))
(invariant exit-visible     (has-exit every-stretch))
(invariant disclose-first   (before toll-booth (seen risk-checkpoint fees-checkpoint)))
(invariant no-silent-money  (requires (clicked toll-booth) every-money-effect))
(invariant goal-realign     (on goal-change (revoke-pending money-effects)))
```

If the AI paves a road that breaks any of these, the compiler rejects it. That's a five-line demo of "the rules are real."

### Turn 17

**You:** this good start. I have a good idea. But I greedy, I want 3 tracks: Sun Life weakest link. Mental health --> slightly relevant? but main goal is optimizing around interaction, freedom, per person choices,  LLM based freedom and choices - every single UI action is a choice, so take away noise, and optimize around that?

**Claude:**

Greedy is fine as long as it costs nothing extra to build. Your "every UI action is a choice" principle is what makes three tracks work: one rule serves all three, with different framing for each.

#### The principle, made exact

Everything on screen must be one of four things:

1. **A choice:** a fork or a sign, 2–3 branches at most.
2. **A required checkpoint:** risk, fees, limits.
3. **The goal:** Rome on the horizon.
4. **The exit.**

Anything else is noise and gets removed. That's one more compiler check, `(invariant no-noise (every element (in-kinds choice checkpoint goal exit)))`. So "no engagement bait" isn't a promise anymore; it's enforced.

There's also a bonus your ML person will like: if every action is a choice, every action is clean, labelled data. The horse never has to guess what a click meant, because there are no meaningless clicks.

#### How each track hears the same product

| Track | Framing |
| --- | --- |
| **Canada Life** | "Real steering, not the illusion of it." Their own research says Gen Z wants control and small steps. The road ends in an automatic contribution. |
| **Overall** | A world the AI grows as you move, held in by verified rules from your own choices. That's your technical complexity and novelty. |
| **Sun Life** | "Money stress is a health problem. We reduce it by removing surprise and noise, and giving back control." |

#### Sun Life, honestly

The defensible claim is about **financial stress**, not doomscrolling. The 64% of Gen Z with weekly financial stress is your number. The product targets the causes people report (feeling out of control, nasty surprises, overwhelm) rather than claiming to treat anything.

Don't lean on these, because a sharp judge may know they're shaky:

- **"Decision fatigue" or "ego depletion":** large replication attempts largely failed to reproduce the ego-depletion effect.
- **"Choice overload" as a general law:** meta-analyses find the effect is inconsistent and depends on context. Say "fewer, clearer choices" as a design value, not as proven science.

Safer ground is **cognitive load** (well supported in learning research) and the financial-stress data.

#### The one cheap addition: a mood check

Your Sun Life pitch needs to "show who it helps and what impact it could have." Add one tap at the start of the road and one at the campfire: "How do you feel about money right now?" on a three-option scale (it's a fork, so it counts as a choice, not noise). In the demo, show the judge's own before and after. That's anecdotal, not evidence, so say so, but it makes the impact visible in about 20 seconds without building any health feature.

So: Canada Life is the core, Overall comes from the build quality, and Sun Life gets a slide plus the mood check. If the mood check ever starts eating build time, cut it first.
