// Finance pack (Canada Life): the road to an automatic contribution.
import type { Ctx, Fact, Need, Pack } from "../types";
import { factFiller, fallbackStretch, forkNeed, lead, seenFor } from "./common";

const ACCOUNTS = ["tfsa", "fhsa"];
const ROOM: Record<string, number> = { tfsa: 7000, fhsa: 8000 }; // simulated profile
const SPARE = 300; // simulated: $300 a month spare
const SIM = "Simulated profile for the demo";

function facts(ctx: Ctx): Record<string, Fact> {
  const acct = ctx.choices.account;
  const room = acct && ROOM[acct] ? ROOM[acct] : null;
  return {
    "auto-contrib": { short: "Automatic means you decide once.", long: "An automatic contribution moves the same amount on a schedule you pick. You can pause or change it later.", topic: "automation", source: "Product behaviour" },
    "tfsa-basics": { short: "TFSA: growth is not taxed.", long: "In a Tax-Free Savings Account, investment growth is not taxed, and withdrawals are not taxed. Unused room carries forward.", topic: "tfsa", source: "Canada Revenue Agency: TFSA" },
    "fhsa-basics": { short: "FHSA: saving for a first home.", long: "A First Home Savings Account is for a first home. Contributions are tax-deductible, and qualifying withdrawals for a first home are not taxed.", topic: "fhsa", source: "Canada Revenue Agency: FHSA" },
    compounding: { short: "Small amounts grow over time.", long: "Growth earns growth. Starting small and early often matters more than the amount.", topic: "compounding", source: "General principle" },
    "stocks-basics": { short: "A stock is a small piece of a company.", long: "Buying a stock means owning a small piece of one company. Its price follows how people value that company.", topic: "stocks", source: "General principle" },
    "stocks-swings": { short: "Single stocks can swing a lot.", long: "One company's stock can rise or fall far more than the market as a whole.", topic: "stocks", source: "General principle" },
    "index-funds": { short: "Index funds hold many companies.", long: "An index fund spreads money across many companies, so one company matters less.", topic: "funds", source: "General principle" },
    "crypto-basics": { short: "Crypto prices move fast.", long: "Crypto assets can gain or lose a large part of their value in days.", topic: "crypto", source: "General principle" },
    "market-drops": { short: "Markets drop sometimes. Then they move on.", long: "Drops are part of investing. A plan you set once keeps going through them.", topic: "risk", source: "General principle" },
    "you-at-30": { short: "You at 30.", long: "The amount you choose at the toll booth shows here as a picture of you at 30.", topic: "saving", source: "Product behaviour" },
    risk: { short: "In a bad year, $1,000 can drop to about $800.", long: "In a bad year, $1,000 in a broad index fund can drop to about $800. That is normal, and it has recovered before, but it can happen again.", topic: "risk", source: "Illustrative example" },
    fees: { short: "Fees: $2.50 a year per $1,000.", long: "This simulated account charges 0.25% a year: $2.50 for every $1,000 invested. No fee to start or stop.", topic: "risk", source: SIM },
    limits: {
      short: room ? `${acct!.toUpperCase()} room: $${room.toLocaleString("en-CA")} this year.` : "Pick an account to see your room.",
      long: room ? `This simulated profile has $${room.toLocaleString("en-CA")} of ${acct!.toUpperCase()} room this year. Going over has a penalty, so the toll booth will not let you.` : "Pick an account to see your room.",
      topic: "risk",
      source: SIM,
    },
  };
}

const FILLER = [
  { src: "(signpost stocks-basics)", fact: "stocks-basics" },
  { src: "(signpost compounding)", fact: "compounding" },
  { src: "(signpost stocks-swings)", fact: "stocks-swings" },
  { src: "(bridge market-drops)", fact: "market-drops" },
  { src: "(vista you-at-30)", fact: "you-at-30" },
  { src: "(signpost index-funds)", fact: "index-funds" },
  { src: "(signpost crypto-basics)", fact: "crypto-basics" },
];

function requirements(ctx: Ctx): Need[] {
  const n: Need[] = [];
  if (forkNeed(ctx, "account", ACCOUNTS)) n.push({ id: "fork:account", tiles: 2 });
  if (!ctx.seen.includes("risk")) n.push({ id: "checkpoint:risk", tiles: 1 });
  if (!ctx.seen.includes("fees")) n.push({ id: "checkpoint:fees", tiles: 1 });
  if (!seenFor(ctx, "limits", "account")) n.push({ id: "checkpoint:limits", tiles: 1 });
  if (!ctx.seen.includes("toll") && !ctx.tollConfirmed) n.push({ id: "toll", tiles: 1 });
  return n;
}

export const canadaLife: Pack = {
  id: "canada-life",
  title: "Future Me",
  track: "Canada Life",
  rome: "An automatic contribution, set up",
  romePredicate: "(reached toll-booth :effect contribute)",
  moodQuestion: "How do you feel about money right now?",
  checkpointKinds: ["risk", "fees", "limits"],
  topics: ["tfsa", "fhsa", "stocks", "crypto", "funds", "saving", "compounding", "automation", "risk"],
  protectedTopics: ["risk"],
  forkKeys: { route: ["fast", "scenic"], account: ["tfsa", "fhsa", "unsure"] },
  facts,
  budget: { rush: 9, steady: 13, linger: 17 },
  banned: null,
  crisisExit: false,
  hasSearch: false,
  numbers: [String(SPARE)],
  invariants: [
    {
      id: "disclose-first",
      doc: "Risk and fees are seen before the toll booth.",
      check: (t, ctx) => (t.kind === "toll-booth" && !(ctx.seen.includes("risk") && ctx.seen.includes("fees")) ? `toll-booth before ${["risk", "fees"].filter((k) => !ctx.seen.includes(k)).join(" and ")} checkpoint` : null),
    },
    {
      id: "limits-first",
      doc: "The account is chosen and its limits are seen before the toll booth. Limits come after the account.",
      check: (t, ctx) => {
        if (t.kind === "checkpoint" && t.check === "limits" && !ACCOUNTS.includes(ctx.choices.account ?? "")) return "limits checkpoint before an account is chosen";
        if (t.kind === "toll-booth" && !ACCOUNTS.includes(ctx.choices.account ?? "")) return "toll-booth before an account is chosen";
        if (t.kind === "toll-booth" && !ctx.seen.includes("limits")) return "toll-booth before limits checkpoint";
        return null;
      },
    },
    {
      id: "goal-realign",
      doc: "After the account changes, the old limits do not count: the toll booth needs limits for the current account.",
      check: (t, ctx) => (t.kind === "toll-booth" && ctx.seen.includes("limits") && !seenFor(ctx, "limits", "account") ? `limits were shown for another account, not ${ctx.choices.account}` : null),
    },
  ],
  requirements,
  onChoice: (ctx, key, value) => (key === "route" ? { ...ctx, budgetBonus: ctx.budgetBonus + (value === "scenic" ? 4 : -1) } : ctx),
  opening: () =>
    `(stretch (mood before) (fork :key route (branch "Fast road" :value fast :lead (signpost auto-contrib)) (branch "Scenic road" :value scenic :lead (vista "The long view"))))`,
  fallback(ctx) {
    return fallbackStretch(this, ctx, (c) => factFiller(this, c, FILLER), (need, c) => {
      if (need === "fork:account")
        return c.choices.account === "unsure"
          ? `(fork :key account (branch "Flexible" :value tfsa :lead ${lead(this, c, "tfsa-basics")}) (branch "First home" :value fhsa :lead ${lead(this, c, "fhsa-basics")}))`
          : `(fork :key account (branch "TFSA" :value tfsa :lead ${lead(this, c, "tfsa-basics")}) (branch "FHSA" :value fhsa :lead ${lead(this, c, "fhsa-basics")}) (branch "Not sure" :value unsure :lead ${lead(this, c, "auto-contrib")}))`;
      if (need.startsWith("checkpoint:")) return `(checkpoint ${need.split(":")[1]})`;
      if (need === "toll") return "(toll-booth)";
      return null;
    });
  },
  effect: {
    name: "contribute",
    label: "Set up automatic contribution",
    validate(ctx, input) {
      const acct = ctx.choices.account;
      if (!acct || !ACCOUNTS.includes(acct)) return "choose an account first";
      if (!seenFor(ctx, "limits", "account")) return "limits for this account not seen";
      const max = Math.min(SPARE, Math.floor(ROOM[acct] / 12));
      const a = input.amount ?? 0;
      if (!Number.isInteger(a) || a < 10 || a > max) return `amount must be $10 to $${max} a month`;
      return null;
    },
    params: (ctx, input) => ({ account: ctx.choices.account, amount: input.amount ?? 0, freq: "monthly" }),
  },
  system:
    "You pave a calm road for a 21-year-old student with about $300 a month spare. The road always ends at a toll booth where they set up an automatic TFSA or FHSA contribution. Rushers get short roads. Lingerers get vistas and bridges. Plain words, no hype, no fear.",
  injects: [
    {
      id: "hidden-risk",
      label: "Toll booth that hides the risk checkpoint",
      ctx: (c) => ({ ...c, seen: c.seen.filter((s) => !s.startsWith("risk")) }),
      src: "(stretch (signpost auto-contrib) (toll-booth))",
      expect: "disclose-first",
    },
  ],
};

export const FINANCE_LIMITS = { ROOM, SPARE };
