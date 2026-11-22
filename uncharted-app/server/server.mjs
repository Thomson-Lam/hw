import fs from "node:fs";
import http from "node:http";
import { setKey } from "./agent.mjs";
import { readProductPage } from "./pages.mjs";
import { classifyRoad, setRouteKey } from "./route.mjs";
import { openDb } from "./db.mjs";
import { PERSONAS, SCENARIOS, simulate } from "./sim.mjs";
import { createTree } from "./tree.mjs";

const ENV = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
const GEMINI_KEY = process.env.UNCHARTED_GEMINI_KEY ?? ENV.match(/GEMINI_API_KEY\s*=\s*(.+)/)?.[1].trim().replace(/^["']|["']$/g, "");
setKey(GEMINI_KEY);
setRouteKey(GEMINI_KEY);
const PORT = Number(process.env.PORT ?? 8787);
const DB = process.env.UNCHARTED_DB ?? new URL("../uncharted.sqlite", import.meta.url).pathname;
const db = openDb(DB);
const tree = createTree(db, (m) => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`));

// The free text bar: the Decisions API (server/route.mjs) picks the road.
// Money worries go to the futures simulator (the demo road, Uncharted-PRD.md section 0),
// concepts to the lesson road, find/make goals to the research road, other goals to the choice road.
async function route({ goal }) {
  const g = String(goal ?? "").trim();
  const r = await classifyRoad(g);
  console.log(`${new Date().toISOString().slice(11, 19)} route "${g}" -> ${r.road}${r.confidence != null ? ` ${Math.round(r.confidence * 100)}%` : ""}${r.road === "goal" ? `/${r.goal_kind}` : ""} via ${r.via} in ${r.ms}ms${r.error ? ` (${r.error})` : ""}`);
  const meta = { road: r.road, confidence: r.confidence, via: r.via };
  if (r.road === "concept") return { pipe: "concept", scenario: null, ...meta };
  // Find and make goals get the research road (real products, then a savings plan); other goals keep the choice road.
  if (r.road === "goal" && (r.goal_kind === "find" || r.goal_kind === "make")) return { pipe: "find", mode: r.goal_kind, scenario: null, ...meta, goal_kind: r.goal_kind };
  if (r.road === "goal") return { pipe: "explore", scenario: null, ...meta, goal_kind: r.goal_kind };
  const hit = Object.entries(SCENARIOS).find(([, s]) => s.kind === "fear" && s.match.test(g));
  return { pipe: "finance", scenario: hit ? hit[0] : null, kind: "worry", ...meta };
}

// [method, path pattern, handler(params, body)]
const ROUTES = [
  ["POST", /^\/api\/route$/, async (_, b) => route(b)],
  ["POST", /^\/api\/simulate$/, (_, b) => simulate(b)],
  ["POST", /^\/api\/meta$/, () => ({ personas: PERSONAS, scenarios: Object.fromEntries(Object.entries(SCENARIOS).map(([k, s]) => [k, { kind: s.kind, label: s.label, chip: s.chip }])) })],
  ["POST", /^\/api\/session$/, (_, b) => tree.road(tree.createSession(b?.seed ?? null))],
  ["GET", /^\/api\/sessions$/, () => tree.sessions()],
  ["GET", /^\/api\/session\/([\w-]+)\/road$/, ([sid]) => tree.road(sid)],
  ["GET", /^\/api\/session\/([\w-]+)\/tree$/, ([sid]) => tree.tree(sid)],
  ["POST", /^\/api\/node\/([\w-]+)\/answer$/, ([nid], b) => (tree.answer(nid, b), tree.road(b.session_id))],
  ["POST", /^\/api\/node\/([\w-]+)\/change$/, ([nid], b) => (tree.change(nid), tree.road(b.session_id))],
  ["POST", /^\/api\/node\/([\w-]+)\/retry$/, ([nid], b) => (tree.retry(nid), tree.road(b.session_id))],
  ["POST", /^\/api\/rule\/([\w-]+)\/erase$/, ([rid], b) => (tree.erase(rid), tree.road(b.session_id))],
  ["GET", /^\/api\/idle$/, () => ({ idle: tree.idle() })],
  // Diagnostic: what the product reader sees on a store page (photo, title, price), for checking why a card has no photo.
  ["POST", /^\/api\/debug\/page$/, async (_, b) => readProductPage(b.url)],
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
