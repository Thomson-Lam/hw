import fs from "node:fs";
import http from "node:http";
import { setKey } from "./agent.mjs";
import { openDb } from "./db.mjs";
import { PERSONAS, SCENARIOS, simulate } from "./sim.mjs";
import { createTree } from "./tree.mjs";

const ENV = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
setKey(process.env.UNCHARTED_GEMINI_KEY ?? ENV.match(/GEMINI_API_KEY\s*=\s*(.+)/)?.[1].trim().replace(/^["']|["']$/g, ""));
const PORT = Number(process.env.PORT ?? 8787);
const DB = process.env.UNCHARTED_DB ?? new URL("../uncharted.sqlite", import.meta.url).pathname;
const db = openDb(DB);
const tree = createTree(db, (m) => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`));

const FINANCE = /\b(sav|money|invest|tfsa|fhsa|rrsp|budget|debt|spend|rent|layoff|laid off|fired|job|hours|inflation|price|market|quit|travel|time off|school|tuition|afford|paycheque|paycheck|broke|bills)|\$/i;
function route({ goal }) {
  const g = String(goal ?? "");
  if (!FINANCE.test(g)) return { pipe: "explore" };
  const hit = Object.entries(SCENARIOS).find(([, s]) => s.match.test(g));
  return { pipe: "finance", scenario: hit ? hit[0] : null, kind: hit ? (hit[1].kind === "dare" ? "dare" : "worry") : "worry" };
}

// [method, path pattern, handler(params, body)]
const ROUTES = [
  ["POST", /^\/api\/route$/, (_, b) => route(b)],
  ["POST", /^\/api\/simulate$/, (_, b) => simulate(b)],
  ["POST", /^\/api\/meta$/, () => ({ personas: PERSONAS, scenarios: Object.fromEntries(Object.entries(SCENARIOS).map(([k, s]) => [k, { kind: s.kind, label: s.label, chip: s.chip }])) })],
  ["POST", /^\/api\/session$/, (_, b) => tree.road(tree.createSession(b?.seed ?? null))],
  ["GET", /^\/api\/session\/([\w-]+)\/road$/, ([sid]) => tree.road(sid)],
  ["GET", /^\/api\/session\/([\w-]+)\/tree$/, ([sid]) => tree.tree(sid)],
  ["POST", /^\/api\/node\/([\w-]+)\/answer$/, ([nid], b) => (tree.answer(nid, b), tree.road(b.session_id))],
  ["POST", /^\/api\/node\/([\w-]+)\/change$/, ([nid], b) => (tree.change(nid), tree.road(b.session_id))],
  ["POST", /^\/api\/node\/([\w-]+)\/retry$/, ([nid], b) => (tree.retry(nid), tree.road(b.session_id))],
  ["POST", /^\/api\/rule\/([\w-]+)\/erase$/, ([rid], b) => (tree.erase(rid), tree.road(b.session_id))],
  ["GET", /^\/api\/idle$/, () => ({ idle: tree.idle() })],
];

http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") return res.end();
  const path = req.url.split("?")[0];
  let hit = null;
  for (const [m, re, fn] of ROUTES) { const x = m === req.method && path.match(re); if (x) { hit = [fn, x.slice(1)]; break; } }
  res.setHeader("content-type", "application/json");
  if (!hit) { res.statusCode = 404; return res.end(JSON.stringify({ error: "not found" })); }
  try {
    let body = ""; for await (const c of req) body += c;
    res.end(JSON.stringify(await hit[0](hit[1], body ? JSON.parse(body) : {})));
  } catch (e) {
    res.statusCode = /not on the road|already answered|nothing to change|no such|only a dead end|out of range|needs verdict|empty goal|takes no answer/.test(e.message) ? 409 : 500;
    if (res.statusCode === 500) console.error(path, e);
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, "0.0.0.0", () => console.log(`uncharted server on :${PORT} · db ${DB}`));
