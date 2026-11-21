// Lab runner: drives the real RoadSession with personas on a virtual clock.
// Sim mode: a simulated paver (pack fallback text with injected faults, lognormal latency) goes through the real
// paveStretch + compiler. Live mode: real Gemini calls; their measured latency is placed on the virtual clock.
import fs from "node:fs";
import path from "node:path";
import { RoadSession, type PaveReply, type TraceEvent } from "../engine/session";
import { PACK_IDS, PACKS } from "../packs";
import { SLOTS } from "../packs/sun-life";
import { generate, PAVER_MODEL } from "../server/gemini";
import { loadRootEnv } from "../server/env";
import { paveStretch, type Generate } from "../server/paver";
import type { Ctx, PackId, Row } from "../types";
import { ROWS } from "./fixtures";

export type Persona = { name: string; tile: number; fork: number; toll: number; pickBranch: number | "random"; switchAt?: number; to?: { tile: number; fork: number } };
export const PERSONAS: Record<string, Persona> = {
  rusher: { name: "rusher", tile: 350, fork: 900, toll: 1500, pickBranch: 0 },
  steady: { name: "steady", tile: 1200, fork: 2000, toll: 3000, pickBranch: "random" },
  lingerer: { name: "lingerer", tile: 3000, fork: 4000, toll: 6000, pickBranch: 1 },
  switcher: { name: "switcher", tile: 350, fork: 900, toll: 3000, pickBranch: "random", switchAt: 5, to: { tile: 3000, fork: 4000 } },
};

const FAULTS = [
  "(stretch (toll-booth))",
  '(stretch (signpost "Zero fees guaranteed" :topic saving))',
  '(stretch (popup-ad "Limited offer"))',
  '(stretch (fork (branch "A" :lead (fog)) (branch "B" :lead (fog)) (branch "C" :lead (fog)) (branch "D" :lead (fog))))',
  "(stretch (signpost compounding :effect contribute))",
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const logn = (r: () => number, med: number, sig = 0.35) => med * Math.exp(sig * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()));

export type Summary = {
  id: string;
  pack: PackId;
  persona: string;
  mode: "sim" | "live";
  model: string;
  seed: number;
  reached_rome: boolean;
  tiles_to_rome: number;
  time_s: number;
  stall_s: number;
  llm_coverage: number;
  pave_calls: number;
  attempts: number;
  rewrites: number;
  rejects_by_invariant: Record<string, number>;
  replaced: number;
  late: number;
  fallback_tiles_seen: number;
  llm_tiles_seen: number;
  unsafe_on_road: number;
  effects_without_click: number;
  rules_added: string[];
  paver_ms_p50: number;
  paver_ms_p95: number;
  stopped: boolean;
};

export async function runOne(packId: PackId, personaName: string, opts: { live: boolean; seed: number; outDir?: string }): Promise<Summary> {
  if (opts.live) loadRootEnv();
  const pack = PACKS[packId];
  const P = PERSONAS[personaName];
  const r = rng(opts.seed);
  let t = 0;
  const events: (TraceEvent & { t: number })[] = [];
  const queue: { at: number; fire: () => void }[] = [];
  const work: Promise<void>[] = [];
  const paverMs: number[] = [];
  let attempts = 0;
  let calls = 0;
  const rejects: Record<string, number> = {};

  const simGen = (ctx: Ctx): Generate => {
    let n = 0;
    return async () => {
      n++;
      const ms = Math.round(logn(r, 850));
      const fault = n === 1 && r() < 0.2;
      const text = fault ? FAULTS[Math.floor(r() * FAULTS.length)] : (pack.fallback(ctx) ?? "(stretch (fog))");
      return { ok: true, text, ms, inTok: 900, outTok: Math.ceil(text.length / 4) };
    };
  };

  const session = new RoadSession(pack, {
    live: true,
    now: () => t,
    trace: (e) => events.push({ ...e, t }),
    pave: ({ ctx }) =>
      new Promise<PaveReply>((resolve) => {
        const issued = t;
        calls++;
        work.push(
          (async () => {
            const res = await paveStretch(pack, ctx, { gen: opts.live ? (o) => generate({ ...o, model: PAVER_MODEL }) : simGen(ctx) });
            const ms = res.attempts.reduce((a, x) => a + x.ms, 0);
            paverMs.push(ms);
            attempts += res.attempts.length;
            for (const a of res.attempts) for (const e of a.errors) rejects[e.inv] = (rejects[e.inv] ?? 0) + 1;
            events.push({ stage: "paver", t: issued, ms, attempts: res.attempts.length, ok: res.ok });
            queue.push({ at: issued + ms, fire: () => resolve(res.ok ? { ok: true, src: res.src } : { ok: false, stopped: res.stopped, error: res.error }) });
          })(),
        );
      }),
    search: (q) =>
      new Promise<Row[]>((resolve) => {
        const rows = ROWS[q.query] ?? ROWS.horse;
        queue.push({ at: t + Math.round(logn(r, 900)), fire: () => resolve(rows) });
      }),
    addRule: async (topic) => ({ id: Math.floor(r() * 1e6), topic, form: `(avoid ${topic})` }),
    addGrown: async () => Math.floor(r() * 1e6),
  });

  const settle = async () => {
    while (work.length) await Promise.all(work.splice(0));
    await new Promise((res) => setImmediate(res));
  };
  const advanceTo = async (target: number) => {
    for (;;) {
      await settle();
      queue.sort((a, b) => a.at - b.at);
      const next = queue[0];
      if (!next || next.at > target) break;
      queue.shift();
      t = Math.max(t, next.at);
      next.fire();
      await new Promise((res) => setImmediate(res));
    }
    t = Math.max(t, target);
  };

  session.start();
  if (pack.moodQuestion) session.setMood("before", "stressed");
  let stall = 0;
  const visited = new Set<number>();
  const seenSource: Record<string, number> = {};
  for (let step = 0; step < 200; step++) {
    await settle();
    const snap = session.getSnapshot();
    if (snap.ended) break;
    const cur = snap.road[snap.pos];
    if (!visited.has(cur.id)) {
      visited.add(cur.id);
      seenSource[cur.source] = (seenSource[cur.source] ?? 0) + 1;
    }
    const persona = P.switchAt !== undefined && snap.pos >= P.switchAt ? { ...P, ...P.to } : P;
    const dwell = logn(r, cur.tile.kind === "fork" ? persona.fork : cur.tile.kind === "toll-booth" ? P.toll : persona.tile, 0.25);
    await advanceTo(t + dwell);
    const now = session.getSnapshot();
    const last = now.road.length - 1;
    if (cur.tile.kind === "fork" && snap.pos === last && now.road[snap.pos].chosen === undefined) {
      const n = cur.tile.branches.length;
      const b = P.pickBranch === "random" ? Math.floor(r() * n) : Math.min(P.pickBranch, n - 1);
      session.choose(snap.pos, b);
      continue;
    }
    if (cur.tile.kind === "toll-booth" && !now.road[snap.pos].state) {
      const ctx = session.ctx();
      const input = pack.effect.name === "contribute" ? { amount: 40 } : pack.effect.name === "book" ? { slot: SLOTS[0] } : {};
      const err = session.confirm(input);
      if (err) events.push({ stage: "lab-error", t, error: err });
      void ctx;
      continue;
    }
    if (cur.tile.kind === "campfire") {
      session.setMood("after", "okay");
      break;
    }
    if (snap.pos + 1 < now.road.length) {
      session.visit(snap.pos + 1, t);
      continue;
    }
    // Road ends ahead and nothing waits on the user: a stall. Wait for the next paver/search event.
    await settle();
    queue.sort((a, b) => a.at - b.at);
    if (!queue.length) {
      events.push({ stage: "lab-deadlock", t, pos: snap.pos, waiting: now.waiting });
      break;
    }
    const before = t;
    await advanceTo(queue[0].at);
    stall += t - before;
  }
  await advanceTo(t + 20000);
  const snap = session.getSnapshot();
  const effectEvents = events.filter((e) => e.stage === "effect");
  const sorted = [...paverMs].sort((a, b) => a - b);
  const pct = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0);
  const llmSeen = seenSource.llm ?? 0;
  const fbSeen = seenSource.fallback ?? 0;
  const id = `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${packId}-${personaName}-${opts.live ? "live" : "sim"}-s${opts.seed}`;
  const summary: Summary = {
    id,
    pack: packId,
    persona: personaName,
    mode: opts.live ? "live" : "sim",
    model: opts.live ? PAVER_MODEL : "sim-paver(fallback+20% faults, lognormal 850ms)",
    seed: opts.seed,
    reached_rome: snap.ended === "rome",
    tiles_to_rome: snap.road.length,
    time_s: +(t / 1000).toFixed(1),
    stall_s: +(stall / 1000).toFixed(2),
    llm_coverage: llmSeen + fbSeen ? +(llmSeen / (llmSeen + fbSeen)).toFixed(2) : 0,
    pave_calls: calls,
    attempts,
    rewrites: Math.max(0, attempts - calls),
    rejects_by_invariant: rejects,
    replaced: snap.stats.replaced,
    late: snap.stats.late,
    fallback_tiles_seen: fbSeen,
    llm_tiles_seen: llmSeen,
    unsafe_on_road: snap.stats.unsafe,
    effects_without_click: effectEvents.filter((e) => e.cause !== "click").length,
    rules_added: events.filter((e) => e.stage === "rule").map((e) => String(e.form)),
    paver_ms_p50: pct(0.5),
    paver_ms_p95: pct(0.95),
    stopped: snap.stopped,
  };
  if (opts.outDir) {
    const dir = path.join(opts.outDir, id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(dir, "trace.jsonl"), events.map((e) => JSON.stringify(e)).join("\n"));
    fs.writeFileSync(path.join(dir, "report.md"), report(summary, snap.road.map((x) => `${x.source.padEnd(8)} ${JSON.stringify(x.tile).slice(0, 140)}`)));
  }
  return summary;
}

function report(s: Summary, road: string[]): string {
  return `# ${s.id}

| metric | value |
|---|---|
${Object.entries(s)
  .filter(([k]) => k !== "id")
  .map(([k, v]) => `| ${k} | ${typeof v === "object" ? JSON.stringify(v) : v} |`)
  .join("\n")}

## Road (source, tile)
\`\`\`
${road.join("\n")}
\`\`\`
`;
}

const RUNS_DIR = path.join(process.cwd(), "app/prototypes/road-lab/lab/runs");

export async function runCommand(args: string[]) {
  const live = args.includes("--live");
  const seedArg = args.indexOf("--seed");
  const seed = seedArg >= 0 ? Number(args[seedArg + 1]) : 1;
  const [packArg = "all", personaArg = "all"] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--seed");
  const packs = packArg === "all" ? PACK_IDS : [packArg as PackId];
  const personas = personaArg === "all" ? Object.keys(PERSONAS) : [personaArg];
  const rows: Summary[] = [];
  for (const p of packs)
    for (const per of personas) {
      if (!PACKS[p] || !PERSONAS[per]) throw new Error(`unknown pack/persona ${p}/${per}`);
      const s = await runOne(p, per, { live, seed, outDir: RUNS_DIR });
      rows.push(s);
      console.log(
        `${s.pack.padEnd(12)} ${s.persona.padEnd(9)} ${s.mode} rome=${s.reached_rome ? "yes" : "NO "} tiles=${String(s.tiles_to_rome).padStart(2)} time=${s.time_s}s stall=${s.stall_s}s llm_cov=${s.llm_coverage} calls=${s.pave_calls} rewrites=${s.rewrites} replaced=${s.replaced} late=${s.late} p50=${s.paver_ms_p50}ms rules=${s.rules_added.join(",") || "-"} unsafe=${s.unsafe_on_road} no_click_effects=${s.effects_without_click} rejects=${JSON.stringify(s.rejects_by_invariant)} → runs/${s.id}`,
      );
    }
  const bad = rows.filter((s) => s.unsafe_on_road || s.effects_without_click || !s.reached_rome);
  console.log(`\n${rows.length} run(s); unsafe_on_road total=${rows.reduce((a, s) => a + s.unsafe_on_road, 0)}; effects_without_click total=${rows.reduce((a, s) => a + s.effects_without_click, 0)}; not at Rome=${rows.filter((s) => !s.reached_rome).length}`);
  if (bad.length) process.exitCode = 1;
}

export function compareCommand(args: string[]) {
  const [a, b] = args;
  const load = (id: string) => JSON.parse(fs.readFileSync(path.join(RUNS_DIR, id, "summary.json"), "utf8")) as Summary;
  const A = load(a);
  const B = load(b);
  console.log(`| metric | ${a} | ${b} | Δ |\n|---|---|---|---|`);
  for (const k of Object.keys(A) as (keyof Summary)[]) {
    const x = A[k];
    const y = B[k];
    const d = typeof x === "number" && typeof y === "number" ? (y - x).toFixed(2) : x === y ? "" : "changed";
    console.log(`| ${k} | ${typeof x === "object" ? JSON.stringify(x) : x} | ${typeof y === "object" ? JSON.stringify(y) : y} | ${d} |`);
  }
}
