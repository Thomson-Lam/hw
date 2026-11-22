// The one contract between producers (agent, simulator, fixed pipeline) and the road renderer.
// A producer only emits Elements. The renderer owns layout, styling and every interaction.

export type Rule =
  | { kind: "prefer" | "avoid"; key: string }
  | { kind: "max"; key: string; value: number }
  | { kind: "set"; key: string; value: string | number };

// A photo the server found for an idea (never model-written). `page` is the source page for the credit link.
export type ItemImage = { url: string; page?: string; credit?: string; alt?: string };

export type Choice = { label: string; sub?: string; rule: Rule };

// Small visuals the agent fills with data; the app draws them. One per frame or step.
export type Viz =
  | { kind: "chips"; items: string[]; highlight?: number[] } // e.g. tokens, with some lit up
  | { kind: "bars"; items: { label: string; value: number }[]; unit?: "%" | "" } // e.g. next-word probabilities
  | { kind: "flow"; items: string[] } // A → B → C
  | { kind: "number"; value: string; label: string }; // one big figure

// A real listing found by search; photo and price read from the store's own page when possible.
export type Product = { name: string; price_cad: number; store?: string; url?: string; image?: string; why: string; specs: string[] };
export type WebSource = { title?: string; uri: string };
export type OddsRow = { weekly: number; reached: number; month: number | null };

export type DialFrame = { at: number; caption: string; viz?: Viz };
export type StoryStep = { caption: string; viz?: Viz };

export type Outcome = "fine" | "rough_recovered" | "hard";
export type FutureSide = { outcome: Outcome; end_balance: number; min_balance: number; series: number[]; story: string };
export type Tally = Record<Outcome, number>;
export type MiniFuture = { outcome: Outcome; end_balance: number; story: string };

export type Element =
  // Agent-filled (explore pipeline). Slots are short strings and tags from a closed vocabulary.
  | { type: "item"; title: string; line: string; tags: string[]; hours?: number; image?: ItemImage }
  | { type: "thisthat"; prompt: string; a: Choice; b: Choice }
  | { type: "slider"; prompt: string; key: string; min: number; max: number; step: number; v: number; unit: "h" | "$" | "mo" }
  | { type: "fork"; prompt: string; opts: Choice[] }
  | { type: "ask"; prompt: string; placeholder: string; examples: string[] }
  // Concept path: teach, don't suggest.
  | { type: "deck"; title: string; cards: string[] } // flashcards, one sentence each; shuffle as you scroll
  | { type: "dial"; title: string; prompt: string; knob: { label: string; min: number; max: number; step: number; unit?: string }; frames: DialFrame[] } // drag the knob, the visual and caption change
  | { type: "story"; title: string; steps: StoryStep[] } // a storyboard in one card, stepped with Next
  // Find / make road: real options, then a plan.
  | { type: "compare"; title: string; items: Product[]; note?: string; sources?: WebSource[] } // choose one to plan for
  | { type: "kit"; title: string; steps: string[]; items: Product[]; total: number; note?: string; sources?: WebSource[] } // how to make it and what to buy
  | { type: "savings"; goal: string; persona: string; target: number; horizon: number; total: number; weekly_cap: number; rows: OddsRow[]; assumptions: string[] } // simulator: odds of reaching the target
  // Money road result: the same 5,000 futures before and after the person's decisions.
  | { type: "moneyplan"; worry: string; persona: string; choices: string[]; total: number; monthly: number; before: Tally; after: Tally; examples: { future_id: number; before: MiniFuture; after: MiniFuture }[]; assumptions: string[] }
  // Simulator-filled (finance pipeline, Uncharted PRD section 9 shapes).
  | { type: "future"; future_id: number; baseline: FutureSide; lever?: FutureSide; weekly?: number; index: number; of: number; months?: number }
  | { type: "tally"; baseline: Tally; lever?: Tally; weekly?: number; total: number }
  | { type: "assumptions"; lines: string[] }
  // Fixed copy, never model text.
  | { type: "action"; weekly: number }
  | { type: "checkin"; final?: boolean }
  | { type: "deadend"; reason: string };

export type ElementType = Element["type"];

export type Source = "agent" | "sim" | "fixed" | "fallback";

// One stop on the road as the server returns it: the widget, its agent message, and the active answer.
export type Segment = {
  id: string;
  el: Element;
  source: Source;
  message: string;
  blocks: boolean;
  answer: { label: string; option_index: number | null; rules: { id: string; text: string; key: string }[] } | null;
};
