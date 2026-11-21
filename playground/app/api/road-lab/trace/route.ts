import { db, getRun, latestRun, trace, type TraceEvent } from "@/app/prototypes/road-lab/server/db";
import { bad, body, json, safe } from "@/app/prototypes/road-lab/server/http";

export const GET = safe(async (req: Request) => {
  const u = new URL(req.url).searchParams;
  const run = u.get("run") && u.get("run") !== "latest" ? getRun(Number(u.get("run"))) : latestRun();
  if (!run) return json({ run: null, events: [] });
  const rows = db().prepare("SELECT id, t, stage, json FROM trace WHERE run_id = ? AND id > ? ORDER BY id LIMIT 500").all(run.id, Number(u.get("since") ?? 0)) as { id: number; t: number; stage: string; json: string }[];
  return json({ run: { ...run, ctx: run.ctx ? JSON.parse(run.ctx) : null }, events: rows.map((r) => ({ id: r.id, t: r.t, stage: r.stage, ...JSON.parse(r.json) })) });
});

export const POST = safe(async (req: Request) => {
  const b = await body(req);
  const run = getRun(Number(b.run));
  if (!run) return bad("unknown run", 404);
  const events = Array.isArray(b.events) ? (b.events as TraceEvent[]).filter((e) => e && typeof e.stage === "string").slice(0, 200) : [];
  trace(run.id, events);
  return json({ ok: true, n: events.length });
});
