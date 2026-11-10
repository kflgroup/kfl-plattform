// Klickt sich durch ein Dashboard und sammelt Fehler:
// node test/crawl.mjs <app> <email> <passwort> [MOBILE=1]
// Prüft: alle Menüpunkte, alle internen #/-Links, Reiter, „Ansehen/Öffnen/Bearbeiten“-Dialoge,
// Konsolenfehler, fehlgeschlagene API-Aufrufe (>= 400) und Seiten mit „nicht gefunden“.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [app, email, pw] = process.argv.slice(2);
const mobile = !!process.env.MOBILE;
const browser = await chromium.launch();
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const findings = []; let where = 'login';
const add = (kind, text) => { const k = `${kind}|${where}|${text}`; if (!findings.some((f) => f.k === k)) findings.push({ k, kind, where, text }); };
page.on('console', (m) => { if (m.type() === 'error' && !/status of 4(01|03|09)/.test(m.text())) add('konsole', m.text().slice(0, 240)); });
page.on('pageerror', (e) => add('js-fehler', e.message.slice(0, 240)));
page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && u.includes('/api/') && ![401, 409].includes(r.status())) add('api-' + r.status(), r.request().method() + ' ' + u.replace(/^https?:\/\/[^/]+/, '')); });
page.on('dialog', (d) => { add('browser-dialog', d.message().slice(0, 120)); d.dismiss(); });
const base = `http://localhost:8787/${app}`;
await page.goto(base); await page.waitForTimeout(700);
await page.fill('input[name=email]', email); await page.fill('input[name=password]', pw);
await page.click('form[data-submit] button[type=submit]'); await page.waitForTimeout(1500);

const seen = new Set(); const real = []; const queue = ['#/'];
const collect = async () => page.evaluate(() => [...document.querySelectorAll('a[href^="#/"]')].map((a) => a.getAttribute('href')));
const settle = () => page.waitForTimeout(900);
const notFound = async () => page.evaluate(() => /nicht gefunden|Seite gibt es nicht|unbekannte Seite/i.test(document.querySelector('main, #app, body').innerText.slice(0, 600)));
let visited = 0;
while (queue.length && visited < +(process.env.MAX || 45)) {
  const h = queue.shift(); const norm = h.split('?')[0] + '?' + [...new URLSearchParams(h.split('?')[1] || '').keys()].sort().join(','); if (seen.has(norm)) continue; seen.add(norm); visited++; real.push(h);
  process.stderr.write(visited + ' ' + h + '\n'); where = h; await page.evaluate((x) => { location.hash = x; }, h); await settle();
  if (await notFound()) add('seite-fehlt', h);
  for (const l of await collect()) if (!seen.has(l.split('?')[0] + '?' + [...new URLSearchParams(l.split('?')[1] || '').keys()].sort().join(',')) && queue.length < 200 && !/logout|abmelden/i.test(l)) queue.push(l);
  // Reiter / Filter-Knöpfe ohne Seitenwechsel
  const tabs = await page.$$('[role=tab], .tabs button, .seg button');
  for (const t of tabs.slice(0, 4)) { try { await t.click({ timeout: 1500 }); await page.waitForTimeout(350); } catch (e) { add('klick', 'Reiter nicht klickbar: ' + (await t.innerText().catch(() => '?')).slice(0, 40)); } }
  // Anzeige-Dialoge öffnen (nur lesende Aktionen)
  const acts = await page.$$eval('[data-act]', (els) => [...new Set(els.filter((e) => e.offsetParent).map((e) => e.dataset.act))]);
  for (const a of acts.filter((x) => /^(open|show|view|detail|req|rq|tk|ticket|arch|user|org|inv|cust|news|offer|p?view)/i.test(x) && !/(del|remove|storno|send|accept|reject|lock|reset|logout|approve|book|pay|close$|done|take|release|archive$)/i.test(x)).slice(0, 6)) {
    const el = await page.$(`[data-act="${a}"]`); if (!el) continue;
    try { await el.click({ timeout: 1500 }); await page.waitForTimeout(700); } catch (e) { add('klick', `Knopf ${a} nicht klickbar`); continue; }
    if (await notFound()) add('seite-fehlt', `nach ${a}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    const now = await page.evaluate(() => location.hash); if (now !== h) { await page.evaluate((x) => { location.hash = x; }, h); await settle(); }
  }
}
// Leere Links / Knöpfe ohne Funktion
where = 'statisch';
for (const h of real.slice(0, 25)) {
  await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(500);
  const dead = await page.evaluate(() => [...document.querySelectorAll('a, button')].filter((e) => e.offsetParent && !e.disabled).filter((e) => {
    if (e.tagName === 'A') { const href = e.getAttribute('href'); return !href || href === '#' ; }
    return !e.dataset.act && !e.closest('form') && !e.onclick && !e.dataset.close && !e.getAttribute('aria-controls') && !e.dataset.nav && !e.dataset.tab && !e.closest('[data-tabs]') && e.type !== 'submit' && !e.hasAttribute('data-copy') && !e.id;
  }).map((e) => (e.innerText || e.getAttribute('aria-label') || e.className).trim().slice(0, 50)));
  for (const d of dead) add('ohne-funktion?', `${h}: ${d}`);
}
console.log(JSON.stringify({ app, mobile, visited, routes: real, findings: findings.map(({ k, ...f }) => f) }, null, 1));
await browser.close();
