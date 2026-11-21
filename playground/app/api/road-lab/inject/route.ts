import { compile, emptyCtx } from "@/app/prototypes/road-lab/engine/compiler";
import { getPack } from "@/app/prototypes/road-lab/packs";
import { latestRun, trace } from "@/app/prototypes/road-lab/server/db";
import { bad, body, json, safe } from "@/app/prototypes/road-lab/server/http";
import type { Ctx } from "@/app/prototypes/road-lab/types";

/** Brain view demo: run a known-bad stretch through the SAME compile path with the live run's ctx (ROADLAB-2). */
export const POST = safe(async (req: Request) => {
  const b = await body(req);
  const run = latestRun();
  if (!run) return bad("no run yet", 404);
  const pack = getPack(run.pack);
  if (!pack) return bad("unknown pack");
  const inj = pack.injects.find((i) => i.id === b.case) ?? pack.injects[0];
  const live = run.ctx ? (JSON.parse(run.ctx) as Ctx) : emptyCtx(pack);
  const r = compile(inj.src, inj.ctx(live), pack, "llm");
  trace(run.id, [{ stage: "compile", source: "inject", case: inj.id, label: inj.label, ok: r.ok, errors: r.errors, src: inj.src }]);
  return json({ case: inj.id, ok: r.ok, errors: r.errors });
});
