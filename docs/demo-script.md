# Demo script (90 seconds)

Purpose, said first: **"Uncharted turns the scary headline you just scrolled past into a picture of your own future, and shows you how a small weekly saving keeps the bad versions survivable."**

Demo path: **Prices keep rising → Maya → $25 a week.** It is the clearest honest result (checked Nov 21, seed 42). Every number below comes from the simulator; if someone changes the simulator, re-check them.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Title screen | "Gen Z doomscrolls about 74 minutes a day, and each extra hour makes people less likely to set up automatic savings. The feed shows the worst future every time. We show the real odds, and the one thing you can change." |
| 0:10 | Tap **Prices keep rising** | "This is the 11pm moment: you just saw a headline about grocery prices." |
| 0:15 | Pick **Maya, 23** | "Maya's on contract in Toronto. She has $1,200 saved and puts away nothing a month." |
| 0:20 | Tally | "We run 5,000 five-year futures on her numbers. With nothing set aside, 48% end in a hard stretch. The headline isn't what decides that. Whether she has a cushion does." |
| 0:30 | One future up close (#3472) | "Here's one: four surprise bills and still $400 in debt at the end. Remember this one." |
| 0:38 | Drag the dial from $0 to $25 to $100 | "This is the lesson: $25 a week is $1,300 a year, about two weeks of rent and groceries. Watch the same 5,000 futures move." |
| 0:50 | Scroll the "Where to keep it" cards | "Where it goes: a high-interest savings account or a TFSA. A TFSA isn't locked: she can take money out tax-free if something happens." |
| 1:00 | Pick **$25 a week** | "Gemini writes these options from her real budget, and we check them against what she can actually afford." |
| 1:05 | Plan card: **2,234 more futures end fine** (788 → 3,022) | "Same futures, same luck, one change. #3472 now ends at $6,700." |
| 1:15 | Action card | "And it ends on one action: set up the automatic transfer. Not a chart." |
| 1:25 | Close | "Same thumb, same scroll, a feed that tells the truth and shows you what to do about it." |

## Backup lines
- **"Are the numbers real?"** They're demo defaults, labelled as assumptions on screen ("Show how this was worked out"). The model never invents a number: Gemini only reads text and words the options.
- **"Why not layoffs?"** Try it: a long layoff with no EI is hard in most futures, and $25 a week helps less (5% → 20% fine). We say that honestly. A bigger buffer does more, and the dial shows it.
- **Gemini down or no wifi?** The chips and the whole road work without Gemini (fixed fallbacks). The road server still has to run on the laptop.

## Before the demo
1. `node server/server.mjs` and `npx expo start --lan` in `uncharted-app/`.
2. Run the demo path once on the demo phone.
3. Record a backup video of the full path.
