import { getPack } from "@/app/prototypes/road-lab/packs";
import { getRun, trace } from "@/app/prototypes/road-lab/server/db";
import { bad, body, json, safe } from "@/app/prototypes/road-lab/server/http";
import { searchPrintables } from "@/app/prototypes/road-lab/server/printables";

export const POST = safe(async (req: Request) => {
  const b = await body(req);
  const run = getRun(Number(b.run));
  if (!run) return bad("unknown run", 404);
  if (!getPack(run.pack)?.hasSearch) return bad("this pack has no search tool", 403);
  const query = typeof b.query === "string" ? b.query.slice(0, 60) : "";
  if (!/^[a-z0-9 -]{2,60}$/i.test(query)) return bad("bad query");
  const t0 = Date.now();
  try {
    const r = await searchPrintables(query, req.signal);
    trace(run.id, [{ stage: "search", query, ms: Date.now() - t0, total: r.total, kept: r.rows.length, dropped: r.dropped.slice(0, 30) }]);
    return json({ rows: r.rows });
  } catch (e) {
    trace(run.id, [{ stage: "search-error", query, error: String(e) }]);
    return bad(`search failed: ${e instanceof Error ? e.message : e}`, 502);
  }
});
