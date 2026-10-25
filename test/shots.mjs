// Screenshots + Konsolenfehler: node test/shots.mjs <app> <email> <passwort> <ausgabeordner> <hash1> <hash2> …  (MOBILE=1 für Handy)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [app, email, pw, outDir, ...hashes] = process.argv.slice(2);
const mobile = !!process.env.MOBILE;
const browser = await chromium.launch();
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
const base = `http://localhost:8787/${app}`;
await page.goto(base);
await page.waitForTimeout(600);
if (process.env.LOGINSHOT) await page.screenshot({ path: `${outDir}/login.png`, fullPage: !mobile });
if (email !== '-') {
  await page.fill('input[name=email]', email); await page.fill('input[name=password]', pw);
  await page.click('form[data-submit] button[type=submit]');
  await page.waitForTimeout(1200);
}
for (const h of hashes) {
  const [hash, action] = h.split('|');
  await page.evaluate((x) => { location.hash = x; }, hash);
  await page.waitForTimeout(1100);
  if (action) { await page.click(action).catch((e) => errors.push('CLICK ' + action + ' ' + e.message)); await page.waitForTimeout(800); }
  const name = hash.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'start';
  await page.screenshot({ path: `${outDir}/${name}${action ? '_act' : ''}.png`, fullPage: !mobile && !action });
}
console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'keine Konsolenfehler');
await browser.close();
