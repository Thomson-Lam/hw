import { chromium } from "/Users/tlam/hw/playground/node_modules/playwright/index.mjs";
const base = process.argv[2], out = process.argv[3], pack = process.argv[4] ?? "canada-life";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(`${base}/prototypes/road-lab`, { waitUntil: "networkidle" });
await page.click(`[data-pack="${pack}"]`); await page.waitForSelector('li[data-index="0"]');
let i = 0;
for (let step = 0; step < 40; step++) {
  const li = page.locator(`li[data-index="${i}"]`);
  if (!(await li.count())) { await page.waitForTimeout(300); continue; }
  await li.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(250); // rusher: < 700 ms per tile
  const kind = await li.getAttribute("data-kind");
  if (kind === "mood") await li.locator('[data-testid="mood-before"]').first().click();
  if (kind === "fork") { const bs = li.locator('[data-testid="branch"]:not([disabled])'); const n = await bs.count(); await bs.nth(Math.min(Number(process.argv[5] ?? 0), n - 1)).click(); await page.waitForTimeout(200); }
  if (kind === "toll-booth") break;
  i++;
}
const legend = await page.locator('[data-testid="legend"]').innerText();
await page.locator('[data-testid="legend"]').click(); await page.waitForTimeout(400);
const rules = await page.locator('[data-testid="rule"]').allInnerTexts();
await page.screenshot({ path: `${out}-legend.png` });
const pace = await page.locator('[data-testid="pace"]').innerText();
if (rules.length) { await page.locator('[data-testid="erase-rule"]').first().click(); await page.waitForTimeout(500); }
const after = await page.locator('[data-testid="rule"]').allInnerTexts();
console.log(JSON.stringify({ pace, legend, rules, afterErase: after }));
await b.close();
