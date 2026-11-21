// Server-only: read secrets from the repo-root .env (gitignored) once. Existing process env wins.
import fs from "node:fs";
import path from "node:path";

let loaded = false;

export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;
  const root = /* turbopackIgnore: true */ process.cwd();
  for (const file of [path.resolve(/* turbopackIgnore: true */ root, "..", ".env"), path.resolve(/* turbopackIgnore: true */ root, ".env.local")]) {
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
