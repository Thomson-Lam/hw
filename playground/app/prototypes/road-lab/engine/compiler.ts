// The compiler: closed language → checked tiles. Every stretch from every source goes through compile().
import type { Branch, CompileResult, Ctx, Grown, Origin, Pack, Tile, Verdict } from "../types";
import { guardLabel } from "./guard";
import { args, isList, isStr, isSym, read, ReadError, show, symbols, type Form } from "./reader";

export const CORE_KINDS = ["signpost", "vista", "bridge", "fog", "checkpoint", "fork", "toll-booth"] as const;
export const ENGINE_ONLY = ["mood", "campfire", "help"] as const;
export const LEAD_KINDS = ["signpost", "vista", "bridge", "fog", "checkpoint"];
export const EFFECT_WORDS = ["contribute", "book", "save-pick", ":effect", ":amount", ":slot", ":account"];
export const MAX_EXPAND_DEPTH = 8;
export const MAX_TILES = { llm: 4, engine: 6 };

/** Universal invariants: same for every pack. Each has at least one reject fixture (lab/fixtures.ts). */
export const UNIVERSAL_INVARIANTS: Record<string, string> = {
  syntax: "Source reads as balanced lists of known atoms.",
  size: "Source is small and shallow (chars, tokens, nesting).",
  "no-noise": "Every tile is in the core kit, the pack kit, or a grown tile.",
  "engine-only": "mood, campfire and help tiles come only from the engine.",
  "stretch-size": "An LLM stretch has 1 to 4 tiles.",
  "fork-arity": "A fork has 2 or 3 branches.",
  "fork-last": "A fork, a search, or a toll booth ends the stretch.",
  "fork-values": "A keyed fork uses a pack key and only that key's values.",
  "lead-kind": "A branch lead-in is one simple tile (signpost, vista, bridge, fog, checkpoint).",
  "no-silent-effect": "No effect words appear in paved text. Effects run only from a clicked toll booth.",
  "unknown-fact": "Every fact id is in the active pack's vetted facts table.",
  "unknown-topic": "Every topic is a pack topic.",
  "checkpoint-kind": "Every checkpoint kind is a pack checkpoint kind.",
  "grounded-text": "Labels contain no claim words and no numbers missing from the context.",
  "label-length": "Labels have 1 to 6 words.",
  "user-rule": "No tile uses a topic the user's rules avoid (checkpoints exempt).",
  "all-roads-to-rome": "Filler tiles never use more road than the budget leaves after the unmet steps.",
  "grown-tile": "A deftile has a new name and expands to an existing tile.",
  termination: "Grown tile expansion stops within 8 levels.",
};

const plain = (f: Form | undefined): string | null => (isStr(f) ? f.str : null);
const sym = (f: Form | undefined): string | null => (isSym(f) && !f.startsWith(":") ? f : null);

export function budgetOf(pack: Pack, ctx: Ctx): number {
  return pack.budget[ctx.pace] + ctx.budgetBonus;
}

export function needTiles(pack: Pack, ctx: Ctx): number {
  return pack.requirements(ctx).reduce((a, n) => a + n.tiles, 0);
}

/** Ctx after a tile is on the road (a fork counts 2: the fork and the lead-in the user walks next). */
export function applyTile(ctx: Ctx, tile: Tile): Ctx {
  const next: Ctx = { ...ctx, used: ctx.used + (tile.kind === "fork" ? 2 : 1), seen: [...ctx.seen], path: [...ctx.path] };
  if (tile.kind === "checkpoint") {
    next.seen.push(tile.check);
    // Per-choice record: a checkpoint shown for account=tfsa does not count once the account changes.
    for (const [k, v] of Object.entries(ctx.choices)) next.seen.push(`${tile.check}@${k}=${v}`);
  }
  if ((tile.kind === "signpost" || tile.kind === "vista" || tile.kind === "bridge") && tile.fact) next.seen.push(`fact:${tile.fact}`);
  if (tile.kind === "fork" && tile.key) next.seen.push(`fork:${tile.key}`);
  if (tile.kind === "pick") next.seen.push(`pick:${tile.result}`);
  if (tile.kind === "search") {
    next.searched = true;
    next.seen = next.seen.filter((x) => x !== "results:done");
  }
  if (tile.kind === "toll-booth") next.seen.push("toll");
  next.path.push(summarize(tile));
  if (next.path.length > 16) next.path = next.path.slice(-16);
  return next;
}

export function summarize(t: Tile): string {
  switch (t.kind) {
    case "signpost":
      return `signpost(${t.fact ?? t.topic ?? "?"})`;
    case "vista":
      return `vista(${t.fact ?? t.label ?? ""})`;
    case "bridge":
      return `bridge(${t.fact})`;
    case "checkpoint":
      return `checkpoint ${t.check}`;
    case "fork":
      return `fork${t.key ? ` ${t.key}` : ""}`;
    case "search":
      return `search "${t.query}"`;
    case "pick":
      return `pick ${t.result}`;
    default:
      return t.kind;
  }
}

type Defs = Map<string, { params: string[]; body: Form }>;

export function compile(src: string, ctx: Ctx, pack: Pack, origin: Origin = "llm"): CompileResult {
  const errors: Verdict[] = [];
  const fail = (inv: string, msg: string) => errors.push({ inv, msg });
  const done = (tiles: Tile[], ctxAfter: Ctx, defs: Grown[]): CompileResult => ({ ok: errors.length === 0, tiles, errors, ctxAfter, defs });

  let forms: Form[];
  try {
    forms = read(src);
  } catch (e) {
    if (e instanceof ReadError) fail(e.inv, e.message);
    else fail("syntax", String(e));
    return done([], ctx, []);
  }

  if (origin === "llm") {
    const words = forms.flatMap((f) => symbols(f));
    for (const w of EFFECT_WORDS) if (words.includes(w)) fail("no-silent-effect", `effect word "${w}" in paved text`);
  }

  // Grown tiles: existing (persisted) first, then new deftiles in this source.
  const defs: Defs = new Map();
  const newDefs: Grown[] = [];
  for (const g of ctx.grown) {
    try {
      const [f] = read(g.form);
      if (isList(f) && f[0] === "deftile" && isSym(f[1]) && isList(f[2])) defs.set(f[1], { params: f[2].filter(isSym), body: f[3] });
    } catch {
      /* a broken persisted tile is ignored, never rendered */
    }
  }
  const tileForms: Form[] = [];
  for (const f of forms) {
    if (!isList(f) || f.length === 0) {
      fail("syntax", `top level must be lists, got ${show(f).slice(0, 30)}`);
      continue;
    }
    if (f[0] === "deftile") {
      const [, name, params, body] = f;
      if (!isSym(name) || !isList(params) || !isList(body) || !params.every(isSym)) {
        fail("grown-tile", `deftile needs (deftile name (params) tile): ${show(f).slice(0, 60)}`);
        continue;
      }
      if ((CORE_KINDS as readonly string[]).includes(name) || (ENGINE_ONLY as readonly string[]).includes(name) || ["stretch", "deftile", "branch", "search", "pick"].includes(name)) {
        fail("grown-tile", `cannot redefine ${name}`);
        continue;
      }
      const head = body[0];
      if (!isSym(head) || !([...CORE_KINDS, "pick"] as string[]).concat([...defs.keys()]).includes(head) || head === "fork" || head === "toll-booth") {
        fail("grown-tile", `${name} must expand to an existing simple tile, got ${show(body).slice(0, 40)}`);
        continue;
      }
      defs.set(name, { params: params as string[], body });
      newDefs.push({ name, form: show(f) });
      continue;
    }
    if (f[0] === "stretch") tileForms.push(...f.slice(1));
    else tileForms.push(f);
  }

  const expand = (f: Form, depth: number): Form => {
    if (!isList(f) || !isSym(f[0])) return f;
    const d = defs.get(f[0]);
    if (!d) return f;
    if (depth >= MAX_EXPAND_DEPTH) {
      fail("termination", `grown tile ${f[0]} expands deeper than ${MAX_EXPAND_DEPTH}`);
      return ["fog"];
    }
    const env = new Map(d.params.map((p, i) => [p, f[i + 1]] as const));
    const sub = (x: Form): Form => (isList(x) ? x.map(sub) : isSym(x) && env.has(x) ? (env.get(x) as Form) : x);
    return expand(sub(d.body), depth + 1);
  };

  const parse = (raw: Form, asLead = false): Tile | null => {
    const f = expand(raw, 0);
    if (!isList(f) || !isSym(f[0])) {
      fail("syntax", `tile must be a list: ${show(f).slice(0, 40)}`);
      return null;
    }
    const kind = f[0];
    const { kw, pos } = args(f);
    if ((ENGINE_ONLY as readonly string[]).includes(kind)) {
      if (origin === "llm") {
        fail("engine-only", `${kind} tiles come only from the engine`);
        return null;
      }
      if (kind === "mood") return { kind, when: sym(pos[0]) === "after" ? "after" : "before" };
      return { kind } as Tile;
    }
    const known = [...CORE_KINDS, ...(pack.hasSearch ? ["search", "pick"] : [])] as string[];
    if (!known.includes(kind)) {
      fail("no-noise", `unknown tile ${kind}`);
      return null;
    }
    if (asLead && !LEAD_KINDS.includes(kind)) {
      fail("lead-kind", `lead-in must be a simple tile, got ${kind}`);
      return null;
    }
    switch (kind) {
      case "signpost": {
        const fact = sym(pos[0]);
        const label = plain(pos[0]);
        const topic = sym(kw.topic);
        if (!fact && !label) fail("syntax", "signpost needs a fact id or a label");
        return { kind, fact, label, topic };
      }
      case "vista":
        return { kind, fact: sym(pos[0]), label: plain(pos[0]) };
      case "bridge": {
        const fact = sym(pos[0]);
        if (!fact) fail("unknown-fact", "bridge needs a fact id");
        return { kind, fact: fact ?? "" };
      }
      case "fog":
        return { kind };
      case "checkpoint":
        return { kind, check: sym(pos[0]) ?? plain(pos[0]) ?? "" };
      case "toll-booth":
        return { kind };
      case "pick":
        return { kind, result: String(isStr(pos[0]) ? pos[0].str : (pos[0] ?? "")) };
      case "search":
        return { kind, query: plain(pos[0]) ?? "", style: sym(kw.style) ?? "any", supports: sym(kw.supports) ?? "any" };
      case "fork": {
        const key = sym(kw.key);
        const branches: Branch[] = [];
        for (const b of pos) {
          if (!isList(b) || b[0] !== "branch") {
            fail("syntax", `fork takes (branch ...) forms, got ${show(b).slice(0, 30)}`);
            continue;
          }
          const ba = args(b);
          const leadForm = ba.kw.lead;
          const lead = leadForm ? parse(leadForm, true) : null;
          if (!lead) {
            if (!leadForm) fail("lead-kind", "every branch needs :lead with one simple tile");
            continue;
          }
          const first = ba.pos[0];
          branches.push({
            label: plain(first),
            value: sym(ba.kw.value),
            result: key === "pick" ? (isStr(first) ? first.str : first !== undefined ? String(first) : null) : null,
            lead,
          });
        }
        return { kind, key, branches };
      }
    }
    return null;
  };

  const tiles: Tile[] = [];
  for (const f of tileForms) {
    const t = parse(f);
    if (t) tiles.push(t);
  }
  if (origin === "llm" && (tiles.length < 1 || tiles.length > MAX_TILES.llm) && errors.length === 0)
    fail("stretch-size", `LLM stretch has ${tiles.length} tiles (1..${MAX_TILES.llm})`);

  // Sequential checks with the running ctx.
  let c = ctx;
  const facts = () => pack.facts(c);
  const label = (text: string | null) => {
    if (text !== null) for (const e of guardLabel(text, c, pack)) errors.push(e);
  };
  const checkSimple = (t: Tile) => {
    if (t.kind === "signpost") {
      if (t.fact && !facts()[t.fact]) fail("unknown-fact", `unknown fact ${t.fact}`);
      if (t.topic && !pack.topics.includes(t.topic)) fail("unknown-topic", `unknown topic ${t.topic}`);
      if (t.label && !t.topic) fail("unknown-topic", "a label signpost needs :topic");
      label(t.label);
      const topic = t.fact ? (facts()[t.fact]?.topic ?? null) : t.topic;
      if (topic && c.avoid.includes(topic)) fail("user-rule", `topic ${topic} is avoided by a user rule`);
    }
    if (t.kind === "vista") {
      if (t.fact && !facts()[t.fact]) fail("unknown-fact", `unknown fact ${t.fact}`);
      label(t.label);
    }
    if (t.kind === "bridge" && t.fact && !facts()[t.fact]) fail("unknown-fact", `unknown fact ${t.fact}`);
    if (t.kind === "checkpoint" && !pack.checkpointKinds.includes(t.check))
      fail("checkpoint-kind", `checkpoint must be ${pack.checkpointKinds.join("|")}, got ${JSON.stringify(t.check)}`);
  };

  const budget = budgetOf(pack, ctx);
  const needsBefore = pack.requirements(ctx);
  const slack = budget - ctx.used - needsBefore.reduce((a, n) => a + n.tiles, 0);
  let filler = 0;

  tiles.forEach((t, i) => {
    const last = i === tiles.length - 1;
    if ((t.kind === "fork" || t.kind === "search" || t.kind === "toll-booth") && !last) fail("fork-last", `${t.kind} must end the stretch`);
    if (t.kind === "fork") {
      if (t.branches.length < 2 || t.branches.length > 3) fail("fork-arity", `fork has ${t.branches.length} branches (2..3)`);
      if (t.key !== null) {
        const allowed = pack.forkKeys[t.key];
        if (!allowed) fail("fork-values", `unknown fork key ${t.key}`);
        else if (t.key !== "pick") {
          const vals = t.branches.map((b) => b.value);
          for (const v of vals) if (!v || !allowed.includes(v)) fail("fork-values", `fork ${t.key} value ${v} not in ${allowed.join("|")}`);
          if (new Set(vals).size !== vals.length) fail("fork-values", `fork ${t.key} repeats a value`);
        }
      }
      for (const b of t.branches) {
        if (t.key !== "pick") label(b.label);
        if (t.key !== "pick" && !b.label) fail("syntax", "branch needs a label");
        checkSimple(b.lead);
        // The user walks a lead-in after choosing it, so pack rules see the choice applied.
        const value = t.key === "pick" ? b.result : b.value;
        const cb: Ctx = t.key && value ? { ...c, choices: { ...c.choices, [t.key]: value } } : c;
        for (const inv of pack.invariants) {
          const msg = inv.check(b.lead, cb, pack);
          if (msg) fail(inv.id, `lead-in: ${msg}`);
        }
      }
    } else checkSimple(t);
    if (t.kind === "search") label(t.query);
    for (const inv of pack.invariants) {
      const msg = inv.check(t, c, pack);
      if (msg) fail(inv.id, msg);
    }
    const before = needTiles(pack, c);
    c = applyTile(c, t);
    const after = needTiles(pack, c);
    const endTile = t.kind === "toll-booth" || (ENGINE_ONLY as readonly string[]).includes(t.kind);
    if (!endTile && after >= before) filler += t.kind === "fork" ? 2 : 1;
  });

  if (!tiles.some((t) => t.kind === "toll-booth") && filler > Math.max(0, slack))
    fail("all-roads-to-rome", `${filler} filler tile(s) but only ${Math.max(0, slack)} of budget ${budget} left after unmet steps (${needsBefore.map((n) => n.id).join(", ") || "none"})`);

  return done(tiles, c, newDefs);
}

/** Text a fact resolves to at this pace. Pace is applied at render time, never by the LLM. */
export function factText(pack: Pack, ctx: Ctx, id: string, long: boolean): string {
  const f = pack.facts(ctx)[id];
  if (!f) return "";
  return long ? f.long : f.short;
}

export function emptyCtx(pack: Pack): Ctx {
  return {
    pack: pack.id,
    pace: "steady",
    mood: null,
    path: [],
    seen: [],
    choices: {},
    avoid: [],
    used: 0,
    budgetBonus: 0,
    grown: [],
    results: [],
    numbers: [...pack.numbers],
    searched: false,
    tollConfirmed: false,
    crisis: false,
  };
}
