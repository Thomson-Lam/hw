import { compile, emptyCtx } from "@/app/prototypes/road-lab/engine/compiler";
import { db } from "@/app/prototypes/road-lab/server/db";
import { bad, body, deviceOf, json, packOr400, safe } from "@/app/prototypes/road-lab/server/http";

export const GET = safe(async (req: Request) => {
  const u = new URL(req.url).searchParams;
  const rows = db()
    .prepare("SELECT id, pack, name, form, data, created_at FROM grown_tiles WHERE undone_at IS NULL AND (? IS NULL OR device = ?) AND (? IS NULL OR pack = ?) ORDER BY id")
    .all(u.get("device"), u.get("device"), u.get("pack"), u.get("pack")) as { data: string | null }[];
  return json(rows.map((r) => ({ ...r, data: r.data ? JSON.parse(r.data) : null })));
});

export const POST = safe(async (req: Request) => {
  const b = await body(req);
  const pack = packOr400(b.pack);
  if (pack instanceof Response) return pack;
  const device = deviceOf(b.device);
  const name = typeof b.name === "string" ? b.name : "";
  const form = typeof b.form === "string" ? b.form : "";
  if (!device) return bad("device required");
  // The merch board is written by the save-pick effect; every other grown tile must compile as a deftile.
  if (name !== "merch-board") {
    const r = compile(`${form} (stretch (fog))`, emptyCtx(pack), pack, "engine");
    if (!r.ok || r.defs.length !== 1 || r.defs[0].name !== name) return bad(`grown tile rejected: ${r.errors.map((e) => e.msg).join("; ") || "not one deftile"}`, 422);
  }
  const res = db().prepare("INSERT INTO grown_tiles (pack, device, name, form, data, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(pack.id, device, name, form, b.data ? JSON.stringify(b.data) : null, Date.now());
  return json({ id: Number(res.lastInsertRowid) });
});

export const DELETE = safe(async (req: Request) => {
  const id = Number(new URL(req.url).searchParams.get("id"));
  const r = db().prepare("UPDATE grown_tiles SET undone_at = ? WHERE id = ? AND undone_at IS NULL").run(Date.now(), id);
  return r.changes ? json({ ok: true }) : bad("unknown tile", 404);
});
