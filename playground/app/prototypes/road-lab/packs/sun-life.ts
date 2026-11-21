// Health pack (Sun Life): the road to care you're already covered for.
import type { Ctx, Fact, Need, Pack } from "../types";
import { factFiller, fallbackStretch, forkNeed, lead, seenFor } from "./common";

const CARE = ["counselling", "physio", "checkup"];
const SIM = "Simulated benefits plan for the demo";
const PLAN: Record<string, { covered: string; cost: string; coverShort: string; costShort: string }> = {
  counselling: {
    coverShort: "Counselling: $500 a year, $0 used.",
    covered: "Your simulated plan covers counselling up to $500 a year. You have used $0, so $500 is left.",
    costShort: "A $150 session: you pay $0.",
    cost: "A typical $150 session: the plan pays $150 and you pay $0, until the $500 is used.",
  },
  physio: {
    coverShort: "Physio: 80% covered, $400 a year.",
    covered: "Your simulated plan pays 80% of physiotherapy, up to $400 a year. You have used $0.",
    costShort: "A $90 visit: you pay $18.",
    cost: "A typical $90 visit: the plan pays $72 and you pay $18.",
  },
  checkup: {
    coverShort: "Check-ups: covered in full.",
    covered: "Your simulated plan covers a yearly check-up in full.",
    costShort: "A check-up: you pay $0.",
    cost: "A yearly check-up costs you $0 on this simulated plan.",
  },
};

function facts(ctx: Ctx): Record<string, Fact> {
  const p = PLAN[ctx.choices.care ?? ""];
  return {
    "plan-basics": { short: "Your plan already pays for some care.", long: "This simulated plan covers counselling, physio and check-ups. You already pay for it through your premiums.", topic: "plan", source: SIM },
    unused: { short: "Many people never use their coverage.", long: "In one Canadian survey, 36% of people with mental health coverage had never used it.", topic: "plan", source: "Abacus Data for CLHIA, 2022" },
    "money-stress-common": { short: "Money stress is common.", long: "Many people feel money stress every week. You are not the only one.", topic: "money-stress", source: "TD survey: 64% of Gen Z feel financial stress multiple times a week" },
    "talk-one": { short: "One conversation is a first step.", long: "Talking with one person, a friend or a professional, is a small first step that many people take.", topic: "talking", source: "General" },
    "sleep-routine": { short: "A regular bedtime is a small step.", long: "Going to bed at about the same time each night is one small step some people start with.", topic: "sleep", source: "General" },
    "counselling-what": { short: "Counselling: talk with a trained counsellor.", long: "A counsellor listens and helps you sort out what is weighing on you. Sessions are private.", topic: "talking", source: "General" },
    "physio-what": { short: "Physio: help moving your body.", long: "A physiotherapist helps with pain, stiffness and getting active again.", topic: "movement", source: "General" },
    "checkup-what": { short: "Check-up: a yearly visit.", long: "A yearly check-up with a doctor or nurse practitioner looks at your health as a whole.", topic: "checkup", source: "General" },
    coverage: { short: p ? p.coverShort : "Pick a kind of care to see your coverage.", long: p ? p.covered : "Pick a kind of care to see your coverage.", topic: "coverage", source: SIM },
    cost: { short: p ? p.costShort : "Pick a kind of care to see the cost.", long: p ? p.cost : "Pick a kind of care to see the cost.", topic: "coverage", source: SIM },
    help: { short: "Call or text 9-8-8, any time.", long: "If you are thinking about suicide or worried about someone, call or text 9-8-8, the Suicide Crisis Helpline, any time, day or night.", topic: null, source: "988.ca" },
  };
}

const FILLER = [
  { src: "(signpost plan-basics)", fact: "plan-basics" },
  { src: "(signpost unused)", fact: "unused" },
  { src: "(signpost talk-one)", fact: "talk-one" },
  { src: "(signpost sleep-routine)", fact: "sleep-routine" },
  { src: "(signpost money-stress-common)", fact: "money-stress-common" },
];

function requirements(ctx: Ctx): Need[] {
  const n: Need[] = [];
  if (forkNeed(ctx, "care", CARE)) n.push({ id: "fork:care", tiles: 2 });
  if (!seenFor(ctx, "coverage", "care")) n.push({ id: "checkpoint:coverage", tiles: 1 });
  if (!seenFor(ctx, "cost", "care")) n.push({ id: "checkpoint:cost", tiles: 1 });
  if (!ctx.seen.includes("toll") && !ctx.tollConfirmed) n.push({ id: "toll", tiles: 1 });
  return n;
}

export const SLOTS = ["Tue 4:00 pm", "Thu 10:30 am", "Sat 1:00 pm"];

export const sunLife: Pack = {
  id: "sun-life",
  title: "Care you already have",
  track: "Sun Life",
  rome: "One booked appointment your plan already covers",
  romePredicate: "(reached toll-booth :effect book)",
  moodQuestion: "How are you feeling right now?",
  checkpointKinds: ["coverage", "cost"],
  topics: ["plan", "talking", "movement", "sleep", "checkup", "money-stress", "coverage"],
  protectedTopics: ["coverage"],
  forkKeys: { weighing: ["money", "school", "people"], care: CARE },
  facts,
  budget: { rush: 8, steady: 11, linger: 14 },
  banned: /\b(anxiety|anxious|depress\w*|diagnos\w*|disorder\w*|adhd|ptsd|panic attacks?|bipolar|ocd|you have|sounds like|symptoms?|cure\w*|mentally ill)\b/i,
  crisisExit: true,
  hasSearch: false,
  numbers: [],
  slots: SLOTS,
  invariants: [
    { id: "no-diagnosis", doc: "No label makes a clinical claim (guard term list). The road names kinds of care, never conditions.", check: () => null },
    {
      id: "crisis-exit",
      doc: "A 9-8-8 crisis exit shows on every stretch. After the user takes it, only the help tile may follow.",
      check: (t, ctx) => (ctx.crisis && t.kind !== "help" ? `crisis exit taken: only (help) may follow, got ${t.kind}` : null),
    },
    {
      id: "no-surprise-cost",
      doc: "The kind of care is chosen, and its coverage and out-of-pocket cost are seen, before the booking toll booth.",
      check: (t, ctx) => {
        if (t.kind === "checkpoint" && !CARE.includes(ctx.choices.care ?? "")) return `${t.check} checkpoint before a kind of care is chosen`;
        if (t.kind !== "toll-booth") return null;
        const missing = ["coverage", "cost"].filter((k) => !seenFor(ctx, k, "care"));
        return missing.length ? `booking toll-booth before ${missing.join(" and ")} for ${ctx.choices.care ?? "a chosen care"}` : null;
      },
    },
  ],
  requirements,
  onChoice: (ctx) => ctx,
  opening: () =>
    `(stretch (mood before) (fork :key weighing (branch "Money" :value money :lead (signpost money-stress-common)) (branch "School or work" :value school :lead (signpost plan-basics)) (branch "People" :value people :lead (signpost talk-one))))`,
  fallback(ctx) {
    return fallbackStretch(this, ctx, (c) => factFiller(this, c, FILLER), (need, c) => {
      if (need === "fork:care")
        return `(fork :key care (branch "Talk to someone" :value counselling :lead ${lead(this, c, "counselling-what")}) (branch "Move my body" :value physio :lead ${lead(this, c, "physio-what")}) (branch "A check-up" :value checkup :lead ${lead(this, c, "checkup-what")}))`;
      if (need.startsWith("checkpoint:")) return `(checkpoint ${need.split(":")[1]})`;
      if (need === "toll") return "(toll-booth)";
      return null;
    });
  },
  effect: {
    name: "book",
    label: "Book this appointment",
    validate(ctx, input) {
      if (!CARE.includes(ctx.choices.care ?? "")) return "choose a kind of care first";
      if (!seenFor(ctx, "coverage", "care") || !seenFor(ctx, "cost", "care")) return "coverage and cost not seen";
      if (!input.slot || !SLOTS.includes(input.slot)) return "pick a time";
      return null;
    },
    params: (ctx, input) => ({ care: ctx.choices.care, slot: input.slot ?? "" }),
  },
  system:
    "You pave a gentle road for a stressed person with a benefits plan they never use. The road ends at a toll booth where they book one appointment their plan already covers. Name kinds of care, never conditions. Never diagnose. Short, kind labels.",
  injects: [
    {
      id: "diagnosis",
      label: "Stretch that diagnoses the user",
      ctx: (c) => c,
      src: '(stretch (signpost "Sounds like anxiety to me" :topic talking))',
      expect: "no-diagnosis",
    },
  ],
};
