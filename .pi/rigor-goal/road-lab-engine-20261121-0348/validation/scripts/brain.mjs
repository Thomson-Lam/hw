import { chromium } from "/Users/tlam/hw/playground/node_modules/playwright/index.mjs";
export async function brainDemo({ base, out, login }) {
  const b = await chromium.launch();
  const phoneCtx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: "dark" });
  const lapCtx = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
  if (login) { await login(phoneCtx); await login(lapCtx); }
  const phone = await phoneCtx.newPage(), lap = await lapCtx.newPage();
  const res = [];
  await phone.goto(`${base}/prototypes/road-lab`, { waitUntil: "networkidle" });
  await phone.click('[data-pack="canada-life"]'); await phone.waitForSelector('li[data-index="0"]');
  await phone.locator('[data-testid="mood-before"]').first().click();
  await lap.goto(`${base}/prototypes/road-lab/brain`, { waitUntil: "domcontentloaded" }); await lap.waitForSelector("[data-testid=panel-verdicts]");
  for (const [pack, inj, inv] of [["canada-life", "hidden-risk", "disclose-first"], ["sun-life", "diagnosis", "no-diagnosis"], ["merch-trail", "nc-license", "merch-license"]]) {
    if (pack !== "canada-life") {
      await lap.click(`[data-testid="swap-${pack}"]`);
      // phone restarts on its next control poll (1.5 s)
      await phone.waitForFunction((p) => document.querySelector("header p")?.textContent && document.querySelector('[data-testid="rome"]') && window.__rl_pack !== p, pack, { timeout: 1000 }).catch(() => {});
      await phone.waitForTimeout(2500);
    }
    const phoneTitle = await phone.locator("header p").first().innerText();
    await lap.waitForSelector(`[data-testid="inject-${inj}"]`, { timeout: 8000 });
    await lap.click(`[data-testid="inject-${inj}"]`);
    await lap.waitForSelector(`[data-verdict="reject"][data-source="inject"]`, { timeout: 8000 });
    await lap.waitForTimeout(700);
    const msg = await lap.locator('[data-testid="brain-msg"]').innerText();
    const verdict = await lap.locator(`[data-verdict="reject"][data-source="inject"]`).first().innerText();
    await lap.screenshot({ path: `${out}-brain-${pack}.png`, fullPage: true });
    await phone.screenshot({ path: `${out}-phone-${pack}.png` });
    res.push({ pack, phoneTitle, msg, verdictHasInv: verdict.includes(inv), verdict: verdict.replace(/\s+/g, " ").slice(0, 220) });
  }
  await b.close();
  return res;
}
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2]) console.log(JSON.stringify(await brainDemo({ base: process.argv[2], out: process.argv[3] }), null, 1));
