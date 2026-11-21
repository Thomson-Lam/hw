// Shared types for the road-lab engine, packs, UI, server and lab.

export type Pace = "rush" | "steady" | "linger";
export type PackId = "canada-life" | "sun-life" | "merch-trail";

/** One Printables search result. Only the server creates rows. The LLM can only reference `id`. */
export type Row = {
  id: string;
  title: string;
  license: string;
  likes: number;
  stlBytes: number;
  stlFileId: string;
  image: string | null;
  author: string | null;
};

export type Branch = { label: string | null; value: string | null; result: string | null; lead: Tile };

export type Tile =
  | { kind: "mood"; when: "before" | "after" }
  | { kind: "signpost"; fact: string | null; label: string | null; topic: string | null }
  | { kind: "vista"; fact: string | null; label: string | null }
  | { kind: "bridge"; fact: string }
  | { kind: "fog" }
  | { kind: "checkpoint"; check: string }
  | { kind: "fork"; key: string | null; branches: Branch[] }
  | { kind: "search"; query: string; style: string; supports: string }
  | { kind: "pick"; result: string }
  | { kind: "toll-booth" }
  | { kind: "campfire" }
  | { kind: "help" };

export type TileKind = Tile["kind"];

/** A grown tile: a deftile that compiled. `form` is the source text. `data` holds fact rows it needs. */
export type Grown = { id?: number; name: string; form: string; data?: Row | null };

/** Everything the compiler and the paver know at one point on the road. JSON-serializable. */
export type Ctx = {
  pack: PackId;
  pace: Pace;
  mood: string | null;
  path: string[];
  seen: string[];
  choices: Record<string, string>;
  avoid: string[];
  used: number;
  budgetBonus: number;
  grown: Grown[];
  results: Row[];
  numbers: string[];
  searched: boolean;
  tollConfirmed: boolean;
  crisis: boolean;
};

export type Verdict = { inv: string; msg: string };
export type Origin = "llm" | "engine";

export type CompileResult = {
  ok: boolean;
  tiles: Tile[];
  errors: Verdict[];
  ctxAfter: Ctx;
  defs: Grown[];
};

export type Fact = { short: string; long: string; topic: string | null; source: string };

/** One unmet step on the way to Rome, in order. `tiles` is the road length it needs. */
export type Need = { id: string; tiles: number };

export type PackInvariant = {
  id: string;
  doc: string;
  /** Called for each tile with the ctx before the tile. Return a message to reject. */
  check: (tile: Tile, ctx: Ctx, pack: Pack) => string | null;
};

export type EffectName = "contribute" | "book" | "save-pick";
export type EffectInput = { amount?: number; slot?: string };
export type EffectRecord = { name: EffectName; params: Record<string, string | number>; at: number; cause: "click" };

export type InjectCase = { id: string; label: string; ctx: (ctx: Ctx) => Ctx; src: string; expect: string };

export type Pack = {
  id: PackId;
  title: string;
  track: string;
  rome: string;
  romePredicate: string;
  moodQuestion: string | null;
  checkpointKinds: string[];
  topics: string[];
  protectedTopics: string[];
  forkKeys: Record<string, string[]>;
  facts: (ctx: Ctx) => Record<string, Fact>;
  budget: Record<Pace, number>;
  banned: RegExp | null;
  crisisExit: boolean;
  hasSearch: boolean;
  invariants: PackInvariant[];
  requirements: (ctx: Ctx) => Need[];
  onChoice: (ctx: Ctx, key: string, value: string) => Ctx;
  opening: () => string;
  fallback: (ctx: Ctx) => string | null;
  effect: {
    name: EffectName;
    label: string;
    validate: (ctx: Ctx, input: EffectInput) => string | null;
    params: (ctx: Ctx, input: EffectInput) => Record<string, string | number>;
  };
  numbers: string[];
  system: string;
  injects: InjectCase[];
  slots?: string[];
};
