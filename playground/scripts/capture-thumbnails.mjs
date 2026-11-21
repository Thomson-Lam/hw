#!/usr/bin/env node
// Capture light + dark gallery thumbnails into public/thumbnails/<slug>-{light,dark}.png.
//
//   npm run thumbnails                      # all prototypes
//   npm run thumbnails -- road-scroll       # one
//   npm run thumbnails -- a b c             # several
//   npm run thumbnails -- --missing         # only prototypes without both images
//   add --no-build to reuse the existing .next build
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { build, listSlugs, login, newThemedContext, root, startServer } from "./lib-server.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const requested = args.filter((a) => !a.startsWith("--"));
const outDir = path.join(root, "public/thumbnails");
const exists = (slug, t) => fs.existsSync(path.join(outDir, `${slug}-${t}.png`));

const all = listSlugs();
const unknown = requested.filter((s) => !all.includes(s));
if (unknown.length) {
  console.error(`Unknown prototype(s): ${unknown.join(", ")}. Known: ${all.join(", ")}`);
  process.exit(1);
}
let slugs = requested.length ? requested : all;
if (flags.has("--missing")) slugs = slugs.filter((s) => !exists(s, "light") || !exists(s, "dark"));
if (!slugs.length) {
  console.log("Nothing to capture.");
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
if (!flags.has("--no-build")) build();
const server = await startServer(3999);
const browser = await chromium.launch();
try {
  for (const theme of ["light", "dark"]) {
    const context = await newThemedContext(browser, theme, { viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });
    await login(context, server.base, server.password);
    const page = await context.newPage();
    for (const slug of slugs) {
      await page.goto(`${server.base}/prototypes/${slug}`, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "[data-capture-hide]{display:none!important}" });
      await page.waitForTimeout(800);
      const file = path.join(outDir, `${slug}-${theme}.png`);
      await page.screenshot({ path: file });
      console.log(`✓ ${path.relative(root, file)}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.stop();
}
console.log("Open the images and check them before committing. Then run `npm run gen` (build does this too).");
