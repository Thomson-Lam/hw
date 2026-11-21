import { bad, safe } from "@/app/prototypes/road-lab/server/http";
import { stlLink } from "@/app/prototypes/road-lab/server/printables";
import { MAX_STL_BYTES } from "@/app/prototypes/road-lab/packs/merch-trail";

/** Proxy one STL from Printables (their file host has no CORS for us). Only numeric ids, only files.printables.com. */
export const GET = safe(async (req: Request) => {
  const u = new URL(req.url).searchParams;
  const print = u.get("print") ?? "";
  const file = u.get("file") ?? "";
  if (!/^\d{1,12}$/.test(print) || !/^\d{1,12}$/.test(file)) return bad("bad ids");
  const link = await stlLink(print, file, req.signal);
  const res = await fetch(link, { signal: req.signal });
  if (!res.ok) return bad(`stl HTTP ${res.status}`, 502);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_STL_BYTES) return bad("stl too large", 413);
  return new Response(buf, { headers: { "content-type": "model/stl", "cache-control": "public, max-age=86400" } });
});
