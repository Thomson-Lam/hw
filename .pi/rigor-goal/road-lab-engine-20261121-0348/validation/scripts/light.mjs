import { spawn } from "node:child_process";
import fs from "node:fs";
import { walk } from "./walk.mjs";
const OUT = process.argv[2]; const PW = "light-" + Date.now(); const DB = "/tmp/rl-light.db";
const proc = spawn("/Users/tlam/hw/playground/node_modules/.bin/next", ["start", "-p", "3988"], { cwd: "/Users/tlam/hw/playground", env: { ...process.env, NODE_ENV: "production", PLAYGROUND_PASSWORD: PW, ROAD_LAB_DB: DB }, stdio: "ignore", detached: true });
for (let i = 0; i < 100; i++) { try { if ((await fetch("http://localhost:3988/login")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
const login = async (ctx) => { const r = await ctx.request.post("http://localhost:3988/api/auth", { data: { password: PW } }); if (!r.ok()) throw new Error("login " + r.status()); };
for (const [pack, theme] of [["merch-trail", "light"], ["merch-trail", "dark"]]) {
  const r = await walk({ base: "http://localhost:3988", pack, out: `${OUT}/stl-${theme}`, login, theme });
  console.log(`${theme} ${pack}: reached=${r.reached} effect=${JSON.stringify(r.effect)} llm=${r.llm} fallback=${r.fallback} overflow=${r.overflow} errors=${r.log.filter((l) => !l.startsWith("toll")).length}`);
}
process.kill(-proc.pid, "SIGTERM"); for (const f of [DB, DB + "-wal", DB + "-shm"]) fs.rmSync(f, { force: true });
process.exit(0);
