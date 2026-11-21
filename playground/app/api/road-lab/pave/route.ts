import { getPack } from "@/app/prototypes/road-lab/packs";
import { db, getRun, trace } from "@/app/prototypes/road-lab/server/db";
import { bad, body, json, safe } from "@/app/prototypes/road-lab/server/http";
import { paveStretch } from "@/app/prototypes/road-lab/server/paver";
import type { Ctx } from "@/app/prototypes/road-lab/types";

export const POST = safe(async (req: Request) => {
  const b = await body(req);
  const run = getRun(Number(b.run));
  if (!run) return bad("unknown run", 404);
  const pack = getPack(run.pack);
  const ctx = b.ctx as Ctx | undefined;
  if (!pack || !ctx || ctx.pack !== pack.id) return bad("ctx does not match the run's pack");
  const startIndex = Number(b.startIndex ?? -1);
  // ROADLAB-5: after a 401/402/403 this run never calls the model again.
  if (run.stopped) {
    trace(run.id, [{ stage: "paver-skip", startIndex, why: "stopped" }]);
    return json({ ok: false, stopped: true, error: "model calls stopped for this run" });
  }
  trace(run.id, [{ stage: "paver-request", startIndex, pace: ctx.pace, needs: pack.requirements(ctx).map((n) => n.id) }]);
  const r = await paveStretch(pack, ctx, { signal: req.signal });
  for (const a of r.attempts)
    trace(run.id, [{ stage: "compile", source: "llm", startIndex, attempt: a.n, ok: a.ok, errors: a.errors, ms: a.ms, inTok: a.inTok, outTok: a.outTok, model: r.model, src: a.src }]);
  if (!r.ok && r.stopped) {
    db().prepare("UPDATE runs SET stopped = 1 WHERE id = ?").run(run.id);
    trace(run.id, [{ stage: "paver-stop", error: r.error }]);
  }
  return json(r.ok ? { ok: true, src: r.src, attempts: r.attempts.length } : { ok: false, stopped: r.stopped, error: r.error, attempts: r.attempts.length });
});
