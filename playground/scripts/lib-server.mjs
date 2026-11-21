// Shared helpers: start a production server behind a throwaway password and log a Playwright context in.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");

export function listSlugs() {
  const dir = path.join(root, "app/prototypes");
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !/^[[_]/.test(d.name) && fs.existsSync(path.join(dir, d.name, "metadata.json")))
    .map((d) => d.name)
    .sort();
}

export function build() {
  const r = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) throw new Error("build failed");
}

export async function startServer(port) {
  const password = randomBytes(12).toString("hex");
  const proc = spawn(path.join(root, "node_modules/.bin/next"), ["start", "-p", String(port)], {
    cwd: root,
    env: { ...process.env, PLAYGROUND_PASSWORD: password, NODE_ENV: "production" },
    stdio: "ignore",
    detached: true, // own process group, so stop() kills next and its workers
  });
  const stop = () => {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {}
  };
  process.on("exit", stop);
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${base}/login`);
      if (res.ok) return { base, password, stop };
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  stop();
  throw new Error("server did not start");
}

export async function login(context, base, password) {
  const res = await context.request.post(`${base}/api/auth`, { data: { password } });
  if (!res.ok()) throw new Error(`login failed: ${res.status()}`);
}

export async function newThemedContext(browser, theme, opts) {
  const context = await browser.newContext({ colorScheme: theme, reducedMotion: "reduce", ...opts });
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, theme);
  return context;
}
