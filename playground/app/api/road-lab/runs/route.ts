import { db, getRun, latestRun, setControl, trace } from "@/app/prototypes/road-lab/server/db";
import { bad, body, deviceOf, json, packOr400, safe } from "@/app/prototypes/road-lab/server/http";

export const POST = safe(async (req: Request) => {
  const b = await body(req);
  const pack = packOr400(b.pack);
  if (pack instanceof Response) return pack;
  const device = deviceOf(b.device);
  if (!device) return bad("device required");
  const r = db().prepare("INSERT INTO runs (pack, device, started_at) VALUES (?, ?, ?)").run(pack.id, device, Date.now());
  const id = Number(r.lastInsertRowid);
  setControl("pack", pack.id);
  trace(id, [{ stage: "run-start", pack: pack.id, rome: pack.romePredicate, invariants: pack.invariants.map((i) => i.id) }]);
  return json({ id });
});

export const GET = safe(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id");
  const run = id ? getRun(Number(id)) : latestRun();
  return run ? json({ ...run, ctx: run.ctx ? JSON.parse(run.ctx) : null }) : json(null);
});

const FIELDS = ["mood_before", "mood_after", "reached_rome", "ended_at", "ctx"] as const;

export const PATCH = safe(async (req: Request) => {
  const b = await body(req);
  const run = getRun(Number(b.id));
  if (!run) return bad("unknown run", 404);
  for (const f of FIELDS) {
    if (!(f in b)) continue;
    const v = f === "ctx" ? JSON.stringify(b[f]).slice(0, 200000) : (b[f] as string | number | null);
    db().prepare(`UPDATE runs SET ${f} = ? WHERE id = ?`).run(v, run.id);
  }
  return json({ ok: true });
});
