// Klicktest beider Oberflächen gegen den Testserver (node test/serve.mjs): node test/ui-flow.mjs <ausgabeordner>
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || '.';
const browser = await chromium.launch();
const errors = []; let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };
async function session(app, email, pw, opts = {}) {
  const ctx = await browser.newContext(opts.mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${app}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${app}] PAGEERROR ${e.message}`));
  page.on('dialog', (d) => d.dismiss());
  await page.goto(`http://localhost:8787/${app}`);
  await page.fill('input[name=email]', email); await page.fill('input[name=password]', pw);
  await page.click('form[data-submit] button[type=submit]');
  await page.waitForTimeout(1000);
  return page;
}
const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(900); };
const shot = (page, name, full = true) => page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
const text = (page) => page.innerText('body');

console.log('Partner: Anfrage übernehmen und Angebot senden');
let p = await session('partner', 'a_vt1@partner.de', 'Partner12345');
await go(p, '#/anfragen');
await p.click('.rq'); await p.waitForTimeout(800);
ok((await text(p)).includes('Anfrage übernehmen'), 'Teaser mit Übernahme-Button');
ok(!(await text(p)).includes('@'), 'Teaser ohne E-Mail-Adressen');
await shot(p, 'p_teaser');
await p.click('[data-act=ptake]'); await p.waitForTimeout(1200);
const body1 = await text(p);
ok(body1.includes('Angebot erstellen') && body1.includes('Anfrage des Kunden'), 'Nach Übernahme: Details und Angebotsformular');
ok(!/kunde\.de|gmx|web\.de|t-online|gmail|posteo/.test(body1), 'Keine Kunden-E-Mail sichtbar');
await shot(p, 'p_detail_form');
await p.click('label:has(input[name=equipment_match][value=ja])');
for (const [n, v] of [['price', '41.900,00'], ['monthly_rate', '389,00'], ['final_rate', '12.000'], ['transfer_cost', '990'], ['service_cost', '29'], ['insurance_cost', '59'], ['delivery', 'sofort'], ['notes', 'Inklusive Winterräder']]) {
  if (await p.$(`input[name=${n}], textarea[name=${n}]`)) await p.fill(`[name=${n}]`, v);
}
await p.click('form[data-submit=psendOffer] button[type=submit]'); await p.waitForTimeout(500);
await p.click('.modal-foot .btn-primary'); await p.waitForTimeout(1500);
ok((await text(p)).includes('Dein Angebot'), 'Angebot gesendet, Zusammenfassung sichtbar');
await shot(p, 'p_detail_sent');
await go(p, '#/einstellungen'); await shot(p, 'p_settings', false);
await go(p, '#/support'); await p.click('[data-act=pnewTicket]'); await p.waitForTimeout(400);
await p.fill('.modal [name=subject]', 'Frage zur Frist'); await p.fill('.modal [name=text]', 'Zählt der Feiertag mit?');
await p.click('.modal-foot .btn-primary'); await p.waitForTimeout(1200);
ok((await text(p)).includes('Frage zur Frist'), 'Support-Ticket angelegt und geöffnet');

console.log('Partner mobil');
const pm = await session('partner', 'a_gf@partner.de', 'Partner12345', { mobile: true });
await shot(pm, 'pm_start', false);
await go(pm, '#/anfragen?tab=team'); await shot(pm, 'pm_team', false);
await go(pm, '#/statistik'); await shot(pm, 'pm_stats', false);
await pm.click('.p-tabbar [data-act=moreSheet]'); await pm.waitForTimeout(500); await shot(pm, 'pm_more', false);
const overflow = await pm.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok(!overflow, 'Kein seitliches Scrollen auf dem Handy');

console.log('Partner-GF: Angebote (vertraulich)');
await go(pm, '#/angebote'); await pm.waitForTimeout(400);
const hasOffers = await pm.$('[data-act=pofferOpen]');
if (hasOffers) { await pm.click('[data-act=pofferOpen]'); await pm.waitForTimeout(700); ok((await text(pm)).includes('Vertrauliche Information'), 'Hinweis auf vertraulichen Vermerk'); await shot(pm, 'pm_offer', false); }

console.log('Intern: Anfrage, Buchhaltung, Support, Backup');
const s = await session('admin', 'admin@kfl.de', 'AdminPass123');
await go(s, '#/anfragen/1009'); await shot(s, 's_request_1009');
ok((await text(s)).includes('Autohaus Alpha'), 'Partnerangebot in der internen Ansicht');
await go(s, '#/buchhaltung/rechnungen'); await s.click('tr.clickable'); await s.waitForTimeout(800); await shot(s, 's_invoice_modal', false);
ok((await text(s)).includes('Zahlung buchen'), 'Rechnungsdialog mit Zahlungserfassung');
await s.keyboard.press('Escape'); await s.waitForTimeout(300);
await go(s, '#/support'); await s.click('tr.clickable'); await s.waitForTimeout(700);
await go(s, '#/backup'); await s.fill('input[name=password]', 'Test-Bereich-2026'); await s.click('form[data-submit=areaUnlock] button'); await s.waitForTimeout(1200);
ok((await text(s)).includes('Sicherheitsbericht'), 'Backup mit Bereichspasswort entsperrt');
await s.click('[data-act=backupNow]'); await s.waitForTimeout(1200); await shot(s, 's_backup');
await go(s, '#/protokoll'); await shot(s, 's_protokoll', false);
ok((await text(s)).includes('Einträge'), 'Protokoll sichtbar');
await go(s, '#/statistik'); await shot(s, 's_stats', false);
await go(s, '#/verwaltung'); await s.click('[data-act=userEdit]'); await s.waitForTimeout(500); await shot(s, 's_user_edit', false);
const sm = await session('admin', 'vt@kfl.de', 'Passwort1234', { mobile: true });
await shot(sm, 'sm_start', false);
ok(!(await sm.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'Internes Dashboard ohne seitliches Scrollen auf dem Handy');
const navTxt = await sm.evaluate(() => document.querySelector('#nav').innerText);
ok(!navTxt.includes('Buchhaltung') && !navTxt.includes('Protokoll') && navTxt.includes('Anfragen'), 'Vertrieb sieht nur freigegebene Bereiche');

console.log(errors.length ? '\nKONSOLE:\n' + errors.join('\n') : '\nKeine Konsolenfehler');
console.log(fails ? `${fails} FEHLER` : 'ALLE UI-TESTS BESTANDEN');
await browser.close();
process.exitCode = fails || errors.length ? 1 : 0;
