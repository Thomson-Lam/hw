// Compiler fixtures. Every invariant (universal + every pack) must have at least one fixture it rejects (ROADLAB-4).
import { compile, emptyCtx, UNIVERSAL_INVARIANTS } from "../engine/compiler";
import { choose } from "../engine/road";
import { PACKS } from "../packs";
import type { Ctx, Origin, PackId, Row, Tile } from "../types";
import rowsData from "./data/printables-horse.json";

export const ROWS: Record<string, Row[]> = (rowsData as { queries: Record<string, Row[]> }).queries;

type Fixture = { name: string; pack: PackId; ctx?: Partial<Ctx>; src: string; origin?: Origin; expect: "ok" | string };

const row = (id: string, over: Partial<Row> = {}): Row => ({ id, title: `Horse ${id}`, license: "Creative Commons — Attribution", likes: 10, stlBytes: 100000, stlFileId: "1", image: null, author: "maker", ...over });
const fin = { choices: { route: "fast" } };

export const FIXTURES: Fixture[] = [
  // universal: accepts
  { name: "valid signposts", pack: "canada-life", ctx: fin, src: '(stretch (signpost compounding) (signpost "Keep it simple" :topic saving))', expect: "ok" },
  { name: "valid grounded number", pack: "canada-life", ctx: fin, src: '(stretch (signpost "Your $300 a month" :topic saving))', expect: "ok" },
  { name: "valid grown tile", pack: "canada-life", ctx: fin, src: '(deftile milestone (label) (vista label)) (stretch (milestone "Year one"))', expect: "ok" },
  { name: "valid keyed fork", pack: "canada-life", ctx: fin, src: '(stretch (fork :key account (branch "TFSA" :value tfsa :lead (signpost tfsa-basics)) (branch "FHSA" :value fhsa :lead (fog))))', expect: "ok" },
  // universal: rejects
  { name: "syntax", pack: "canada-life", src: '(signpost "unclosed"', expect: "syntax" },
  { name: "size", pack: "canada-life", src: "(stretch " + "(fog) ".repeat(700) + ")", expect: "size" },
  { name: "no-noise", pack: "canada-life", src: '(stretch (popup-ad "Hot stock"))', expect: "no-noise" },
  { name: "engine-only", pack: "canada-life", src: "(stretch (campfire))", expect: "engine-only" },
  { name: "stretch-size", pack: "canada-life", ctx: { pace: "linger", budgetBonus: 10 }, src: "(stretch (fog) (fog) (fog) (fog) (fog))", expect: "stretch-size" },
  { name: "fork-arity", pack: "canada-life", src: '(stretch (fork (branch "A" :lead (fog)) (branch "B" :lead (fog)) (branch "C" :lead (fog)) (branch "D" :lead (fog))))', expect: "fork-arity" },
  { name: "fork-last", pack: "canada-life", src: '(stretch (fork (branch "A" :lead (fog)) (branch "B" :lead (fog))) (signpost compounding))', expect: "fork-last" },
  { name: "fork-values", pack: "canada-life", src: '(stretch (fork :key account (branch "Gold" :value gold :lead (fog)) (branch "TFSA" :value tfsa :lead (fog))))', expect: "fork-values" },
  { name: "lead-kind", pack: "canada-life", src: '(stretch (fork (branch "A" :lead (toll-booth)) (branch "B" :lead (fog))))', expect: "lead-kind" },
  { name: "no-silent-effect", pack: "canada-life", src: "(stretch (signpost compounding :effect contribute))", expect: "no-silent-effect" },
  { name: "unknown-fact", pack: "canada-life", src: "(stretch (signpost tfsa-magic))", expect: "unknown-fact" },
  { name: "unknown-topic", pack: "canada-life", src: '(stretch (signpost "Hello there" :topic gossip))', expect: "unknown-topic" },
  { name: "checkpoint-kind", pack: "canada-life", src: "(stretch (checkpoint low))", expect: "checkpoint-kind" },
  { name: "grounded-text claim", pack: "canada-life", src: '(stretch (signpost "Zero fees here" :topic saving))', expect: "grounded-text" },
  { name: "grounded-text number", pack: "canada-life", src: '(stretch (signpost "Put in $150" :topic saving))', expect: "grounded-text" },
  { name: "label-length", pack: "canada-life", src: '(stretch (signpost "one two three four five six seven" :topic saving))', expect: "label-length" },
  { name: "user-rule", pack: "canada-life", ctx: { avoid: ["stocks"] }, src: "(stretch (signpost stocks-basics))", expect: "user-rule" },
  { name: "user-rule exempts checkpoints", pack: "canada-life", ctx: { avoid: ["risk"] }, src: "(stretch (checkpoint risk))", expect: "ok" },
  { name: "all-roads-to-rome", pack: "canada-life", ctx: { pace: "rush", used: 7 }, src: "(stretch (signpost compounding))", expect: "all-roads-to-rome" },
  { name: "grown-tile bad body", pack: "canada-life", src: "(deftile spam (x) (popup-ad x)) (stretch (fog))", expect: "grown-tile" },
  { name: "grown-tile redefine", pack: "canada-life", src: "(deftile fork () (fog)) (stretch (fog))", expect: "grown-tile" },
  {
    name: "termination",
    pack: "canada-life",
    src: "(deftile t1 () (fog)) " + Array.from({ length: 9 }, (_, i) => `(deftile t${i + 2} () (t${i + 1}))`).join(" ") + " (stretch (t10))",
    expect: "termination",
  },
  // canada-life
  { name: "disclose-first", pack: "canada-life", ctx: { choices: { account: "tfsa" }, seen: ["fees", "limits", "limits@account=tfsa"] }, src: "(stretch (toll-booth))", expect: "disclose-first" },
  { name: "limits-first", pack: "canada-life", src: "(stretch (checkpoint limits))", expect: "limits-first" },
  { name: "goal-realign", pack: "canada-life", ctx: { choices: { account: "tfsa" }, seen: ["risk", "fees", "limits", "limits@account=fhsa"] }, src: "(stretch (toll-booth))", expect: "goal-realign" },
  { name: "limits-first in lead-in", pack: "canada-life", src: '(stretch (fork (branch "A" :lead (checkpoint limits)) (branch "B" :lead (fog))))', expect: "limits-first" },
  { name: "valid lead-in after choice", pack: "canada-life", src: '(stretch (fork :key account (branch "TFSA" :value tfsa :lead (checkpoint limits)) (branch "FHSA" :value fhsa :lead (fog))))', expect: "ok" },
  { name: "valid finance toll", pack: "canada-life", ctx: { choices: { account: "tfsa" }, seen: ["risk", "fees", "limits", "limits@account=tfsa"] }, src: "(stretch (toll-booth))", expect: "ok" },
  // sun-life
  { name: "no-diagnosis", pack: "sun-life", src: '(stretch (signpost "Sounds like anxiety to me" :topic talking))', expect: "no-diagnosis" },
  { name: "crisis-exit", pack: "sun-life", ctx: { crisis: true }, src: "(stretch (signpost plan-basics))", expect: "crisis-exit" },
  { name: "campfire past budget ok", pack: "canada-life", ctx: { pace: "rush", used: 30, tollConfirmed: true, choices: { account: "tfsa" }, seen: ["risk", "fees", "limits", "limits@account=tfsa", "toll"] }, src: "(stretch (campfire))", origin: "engine", expect: "ok" },
  { name: "help past budget ok", pack: "sun-life", ctx: { pace: "rush", used: 30, crisis: true }, src: "(stretch (help))", origin: "engine", expect: "ok" },
  { name: "crisis help ok", pack: "sun-life", ctx: { crisis: true }, src: "(stretch (help))", origin: "engine", expect: "ok" },
  { name: "no-surprise-cost", pack: "sun-life", ctx: { choices: { care: "counselling" }, seen: ["coverage", "coverage@care=counselling"] }, src: "(stretch (toll-booth))", expect: "no-surprise-cost" },
  { name: "valid booking toll", pack: "sun-life", ctx: { choices: { care: "physio" }, seen: ["coverage@care=physio", "cost@care=physio"] }, src: "(stretch (toll-booth))", expect: "ok" },
  // merch-trail
  { name: "real-results", pack: "merch-trail", ctx: { searched: true }, src: "(stretch (pick 123))", expect: "real-results" },
  { name: "merch-license", pack: "merch-trail", ctx: { searched: true, results: [row("7", { license: "Creative Commons — Attribution — Noncommercial" })] }, src: "(stretch (pick 7))", expect: "merch-license" },
  { name: "merch-license blocklist trap", pack: "merch-trail", ctx: { searched: true, results: [row("8", { license: "Standard Digital File License" })] }, src: "(stretch (pick 8))", expect: "merch-license" },
  { name: "phone-size", pack: "merch-trail", ctx: { searched: true, results: [row("9", { stlBytes: 9_000_000 })] }, src: "(stretch (pick 9))", expect: "phone-size" },
  { name: "pick-shown", pack: "merch-trail", ctx: { searched: true, results: [row("1"), row("2")], seen: ["pick:1"] }, src: '(stretch (fork :key pick (branch 1 :lead (vista "Your pick")) (branch 2 :lead (vista "Your pick"))))', expect: "pick-shown" },
  { name: "search-form", pack: "merch-trail", src: '(stretch (search "horse" :style huge :supports any))', expect: "search-form" },
  { name: "attribution", pack: "merch-trail", ctx: { searched: true, results: [row("1")], choices: { pick: "1" } }, src: "(stretch (toll-booth))", expect: "attribution" },
  { name: "valid pick", pack: "merch-trail", ctx: { searched: true, results: [row("1"), row("2")] }, src: "(stretch (pick 1) (pick 2))", expect: "ok" },
];

export function ctxFor(pack: PackId, patch: Partial<Ctx> = {}): Ctx {
  return { ...emptyCtx(PACKS[pack]), ...patch };
}

export type FixtureReport = { lines: string[]; failures: number; uncovered: string[] };

export function runFixtures(): FixtureReport {
  const lines: string[] = [];
  let failures = 0;
  const covered = new Set<string>();
  for (const f of FIXTURES) {
    const r = compile(f.src, ctxFor(f.pack, f.ctx), PACKS[f.pack], f.origin ?? "llm");
    const invs = r.errors.map((e) => e.inv);
    const pass = f.expect === "ok" ? r.ok : invs.includes(f.expect);
    if (pass && f.expect !== "ok") {
      covered.add(`${f.pack}:${f.expect}`);
      covered.add(`*:${f.expect}`);
    }
    if (!pass) failures++;
    lines.push(`${pass ? "PASS" : "FAIL"}  ${f.pack.padEnd(12)} ${f.name.padEnd(30)} expect=${f.expect.padEnd(18)} got=${r.ok ? "ok" : r.errors.map((e) => `${e.inv}: ${e.msg}`).join(" | ")}`);
  }
  // Pack injects must reject with their expected invariant through the same compile path.
  for (const p of Object.values(PACKS))
    for (const inj of p.injects) {
      const r = compile(inj.src, inj.ctx(ctxFor(p.id)), p, "llm");
      const pass = r.errors.some((e) => e.inv === inj.expect);
      if (!pass) failures++;
      lines.push(`${pass ? "PASS" : "FAIL"}  ${p.id.padEnd(12)} inject:${inj.id.padEnd(23)} expect=${inj.expect.padEnd(18)} got=${r.ok ? "ok" : r.errors.map((e) => e.inv).join(",")}`);
    }
  const required = [...Object.keys(UNIVERSAL_INVARIANTS).map((id) => `*:${id}`), ...Object.values(PACKS).flatMap((p) => p.invariants.map((i) => `${p.id}:${i.id}`))];
  const uncovered = required.filter((k) => !covered.has(k));
  failures += uncovered.length;
  return { lines, failures, uncovered };
}

/** Walk each pack to Rome with only the fallback paver and first-branch choices. Every stretch must compile. */
export function walkFallback(packId: PackId, pace: Ctx["pace"], pickBranch = 0): { ok: boolean; tiles: number; log: string[] } {
  const pack = PACKS[packId];
  const log: string[] = [];
  let ctx: Ctx = { ...ctxFor(packId), pace };
  const open = compile(pack.opening(), ctx, pack, "engine");
  if (!open.ok) return { ok: false, tiles: 0, log: [`opening rejected: ${open.errors.map((e) => e.msg).join("; ")}`] };
  ctx = open.ctxAfter;
  let last: Tile | undefined = open.tiles.at(-1);
  for (let step = 0; step < 30; step++) {
    if (last?.kind === "fork") {
      const idx = Math.min(pickBranch, last.branches.length - 1);
      ctx = choose(pack, ctx, last, idx).ctx;
    }
    if (last?.kind === "search") {
      const rows = ROWS[last.query] ?? ROWS.horse;
      ctx = { ...ctx, results: rows, seen: [...ctx.seen, "results:done"] };
    }
    if (last?.kind === "toll-booth") return { ok: true, tiles: ctx.used, log };
    const src = pack.fallback(ctx);
    if (!src) return { ok: false, tiles: ctx.used, log: [...log, "fallback returned null"] };
    const r = compile(src, ctx, pack, "engine");
    log.push(`${r.ok ? "ok " : "BAD"} ${src}${r.ok ? "" : "  ← " + r.errors.map((e) => e.inv + ": " + e.msg).join("; ")}`);
    if (!r.ok) return { ok: false, tiles: ctx.used, log };
    ctx = r.ctxAfter;
    last = r.tiles.at(-1);
  }
  return { ok: false, tiles: ctx.used, log: [...log, "no toll booth in 30 stretches"] };
}
