#!/usr/bin/env node
// Capture share assets for PUBLIC prototypes: public/og/<slug>.png (1200x630) and public/og/<slug>.mp4 (~6s).
//
//   npm run og -- road-scroll [--no-build]
// The video scrolls the page slowly so motion shows. Needs ffmpeg on PATH for mp4.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { build, listSlugs, login, newThemedContext, root, startServer } from "./lib-server.mjs";

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith("--"));
if (!slugs.length || slugs.some((s) => !listSlugs().includes(s))) {
  console.error(`Usage: npm run og -- <slug...>. Known: ${listSlugs().join(", ")}`);
  process.exit(1);
}
for (const s of slugs) {
  const meta = JSON.parse(fs.readFileSync(path.join(root, "app/prototypes", s, "metadata.json"), "utf8"));
  if (meta.public !== true) console.warn(`! ${s} is not public; OG assets are only served for public prototypes.`);
}

const outDir = path.join(root, "public/og");
fs.mkdirSync(outDir, { recursive: true });
if (!args.includes("--no-build")) build();
const server = await startServer(3998);
const browser = await chromium.launch();
const size = { width: 1200, height: 630 };
try {
  for (const slug of slugs) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-"));
    const context = await newThemedContext(browser, "dark", { viewport: size, recordVideo: { dir: tmp, size } });
    await login(context, server.base, server.password);
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${server.base}/p/${slug}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, `${slug}.png`) });
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let i = 0; i <= 120; i++) {
      await page.evaluate((y) => scrollTo(0, y), (max * i) / 120);
      await page.waitForTimeout(45);
    }
    const video = page.video();
    await context.close();
    const webm = await video.path();
    const mp4 = path.join(outDir, `${slug}.mp4`);
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4], { stdio: "inherit" });
    if (r.status !== 0) console.warn(`! ffmpeg failed; no mp4 for ${slug}`);
    else console.log(`✓ public/og/${slug}.png, public/og/${slug}.mp4`);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
} finally {
  await browser.close();
  server.stop();
}
