import { control, latestRun, setControl, trace } from "@/app/prototypes/road-lab/server/db";
import { body, json, packOr400, safe } from "@/app/prototypes/road-lab/server/http";

/** The phone polls this. The brain view POSTs a pack to swap the road live. */
export const GET = safe(async () => json({ pack: control("pack"), nonce: Number(control("nonce") ?? 0) }));

export const POST = safe(async (req: Request) => {
  const pack = packOr400((await body(req)).pack);
  if (pack instanceof Response) return pack;
  const nonce = Number(control("nonce") ?? 0) + 1;
  setControl("pack", pack.id);
  setControl("nonce", String(nonce));
  const run = latestRun();
  if (run) trace(run.id, [{ stage: "pack-swap", to: pack.id }]);
  return json({ pack: pack.id, nonce });
});
