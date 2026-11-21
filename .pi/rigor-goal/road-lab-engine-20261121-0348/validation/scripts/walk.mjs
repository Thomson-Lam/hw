// Drive /prototypes/road-lab at 375px: pick a pack, walk tile by tile, act at mood/fork/toll/campfire.
import { chromium } from "/Users/tlam/hw/playground/node_modules/playwright/index.mjs";
export async function walk({ base, pack, out, dwell = 900, theme = "dark", login, branch = 0, maxSteps = 90, shots = true, page: given, context: givenCtx, tollActions = [], crisisAt = -1 }) {
  const browser = given ? null : await chromium.launch();
  const context = givenCtx ?? (await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: theme }));
  if (login) await login(context);
  // next-themes defaults to dark and stores the choice in localStorage; colorScheme alone does not switch it.
  if (!givenCtx) await context.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
  const page = given ?? (await context.newPage());
  const log = [];
  page.on("console", (m) => m.type() === "error" && log.push(`console.error: ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => log.push(`pageerror: ${e.message.slice(0, 200)}`));
  await page.goto(`${base}/prototypes/road-lab`, { waitUntil: "networkidle" });
  await page.click(`[data-pack="${pack}"]`);
  await page.waitForSelector('li[data-index="0"]');
  let i = 0, reached = false, shot = 0;
  for (let step = 0; step < maxSteps; step++) {
    const li = page.locator(`li[data-index="${i}"]`);
    if (!(await li.count())) {
      await page.waitForTimeout(400);
      if (step > maxSteps - 2) break;
      continue;
    }
    await li.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(dwell);
    const kind = await li.getAttribute("data-kind");
    if (shots && (step < 3 || ["fork", "toll-booth", "campfire", "pick", "checkpoint"].includes(kind))) await page.screenshot({ path: `${out}-${String(shot++).padStart(2, "0")}-${kind}.png` });
    if (kind === "mood") await li.locator('[data-testid="mood-before"]').first().click();
    if (kind === "fork") {
      const btns = li.locator('[data-testid="branch"]:not([disabled])');
      const n = await btns.count();
      if (n) await btns.nth(Math.min(branch, n - 1)).click();
      await page.waitForTimeout(300);
    }
    if (crisisAt >= 0 && i >= crisisAt) {
      await page.locator('[data-testid="crisis-exit"]').click();
      await page.waitForTimeout(500);
      const help = page.locator('[data-testid="help"]');
      await help.scrollIntoViewIfNeeded();
      if (shots) await page.screenshot({ path: `${out}-${String(shot++).padStart(2, "0")}-help.png` });
      const sources = await page.$$eval("li[data-index]", (els) => els.map((e) => `${e.dataset.source}:${e.dataset.kind}`));
      const crisis = (await help.count()) > 0;
      const helpText = crisis ? await help.innerText() : "";
      if (!given) await browser.close();
      return { pack, reached: false, crisis, helpText, tiles: sources.length, sources, log };
    }
    if (kind === "toll-booth") {
      const action = tollActions.shift() ?? "confirm";
      log.push(`toll action: ${action}`);
      if (action === "confirm") {
        if (await li.locator('[data-testid="slot"]').count()) await li.locator('[data-testid="slot"]').first().click();
        await li.locator('[data-testid="confirm"]').click();
      } else await li.locator(`[data-testid="${action}"]`).click();
      await page.waitForTimeout(500);
      if (shots) await page.screenshot({ path: `${out}-${String(shot++).padStart(2, "0")}-toll-${action}.png` });
    }
    if (kind === "campfire") {
      await li.locator('[data-testid="mood-after"]').nth(2).click();
      await page.waitForTimeout(300);
      if (shots) await page.screenshot({ path: `${out}-${String(shot++).padStart(2, "0")}-rome.png` });
      reached = true;
      break;
    }
    i++;
  }
  const sources = await page.$$eval("li[data-index]", (els) => els.map((e) => `${e.dataset.source}:${e.dataset.kind}`));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const effect = reached ? await page.locator('[data-testid="effect"]').innerText().catch(() => null) : null;
  if (!given) await browser.close();
  return { pack, reached, effect, tiles: sources.length, llm: sources.filter((s) => s.startsWith("llm")).length, fallback: sources.filter((s) => s.startsWith("fallback")).length, sources, overflow, log };
}
