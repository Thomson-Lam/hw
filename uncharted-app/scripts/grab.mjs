// Map an on-screen element of the Expo web build to its source file with React Grab.
// Usage: node scripts/grab.mjs <testID|css> [--explore] [--url http://localhost:8081]
//   --explore  taps "Just explore" first, so road elements (lane-0, fork-sign, pin-*) exist.
// Needs: `npx expo start` running (web served on :8081), and Playwright (resolved from ../playground).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../playground/package.json"));
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const url = args.includes("--url") ? args[args.indexOf("--url") + 1] : "http://localhost:8081";
if (!target) { console.error("usage: node scripts/grab.mjs <testID|css> [--explore] [--url URL]"); process.exit(2); }
const selector = /^[\w-]+$/.test(target) ? `[data-testid="${target}"]` : target;

const b = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
try {
  await p.goto(url);
  await p.getByTestId("just-explore").waitFor({ timeout: 90000 });
  if (args.includes("--explore")) await p.getByTestId("just-explore").click();
  await p.locator(selector).first().waitFor({ timeout: 30000 });
  await p.waitForFunction(() => !!window.__REACT_GRAB__, null, { timeout: 15000 });
  const out = await p.evaluate(async (sel) => {
    const el = document.querySelector(sel), g = window.__REACT_GRAB__;
    return { source: await g.getSource(el), stack: await g.getStackContext(el) };
  }, selector);
  console.log(JSON.stringify(out.source));
  console.log(out.stack.trim());
} catch (e) {
  console.error("grab failed:", e.message.split("\n")[0]);
  process.exitCode = 1;
} finally {
  await b.close();
}
