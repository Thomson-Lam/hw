// RoadSession: the loop. Same code runs in the phone UI and in the lab runner.
// Fallback road first (always compiled), LLM stretches replace unreached fallback stretches, lead-in tiles at forks,
// pace at render, rules from skips, effects only from confirm() (a toll booth click).
import type { Ctx, EffectInput, EffectRecord, Grown, Pack, Pace, Row, Tile, Verdict } from "../types";
import { applyTile, compile, emptyCtx } from "./compiler";
import { isSkip, paceOf, SKIPS_FOR_RULE, skipTopic } from "./horse";
import { choose as chooseBranch, decline as declineCtx, realign as realignCtx } from "./road";

export const LOOKAHEAD = 3;

export type Source = "opening" | "fallback" | "llm" | "lead" | "engine";
export type RoadTile = { id: number; tile: Tile; source: Source; stretch: number; chosen?: number; state?: "declined" | "revoked" | "confirmed" };
export type RuleRow = { id: number; topic: string; form: string };
export type PaveReply = { ok: true; src: string; attempts?: number } | { ok: false; stopped?: boolean; error: string; attempts?: number };
export type TraceEvent = { stage: string; [k: string]: unknown };

export type Deps = {
  live: boolean;
  now: () => number;
  trace: (e: TraceEvent) => void;
  pave: (req: { ctx: Ctx; startIndex: number; signal: AbortSignal }) => Promise<PaveReply>;
  search?: (q: { query: string; style: string; supports: string }) => Promise<Row[]>;
  addRule?: (topic: string) => Promise<RuleRow | null>;
  eraseRule?: (id: number) => Promise<void>;
  addGrown?: (g: Grown) => Promise<number | null>;
  undoGrown?: (id: number) => Promise<void>;
};

type Stretch = { id: number; start: number; len: number; source: Source; ctxBefore: Ctx; controller?: AbortController; dropped?: boolean };

export type Snapshot = {
  road: RoadTile[];
  pos: number;
  ctx: Ctx;
  pace: Pace;
  rules: RuleRow[];
  grown: Grown[];
  effect: EffectRecord | null;
  ended: "rome" | "exit" | "help" | null;
  moodAfter: string | null;
  stopped: boolean;
  waiting: "fork" | "toll" | "search" | null;
  stats: { llmTiles: number; fallbackTiles: number; replaced: number; late: number; rejects: number; unsafe: number };
};

export class RoadSession {
  readonly pack: Pack;
  private deps: Deps;
  private road: RoadTile[] = [];
  private stretches = new Map<number, Stretch>();
  private ctxEnd: Ctx;
  private pos = -1;
  private enteredAt = 0;
  private dwells: number[] = [];
  private skips: Record<string, number> = {};
  private rules: RuleRow[];
  private grown: Grown[];
  private effect: EffectRecord | null = null;
  private ended: Snapshot["ended"] = null;
  private moodAfter: string | null = null;
  private stopped = false;
  private lastChoice = -1;
  private nextId = 1;
  private searchSeq = 0;
  private stats = { llmTiles: 0, fallbackTiles: 0, replaced: 0, late: 0, rejects: 0, unsafe: 0 };
  private listeners = new Set<() => void>();
  private snap!: Snapshot;

  constructor(pack: Pack, deps: Deps, init: { rules?: RuleRow[]; grown?: Grown[] } = {}) {
    this.pack = pack;
    this.deps = deps;
    this.rules = init.rules ?? [];
    this.grown = (init.grown ?? []).filter((g) => g.name !== "merch-board");
    this.ctxEnd = { ...emptyCtx(pack), avoid: this.rules.map((r) => r.topic), grown: this.grown };
    this.emit();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snap;
  ctx = () => this.ctxEnd;

  private emit() {
    const last = this.road.at(-1);
    const waiting: Snapshot["waiting"] =
      last?.tile.kind === "fork" && last.chosen === undefined ? "fork" : last?.tile.kind === "toll-booth" && !last.state ? "toll" : last?.tile.kind === "search" && !this.ctxEnd.seen.includes("results:done") ? "search" : null;
    this.snap = { road: [...this.road], pos: this.pos, ctx: this.ctxEnd, pace: this.ctxEnd.pace, rules: [...this.rules], grown: [...this.grown], effect: this.effect, ended: this.ended, moodAfter: this.moodAfter, stopped: this.stopped, waiting, stats: { ...this.stats } };
    for (const l of this.listeners) l();
  }

  // ---- start -----------------------------------------------------------------------------------------------
  start() {
    const r = compile(this.pack.opening(), this.ctxEnd, this.pack, "engine");
    this.deps.trace({ stage: "compile", source: "opening", ok: r.ok, errors: r.errors, tiles: r.tiles.length });
    if (!r.ok) {
      this.stats.unsafe++;
      this.emit();
      return;
    }
    this.appendStretch(r.tiles, "opening", this.ctxEnd, r.ctxAfter);
    this.visit(0);
  }

  setMood(when: "before" | "after", mood: string) {
    if (when === "before") this.ctxEnd = { ...this.ctxEnd, mood };
    else this.moodAfter = mood;
    this.deps.trace({ stage: "mood", when, mood });
    if (when === "after" && this.effect) this.ended = "rome";
    this.emit();
  }

  // ---- horse -----------------------------------------------------------------------------------------------
  visit(index: number, t = this.deps.now()) {
    if (index === this.pos || index < 0 || index >= this.road.length) return;
    if (index < this.pos) {
      this.deps.trace({ stage: "horse", event: "backtrack", from: this.pos, to: index });
      this.pos = index;
      this.enteredAt = t;
      this.emit();
      return;
    }
    if (this.pos >= 0) {
      const dwell = t - this.enteredAt;
      const left = this.road[this.pos];
      this.dwells.push(dwell);
      const pace = paceOf(this.dwells);
      const topic = skipTopic(this.pack, this.ctxEnd, left.tile);
      if (topic && isSkip(dwell) && !this.ctxEnd.avoid.includes(topic)) {
        this.skips[topic] = (this.skips[topic] ?? 0) + 1;
        this.deps.trace({ stage: "horse", event: "skip", topic, count: this.skips[topic], dwell: Math.round(dwell) });
        if (this.skips[topic] >= SKIPS_FOR_RULE) void this.addRule(topic);
      }
      if (pace !== this.ctxEnd.pace) {
        this.ctxEnd = { ...this.ctxEnd, pace };
        this.deps.trace({ stage: "horse", event: "pace", pace, dwell: Math.round(dwell) });
      }
    }
    this.pos = index;
    this.enteredAt = t;
    this.ensureAhead();
    this.emit();
  }

  // ---- paving ----------------------------------------------------------------------------------------------
  private canExtend(): boolean {
    if (this.ended) return false;
    const last = this.road.at(-1);
    if (!last) return false;
    const k = last.tile.kind;
    if (k === "fork" && last.chosen === undefined) return false;
    if (k === "toll-booth" && !last.state) return false;
    if (k === "search" && !this.ctxEnd.seen.includes("results:done")) return false;
    if (k === "campfire" || k === "help") return false;
    if (k === "toll-booth" && last.state === "confirmed") return false;
    return true;
  }

  private ensureAhead() {
    let guard = 0;
    while (this.road.length - 1 - this.pos < LOOKAHEAD && this.canExtend() && guard++ < 6) {
      const src = this.pack.fallback(this.ctxEnd);
      if (!src) break;
      const r = compile(src, this.ctxEnd, this.pack, "engine");
      this.deps.trace({ stage: "compile", source: "fallback", ok: r.ok, errors: r.errors, src, startIndex: this.road.length });
      if (!r.ok) {
        this.stats.unsafe++; // never rendered; counted as an engine bug
        break;
      }
      const id = this.appendStretch(r.tiles, "fallback", this.ctxEnd, r.ctxAfter);
      this.requestLLM(id);
    }
  }

  private appendStretch(tiles: Tile[], source: Source, before: Ctx, after: Ctx): number {
    const id = this.nextId++;
    const start = this.road.length;
    tiles.forEach((tile) => this.road.push({ id: this.nextId++, tile, source, stretch: id }));
    this.stretches.set(id, { id, start, len: tiles.length, source, ctxBefore: before });
    this.ctxEnd = after;
    if (source === "fallback") this.stats.fallbackTiles += tiles.length;
    if (source === "llm") this.stats.llmTiles += tiles.length;
    this.onAppended(start);
    return id;
  }

  private onAppended(from: number) {
    for (let i = from; i < this.road.length; i++) {
      const t = this.road[i].tile;
      if (t.kind === "search") void this.runSearch(i, t);
    }
  }

  private requestLLM(stretchId: number) {
    const s = this.stretches.get(stretchId);
    if (!s || !this.deps.live || this.stopped) return;
    s.controller = new AbortController();
    const startIndex = s.start;
    this.deps
      .pave({ ctx: s.ctxBefore, startIndex, signal: s.controller.signal })
      .then((reply) => this.onPave(stretchId, reply))
      .catch((e) => this.deps.trace({ stage: "paver-error", startIndex, error: String(e) }));
  }

  private onPave(stretchId: number, reply: PaveReply) {
    const s = this.stretches.get(stretchId);
    if (!s || s.dropped) return;
    if (!reply.ok) {
      if (reply.stopped) this.stopped = true;
      this.emit();
      return;
    }
    // ROADLAB-2: the client compiles the LLM text again, with the same ctx, before it can render.
    const r = compile(reply.src, s.ctxBefore, this.pack, "llm");
    if (!r.ok) {
      this.stats.rejects++;
      this.deps.trace({ stage: "compile", source: "llm-client", ok: false, errors: r.errors, startIndex: s.start });
      return;
    }
    if (this.pos >= s.start || this.lastChoice >= s.start) {
      this.stats.late++;
      this.deps.trace({ stage: "late", startIndex: s.start, pos: this.pos });
      return;
    }
    this.dropFrom(s.start, false);
    this.ctxEnd = s.ctxBefore;
    this.stats.replaced++;
    const id = this.appendStretch(r.tiles, "llm", s.ctxBefore, r.ctxAfter);
    this.deps.trace({ stage: "replace", startIndex: s.start, fallbackLen: s.len, llmLen: r.tiles.length, stretch: id });
    for (const d of r.defs) void this.addGrown(d);
    this.ensureAhead();
    this.emit();
  }

  /** Drop every stretch starting at `start` or later (all unreached). Aborts their LLM calls. */
  private dropFrom(start: number, recompute = true) {
    for (const s of this.stretches.values())
      if (s.start >= start && !s.dropped) {
        s.dropped = true;
        s.controller?.abort();
        if (s.source === "fallback") this.stats.fallbackTiles -= s.len;
        if (s.source === "llm") this.stats.llmTiles -= s.len;
      }
    const first = [...this.stretches.values()].filter((s) => s.start === start).at(-1);
    this.road = this.road.slice(0, start);
    if (recompute && first) this.ctxEnd = first.ctxBefore;
  }

  /** Rules or grown tiles changed: re-pave every tile the user has not reached (and did not choose into). */
  private reroute(patch: (c: Ctx) => Ctx) {
    const cut = Math.max(this.pos, this.lastChoice) + 1;
    if (cut < this.road.length) {
      const s = this.stretches.get(this.road[cut].stretch)!;
      let c = s.ctxBefore;
      for (let i = s.start; i < cut; i++) c = applyTile(c, this.road[i].tile);
      if (s.start < cut) {
        s.controller?.abort(); // its LLM reply was written for the old, longer stretch
        const removed = s.len - (cut - s.start);
        if (s.source === "fallback") this.stats.fallbackTiles -= removed;
        if (s.source === "llm") this.stats.llmTiles -= removed;
        s.len = cut - s.start;
      }
      this.dropFrom(cut, false);
      this.ctxEnd = c;
      this.deps.trace({ stage: "reroute", from: cut });
    }
    this.ctxEnd = patch(this.ctxEnd);
    this.ensureAhead();
    this.emit();
  }

  // ---- forks, search ---------------------------------------------------------------------------------------
  choose(index: number, branch: number) {
    const rt = this.road[index];
    if (!rt || rt.tile.kind !== "fork" || rt.chosen !== undefined || index !== this.road.length - 1) return;
    const fork = rt.tile;
    if (branch < 0 || branch >= fork.branches.length) return;
    const r = chooseBranch(this.pack, this.ctxEnd, fork, branch);
    this.road[index] = { ...rt, chosen: branch };
    const id = this.nextId++;
    this.road.push({ id: this.nextId++, tile: r.lead, source: "lead", stretch: id });
    this.stretches.set(id, { id, start: index + 1, len: 1, source: "lead", ctxBefore: this.ctxEnd });
    this.ctxEnd = r.ctx;
    this.lastChoice = index + 1;
    this.deps.trace({ stage: "choose", key: fork.key, value: r.value, label: fork.branches[branch].label, index });
    this.ensureAhead();
    this.emit();
  }

  private async runSearch(index: number, tile: Extract<Tile, { kind: "search" }>) {
    if (!this.deps.search) return;
    const seq = ++this.searchSeq;
    const stretch = this.road[index]?.stretch;
    let rows: Row[] = [];
    try {
      rows = await this.deps.search({ query: tile.query, style: tile.style, supports: tile.supports });
    } catch (e) {
      this.deps.trace({ stage: "search-error", error: String(e) });
    }
    // Ignore results for a search tile that was replaced or dropped meanwhile.
    if (seq !== this.searchSeq || this.road[index]?.stretch !== stretch || this.road[index]?.tile !== tile) return;
    this.ctxEnd = { ...this.ctxEnd, results: rows, seen: [...this.ctxEnd.seen, "results:done"] };
    this.deps.trace({ stage: "results", n: rows.length, ids: rows.map((r) => r.id) });
    this.ensureAhead();
    this.emit();
  }

  // ---- toll booth: the only place effects happen -----------------------------------------------------------
  /** Called only by a click on the toll booth (ROADLAB-1). Returns an error message, or null on success. */
  confirm(input: EffectInput): string | null {
    const idx = this.road.length - 1;
    const rt = this.road[idx];
    if (!rt || rt.tile.kind !== "toll-booth" || rt.state) return "no open toll booth";
    if (this.pos < idx) return "reach the toll booth first";
    const err = this.pack.effect.validate(this.ctxEnd, input);
    if (err) {
      this.deps.trace({ stage: "effect-refused", why: err });
      return err;
    }
    const params = this.pack.effect.params(this.ctxEnd, input);
    this.effect = { name: this.pack.effect.name, params, at: this.deps.now(), cause: "click" };
    this.road[idx] = { ...rt, state: "confirmed" };
    this.ctxEnd = { ...this.ctxEnd, tollConfirmed: true };
    this.deps.trace({ stage: "effect", effect: this.effect.name, params, cause: "click" });
    if (this.pack.effect.name === "save-pick") {
      const row = this.ctxEnd.results.find((r) => r.id === String(params.print)) ?? null;
      void this.deps.addGrown?.({ name: "merch-board", form: `(deftile merch-board () (pick ${params.print}))`, data: row });
    }
    const c = compile("(stretch (campfire))", this.ctxEnd, this.pack, "engine");
    if (c.ok) this.appendStretch(c.tiles, "engine", this.ctxEnd, c.ctxAfter);
    this.emit();
    return null;
  }

  decline() {
    const idx = this.road.length - 1;
    const rt = this.road[idx];
    if (!rt || rt.tile.kind !== "toll-booth" || rt.state) return;
    this.road[idx] = { ...rt, state: "declined" };
    this.ctxEnd = declineCtx(this.ctxEnd);
    this.lastChoice = idx;
    this.deps.trace({ stage: "decline" });
    this.ensureAhead();
    this.emit();
  }

  /** Finance: change the account at the toll booth. Pending setup is revoked; limits must be shown again. */
  realign(key: string) {
    const idx = this.road.length - 1;
    const rt = this.road[idx];
    if (!rt || rt.tile.kind !== "toll-booth" || rt.state || !this.ctxEnd.choices[key]) return;
    this.road[idx] = { ...rt, state: "revoked" };
    this.deps.trace({ stage: "revoke", key, was: this.ctxEnd.choices[key] });
    this.ctxEnd = realignCtx(this.ctxEnd, key);
    this.lastChoice = idx;
    this.ensureAhead();
    this.emit();
  }

  // ---- exits -----------------------------------------------------------------------------------------------
  crisis() {
    if (!this.pack.crisisExit) return;
    this.dropFrom(this.pos + 1, false);
    this.ctxEnd = { ...this.ctxEnd, crisis: true };
    const r = compile("(stretch (help))", this.ctxEnd, this.pack, "engine");
    this.deps.trace({ stage: "crisis-exit", ok: r.ok });
    if (r.ok) this.appendStretch(r.tiles, "engine", this.ctxEnd, r.ctxAfter);
    this.ended = "help";
    this.emit();
  }

  exit() {
    this.ended = "exit";
    for (const s of this.stretches.values()) s.controller?.abort();
    this.deps.trace({ stage: "exit", pos: this.pos });
    this.emit();
  }

  // ---- rules and grown tiles -------------------------------------------------------------------------------
  private async addRule(topic: string) {
    if (this.rules.some((r) => r.topic === topic)) return;
    if (this.pack.protectedTopics.includes(topic)) {
      this.deps.trace({ stage: "rule-refused", topic });
      return;
    }
    const row = (await this.deps.addRule?.(topic)) ?? { id: -Date.now(), topic, form: `(avoid ${topic})` };
    this.rules = [...this.rules, row];
    this.deps.trace({ stage: "rule", topic, form: row.form, id: row.id });
    this.reroute((c) => ({ ...c, avoid: [...new Set([...c.avoid, topic])] }));
  }

  async eraseRule(id: number) {
    const rule = this.rules.find((r) => r.id === id);
    if (!rule) return;
    await this.deps.eraseRule?.(id);
    this.rules = this.rules.filter((r) => r.id !== id);
    this.skips[rule.topic] = 0;
    this.deps.trace({ stage: "rule-erased", topic: rule.topic, id });
    this.reroute((c) => ({ ...c, avoid: c.avoid.filter((t) => t !== rule.topic) }));
  }

  private async addGrown(g: Grown) {
    if (this.grown.some((x) => x.name === g.name)) return;
    const id = (await this.deps.addGrown?.(g)) ?? undefined;
    this.grown = [...this.grown, { ...g, id }];
    this.ctxEnd = { ...this.ctxEnd, grown: this.grown };
    this.deps.trace({ stage: "grown", name: g.name, form: g.form, id });
    this.emit();
  }

  async undoGrown(id: number) {
    const g = this.grown.find((x) => x.id === id);
    if (!g) return;
    await this.deps.undoGrown?.(id);
    this.grown = this.grown.filter((x) => x.id !== id);
    this.deps.trace({ stage: "grown-undone", name: g.name, id });
    this.reroute((c) => ({ ...c, grown: this.grown }));
  }
}

export type { Verdict };
