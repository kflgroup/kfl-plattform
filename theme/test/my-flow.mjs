// Kundenseite „Meine Anfragen“ gegen den echten Testserver (Angebot ansehen, „Interessiert mich“)
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || '.';
const dir = new URL('.', import.meta.url).pathname;
const kid = '11134009573715', ts = String(Math.floor(Date.now() / 1000)), sig = createHmac('sha256', 'test-secret').update(`${kid}.${ts}.my`).digest('hex');
let html = readFileSync('/tmp/claude-0/-home-claude/5ccc3155-f326-5fd3-bdc7-a82125377979/scratchpad/my/list.html', 'utf8');
html = html.replaceAll('{"ep":"https://ep.test","kid":"777","ts":"1761300000","sig":"abc"}', JSON.stringify({ ep: 'https://ep.test', kid, ts, sig }))
  .replace('</style>', readFileSync(dir + '../offers.css', 'utf8') + ':root{--k-green:#0a7d3b;--k-green-bg:#e7f5ec}.k-btn--primary{background:#ff6c01}</style>')
  .replace('src="kfl-my-requests.js"', `src="file://${dir}../assets/kfl-my-requests.js"`);
writeFileSync(dir + 'my.html', html);
const b = await chromium.launch();
// Admin wertet #1001 sofort aus, damit ein Angebot beim Kunden liegt
const adm = await b.newContext(); const ap = await adm.newPage(); await ap.goto('http://localhost:8787/admin');
const call = (m, p, body) => ap.evaluate(async ([m, p, body]) => (await fetch(p, { method: m, headers: { 'Content-Type': 'application/json', 'X-KFL': '1' }, body: body ? JSON.stringify(body) : undefined })).json(), [m, p, body]);
await call('POST', '/api/login', { email: 'admin@kfl.de', password: 'AdminPass123' });
console.log('Auswertung', JSON.stringify(await call('POST', '/api/requests/1001/evaluate', {})));
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
const errors = [];
await ctx.route('https://ep.test/**', async (route) => { const r = route.request(); const u = new URL(r.url()); const res = await route.fetch({ url: 'http://localhost:8787' + u.pathname, headers: { ...r.headers(), origin: 'https://kfl-group.com' } }); route.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' } }); });
const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message)); p.on('dialog', (d) => { errors.push('DIALOG ' + d.message()); d.dismiss(); });
await p.goto('file://' + dir + 'my.html'); await p.waitForSelector('.k-req');
const has = await p.$('[data-accept]');
console.log(has ? '  ✓ Angebot mit „Interessiert mich“ sichtbar' : '  ✗ kein Angebot');
await p.screenshot({ path: out + '/my_offer.png', fullPage: true });
if (has) {
  await p.click('[data-accept]'); await p.waitForTimeout(200);
  console.log((await p.textContent('[data-accept]')).includes('Ja, Kontakt') ? '  ✓ Zweiter Klick zur Bestätigung' : '  ✗ keine Bestätigung');
  await p.click('[data-accept]'); await p.waitForSelector('.k-offer.is-accepted', { timeout: 8000 });
  console.log('  ✓ Angenommen – Partnerdaten:', (await p.textContent('.k-offer__partner')).replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: out + '/my_accepted.png', fullPage: true });
}
const m = await b.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
await m.route('https://ep.test/**', async (route) => { const r = route.request(); const u = new URL(r.url()); const res = await route.fetch({ url: 'http://localhost:8787' + u.pathname, headers: { ...r.headers(), origin: 'https://kfl-group.com' } }); route.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' } }); });
const pm = await m.newPage(); await pm.goto('file://' + dir + 'my.html'); await pm.waitForSelector('.k-req'); await pm.screenshot({ path: out + '/my_mobile.png', fullPage: false });
console.log(errors.length ? 'FEHLER: ' + errors.join(' | ') : 'keine Fehler');
await b.close();
