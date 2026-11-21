// Production validation for road-lab. Usage: node validate.mjs <outDir>
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "/Users/tlam/hw/playground/node_modules/playwright/index.mjs";
import { brainDemo } from "./brain.mjs";
import { walk } from "./walk.mjs";

const ROOT = "/Users/tlam/hw/playground";
const OUT = process.argv[2];
fs.mkdirSync(`${OUT}/screens`, { recursive: true });
const DB = "/tmp/rl-validate.db";
const PASSWORD = "validate-" + Math.random().toString(36).slice(2);
const report = [];
const say = (...a) => {
  const line = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  report.push(line);
  console.log(line);
};

async function startServer(port, extraEnv = {}) {
  try {
    await fetch(`http://localhost:${port}/login`);
    throw new Error(`port ${port} is already in use: stop the old server first`);
  } catch (e) {
    if (String(e).includes("already in use")) throw e;
  }
  const proc = spawn(path.join(ROOT, "node_modules/.bin/next"), ["start", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", PLAYGROUND_PASSWORD: PASSWORD, ROAD_LAB_DB: DB, ...extraEnv },
    stdio: ["ignore", fs.openSync(`${OUT}/server-${port}.log`, "a"), fs.openSync(`${OUT}/server-${port}.log`, "a")],
    detached: true,
  });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/login`)).ok) return { base, stop: () => { try { process.kill(-proc.pid, "SIGTERM"); } catch {} } };
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start");
}
const login = (base) => async (context) => {
  const r = await context.request.post(`${base}/api/auth`, { data: { password: PASSWORD } });
  if (!r.ok()) throw new Error(`login ${r.status()}`);
};
async function cookieFor(base) {
  const r = await fetch(`${base}/api/auth`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: PASSWORD }) });
  return r.headers.get("set-cookie").split(";")[0];
}
const api = async (base, cookie, p, init = {}) => {
  const r = await fetch(`${base}${p}`, { ...init, headers: { cookie, "content-type": "application/json", ...(init.headers ?? {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};

for (const f of [DB, DB + "-wal", DB + "-shm"]) fs.rmSync(f, { force: true });

// ---- A. gate: road-lab is private ------------------------------------------------------------------------------
let s = await startServer(3990);
{
  const a = await fetch(`${s.base}/prototypes/road-lab`, { redirect: "manual" });
  const b = await fetch(`${s.base}/api/road-lab/control`, { redirect: "manual" });
  const c = await fetch(`${s.base}/p/road-lab`, { redirect: "manual" });
  say("A gate: /prototypes/road-lab", a.status, a.headers.get("location"), "| /api/road-lab/control", b.status, "| /p/road-lab", c.status);
}

// ---- B. journeys at 375 px, live Gemini ----------------------------------------------------------------------
const journeys = [
  { name: "canada-life", pack: "canada-life", branch: 1, tollActions: ["realign", "confirm"] },
  { name: "sun-life", pack: "sun-life", branch: 0, tollActions: ["decline", "confirm"] },
  { name: "merch-trail", pack: "merch-trail", branch: 1 },
  { name: "canada-life-light", pack: "canada-life", branch: 0, theme: "light" },
];
for (const j of journeys) {
  const r = await walk({ base: s.base, pack: j.pack, out: `${OUT}/screens/${j.name}`, login: login(s.base), branch: j.branch, tollActions: [...(j.tollActions ?? [])], theme: j.theme ?? "dark" });
  say(`B journey ${j.name}: reached=${r.reached} effect=${JSON.stringify(r.effect)} tiles=${r.tiles} llm=${r.llm} fallback=${r.fallback} overflow=${r.overflow} errors=${r.log.filter((l) => !l.startsWith("toll")).length} ${r.log.join(" | ")}`);
  say(`  sources: ${r.sources.join(" ")}`);
}
{
  const r = await walk({ base: s.base, pack: "sun-life", out: `${OUT}/screens/sun-life-crisis`, login: login(s.base), crisisAt: 3 });
  say(`B crisis exit sun-life: helpTile=${r.crisis} text=${JSON.stringify(r.helpText.slice(0, 120))} sources: ${r.sources.join(" ")}`);
}

// ---- C. rules from two skips, erase, recreate (rusher on the scenic road) -------------------------------------
async function rush(tag, erase) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: "dark" });
  await login(s.base)(ctx);
  // Same device id across runs so rules belong to one person.
  await ctx.addInitScript(() => localStorage.setItem("pg:road-lab:device", JSON.stringify("d-validate-device")));
  const page = await ctx.newPage();
  await page.goto(`${s.base}/prototypes/road-lab`, { waitUntil: "domcontentloaded" });
  await page.click('[data-pack="canada-life"]');
  await page.waitForSelector('li[data-index="0"]');
  let i = 0;
  for (let step = 0; step < 40; step++) {
    const li = page.locator(`li[data-index="${i}"]`);
    if (!(await li.count())) { await page.waitForTimeout(300); continue; }
    await li.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(250);
    const kind = await li.getAttribute("data-kind");
    if (kind === "mood") await li.locator('[data-testid="mood-before"]').first().click();
    if (kind === "fork") { const bs = li.locator('[data-testid="branch"]:not([disabled])'); await bs.nth(Math.min(1, (await bs.count()) - 1)).click(); await page.waitForTimeout(200); }
    if (kind === "toll-booth") break;
    i++;
  }
  await page.locator('[data-testid="legend"]').click();
  await page.waitForTimeout(500);
  const rules = await page.locator('[data-testid="rule"]').allInnerTexts();
  await page.screenshot({ path: `${OUT}/screens/rules-${tag}.png` });
  let after = rules;
  if (erase && rules.length) {
    await page.locator('[data-testid="erase-rule"]').first().click();
    await page.waitForTimeout(600);
    after = await page.locator('[data-testid="rule"]').allInnerTexts();
  }
  await b.close();
  return { rules, after };
}
const r1 = await rush("first", true);
say("C rusher run 1: rules", r1.rules, "after erase", r1.after);
const r2 = await rush("second", false);
say("C rusher run 2 (kept): rules", r2.rules);

// ---- D. brain view: three injected rejections + live pack swap --------------------------------------------------
const brain = await brainDemo({ base: s.base, out: `${OUT}/screens/demo`, login: login(s.base) });
for (const x of brain) say(`D brain ${x.pack}: phone="${x.phoneTitle}" rejectedWithInvariant=${x.verdictHasInv} msg="${x.msg}"`);

// ---- E. persistence across a restart ---------------------------------------------------------------------------
let cookie = await cookieFor(s.base);
const before = { rules: (await api(s.base, cookie, "/api/road-lab/rules")).body, tiles: (await api(s.base, cookie, "/api/road-lab/tiles")).body };
s.stop();
await new Promise((r) => setTimeout(r, 1500));
s = await startServer(3990);
cookie = await cookieFor(s.base);
const after = { rules: (await api(s.base, cookie, "/api/road-lab/rules")).body, tiles: (await api(s.base, cookie, "/api/road-lab/tiles")).body };
say("E before restart: rules", before.rules.map((r) => r.form), "tiles", before.tiles.map((t) => t.name));
say("E after restart:  rules", after.rules.map((r) => r.form), "tiles", after.tiles.map((t) => `${t.name}:${t.data?.title ?? ""}`));
{
  const runs = [];
  for (let id = 1; id < 40; id++) {
    const r = (await api(s.base, cookie, `/api/road-lab/runs?id=${id}`)).body;
    if (r) runs.push(r);
  }
  say("E runs table:", runs.map((r) => `${r.id}:${r.pack}:rome=${r.reached_rome}:mood=${r.mood_before}->${r.mood_after}:stopped=${r.stopped}`).join(" "));
}
s.stop();
await new Promise((r) => setTimeout(r, 1500));

// ---- F. forced 402: stub model host --------------------------------------------------------------------------
let hits = 0;
const stub = http.createServer((req, res) => {
  hits++;
  res.writeHead(402, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { code: 402, message: "Your prepayment credits are depleted." } }));
}).listen(3989);
s = await startServer(3990, { GEMINI_API_BASE: "http://localhost:3989" });
{
  const r = await walk({ base: s.base, pack: "canada-life", out: `${OUT}/screens/stub402`, login: login(s.base), shots: false });
  cookie = await cookieFor(s.base);
  const run = (await api(s.base, cookie, "/api/road-lab/runs")).body;
  const tr = (await api(s.base, cookie, `/api/road-lab/trace?run=${run.id}`)).body.events.map((e) => e.stage);
  const count = (st) => tr.filter((x) => x === st).length;
  say(`F 402: walk reached=${r.reached} llm=${r.llm} fallback=${r.fallback} | stub hits=${hits} | run ${run.id} stopped=${run.stopped} | paver-request=${count("paver-request")} paver-stop=${count("paver-stop")} paver-skip=${count("paver-skip")}`);
  const direct = await api(s.base, cookie, "/api/road-lab/pave", { method: "POST", body: JSON.stringify({ run: run.id, startIndex: 99, ctx: run.ctx }) });
  say(`F 402: later direct pave call -> ${JSON.stringify(direct.body)} | stub hits still ${hits}`);
}
s.stop();
stub.close();
for (const f of [DB, DB + "-wal", DB + "-shm"]) fs.rmSync(f, { force: true });
fs.writeFileSync(`${OUT}/e2e-report.txt`, report.join("\n") + "\n");
console.log("done");
process.exit(0);
