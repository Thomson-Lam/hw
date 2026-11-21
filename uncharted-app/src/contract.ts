// The one contract between producers (agent, simulator, fixed pipeline) and the road renderer.
// A producer only emits Elements. The renderer owns layout, styling and every interaction.

export type Rule =
  | { kind: "prefer" | "avoid"; key: string }
  | { kind: "max"; key: string; value: number }
  | { kind: "set"; key: string; value: string | number };

export type Choice = { label: string; sub?: string; rule: Rule };

export type Outcome = "fine" | "rough_recovered" | "hard";
export type FutureSide = { outcome: Outcome; end_balance: number; min_balance: number; series: number[]; story: string };
export type Tally = Record<Outcome, number>;

export type Element =
  // Agent-filled (explore pipeline). Slots are short strings and tags from a closed vocabulary.
  | { type: "item"; title: string; line: string; tags: string[]; hours?: number }
  | { type: "thisthat"; prompt: string; a: Choice; b: Choice }
  | { type: "slider"; prompt: string; key: string; min: number; max: number; step: number; v: number; unit: "h" | "$" | "mo" }
  | { type: "fork"; prompt: string; opts: Choice[] }
  | { type: "ask"; prompt: string; placeholder: string; examples: string[] }
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
