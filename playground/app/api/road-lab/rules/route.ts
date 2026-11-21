import { db, latestRun, trace } from "@/app/prototypes/road-lab/server/db";
import { bad, body, deviceOf, json, packOr400, safe } from "@/app/prototypes/road-lab/server/http";

export const GET = safe(async (req: Request) => {
  const u = new URL(req.url).searchParams;
  const rows = db()
    .prepare("SELECT id, pack, topic, form, source, created_at FROM rules WHERE erased_at IS NULL AND (? IS NULL OR device = ?) AND (? IS NULL OR pack = ?) ORDER BY id")
    .all(u.get("device"), u.get("device"), u.get("pack"), u.get("pack"));
  return json(rows);
});

export const POST = safe(async (req: Request) => {
  const b = await body(req);
  const pack = packOr400(b.pack);
  if (pack instanceof Response) return pack;
  const device = deviceOf(b.device);
  const topic = typeof b.topic === "string" ? b.topic : "";
  if (!device) return bad("device required");
  if (!pack.topics.includes(topic)) return bad(`unknown topic ${topic}`);
  const run = latestRun();
  if (pack.protectedTopics.includes(topic)) {
    if (run) trace(run.id, [{ stage: "rule-refused", topic, why: "protected by pack" }]);
    return bad(`${topic} is protected by the ${pack.id} pack and cannot be avoided`, 409);
  }
  const existing = db().prepare("SELECT id FROM rules WHERE erased_at IS NULL AND device = ? AND pack = ? AND topic = ?").get(device, pack.id, topic) as { id: number } | undefined;
  if (existing) return json({ id: existing.id, form: `(avoid ${topic})` });
  const form = `(avoid ${topic})`;
  const r = db().prepare("INSERT INTO rules (pack, device, topic, form, source, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(pack.id, device, topic, form, String(b.source ?? "skip"), Date.now());
  return json({ id: Number(r.lastInsertRowid), form });
});

export const DELETE = safe(async (req: Request) => {
  const id = Number(new URL(req.url).searchParams.get("id"));
  const r = db().prepare("UPDATE rules SET erased_at = ? WHERE id = ? AND erased_at IS NULL").run(Date.now(), id);
  return r.changes ? json({ ok: true }) : bad("unknown rule", 404);
});
