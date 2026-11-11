// AGB für Geschäftspartner: eine Quelle im internen Dashboard → Partner-Dashboard, Webseite (JSON + Leseseite), Fassungen, erneute Zustimmung
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
const shopCalls = [];
const prevFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (/myshopify\.com\/admin\/api\/.*graphql/.test(url)) { const b = JSON.parse(init.body); shopCalls.push(b); return new Response(JSON.stringify({ data: { pageUpdate: { page: { id: b.variables.id, updatedAt: '2026-11-12' }, userErrors: [] } } }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
  return prevFetch(input, init);
};
setNow('2026-11-12T09:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
const put = (p, b, o) => c.call('PUT', p, b, o);

await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
const vt = await c.post('/api/users', { email: 'vt@kfl.de', name: 'Vera Vertrieb', role_key: 'vertrieb' }, { who: 'admin' });
await c.post('/api/invite/accept', { token: vt.invite.split('/').pop(), password: 'Vertrieb12345!' }, { who: 'vt' });
const org = (await c.post('/api/orgs', { name: 'Autohaus Alpha', kind: 'organisation', zip: '49074', city: 'Osnabrück', email: 'info@alpha.de', brands: ['Audi'] }, { who: 'admin' })).id;
const pu = await c.post(`/api/orgs/${org}/users`, { email: 'max@alpha.de', name: 'Max Alpha', role: 'gf' }, { who: 'admin' });
const inv = await c.post(`/api/orgs/${org}/users/${pu.id}/invite`, {}, { who: 'admin' });

console.log('Standardfassung überall gleich');
let r = await c.get('/papi/terms');
check(r.ok && r.version === 1 && /§ 2a/.test(r.html) && r.stand === '11. November 2026', 'Partner-Dashboard (ohne Anmeldung): Fassung 1 mit § 2a und Stand', { v: r.version, stand: r.stand });
const web = await c.call('GET', '/legal/agb-partner', null, { origin: 'https://kfl-group.com', raw: true });
const wj = await web.json();
check(web.status === 200 && web.headers.get('Access-Control-Allow-Origin') === '*' && wj.html === r.html && wj.version === 1, 'Webseiten-Schnittstelle liefert denselben Text (CORS offen, nur lesend)');
const page = await c.call('GET', '/agb-partner', null, { raw: true }); const ptxt = await page.text();
check(page.status === 200 && /AGB für Geschäftspartner/.test(ptxt) && /default-src 'none'/.test(page.headers.get('Content-Security-Policy')) && !/<script/i.test(ptxt), 'Leseseite/Druckansicht ohne Skripte, strenge CSP');
check(r.web === 'https://kfl-group.com/pages/agb-partner', 'Link „Auf kfl-group.com“ zeigt auf /pages/agb-partner', r.web);

await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345!', agb: true, privacy: true }, { who: 'p' });
check(q1('SELECT agb_version FROM partner_users WHERE id = ?', pu.id).agb_version === 1, 'Einladung: Zustimmung mit Fassung 1 gespeichert');
r = await c.get('/papi/terms', { who: 'p' }); check(r.mine && r.mine.version === 1 && r.mine.agb_at && !r.mine.outdated, 'Partner sieht eigene Zustimmung');

console.log('Internes Dashboard: ansehen und Rechte');
r = await c.get('/api/partner-terms', { who: 'vt' });
check(r.ok && !r.canEdit && r.terms.version === 1 && r.stats.total === 1 && r.stats.current === 1, 'Vertrieb darf ansehen (mit Zustimmungsquote), aber nicht ändern', r.stats);
r = await put('/api/partner-terms', { html: '<p>x</p>', base_version: 1, note: 'Test' }, { who: 'vt' }); check(r.status === 403, 'Vertrieb kann nicht veröffentlichen', r.status);
const base = (await c.get('/api/partner-terms', { who: 'admin' })).terms.html;
check((await c.get('/api/partner-terms', { who: 'admin' })).canEdit, 'Admin darf bearbeiten');
r = await put('/api/partner-terms', { html: base, base_version: 1, note: 'nichts', stand: false }, { who: 'admin' }); check(r.status === 400 && /unverändert/.test(r.error), 'Unveränderter Text wird abgelehnt', r);
r = await put('/api/partner-terms', { html: '<p>Kurz</p>', base_version: 1, note: 'kaputt' }, { who: 'admin' }); check(r.status === 400 && /zu kurz/.test(r.error), 'Versehentlich geleerter Text wird abgelehnt', r);
r = await put('/api/partner-terms', { html: base + '<p>Neu</p>', base_version: 1, note: '' }, { who: 'admin' }); check(r.status === 400 && /Änderungshinweis/.test(r.error), 'Änderungshinweis ist Pflicht');

console.log('Veröffentlichen, bereinigen, verteilen');
const evil = base.replace('<h2>§ 1 Geltungsbereich</h2>', '<h2 onclick="alert(1)" style="color:red">§ 1 Geltungsbereich</h2><script>alert(1)</script><img src=x onerror=alert(1)><p>Kontakt: <a href="javascript:alert(1)">böse</a> <a href="https://kfl-group.com/pages/kontakt" onmouseover="x()">Kontakt</a> &amp; mehr < weniger</p><iframe src="https://evil.test"></iframe>')
  + '<h2>§ 12 Schlussbestimmung (neu)</h2><p>Neue Regelung für Testzwecke.</p>';
r = await put('/api/partner-terms', { html: evil, base_version: 1, note: '§ 12 ergänzt', notify: true }, { who: 'admin' });
check(r.ok && r.version === 2 && r.stand === '12. November 2026', 'Fassung 2 veröffentlicht, Stand automatisch auf heute', r);
const t2 = await c.get('/papi/terms', { who: 'p' });
check(t2.version === 2 && /§ 12 Schlussbestimmung/.test(t2.html), 'Partner-Dashboard zeigt sofort Fassung 2');
check(!/<script|onerror|onclick|onmouseover|javascript:|<iframe|<img|style=/i.test(t2.html), 'Skripte, Ereignis-Attribute, javascript:-Links, iframes, Bilder und Stile entfernt');
check(/<a href="https:\/\/kfl-group.com\/pages\/kontakt" target="_blank" rel="noopener noreferrer">Kontakt<\/a>/.test(t2.html) && /&amp; mehr &lt; weniger/.test(t2.html) && /<h2>§ 1 Geltungsbereich<\/h2>/.test(t2.html), 'Erlaubte Links bleiben, Sonderzeichen sicher, Überschrift sauber', t2.html.slice(t2.html.indexOf('§ 1 G') - 10, t2.html.indexOf('§ 1 G') + 300));
const wj2 = await (await c.call('GET', '/legal/agb-partner', null, { raw: true })).json();
check(wj2.version === 2 && wj2.html === t2.html, 'Webseite bekommt dieselbe Fassung 2');
check(!t2.mine.outdated && (await c.get('/papi/requests', { who: 'p' })).ok, 'Ohne „erneut zustimmen“ arbeitet der Partner weiter');
const news = q1("SELECT * FROM news_posts WHERE scope = 'partner' ORDER BY id DESC LIMIT 1");
check(news && /Fassung 2/.test(news.title) && /§ 12 ergänzt/.test(news.body) && JSON.parse(news.audience).type === 'partners_all', 'News an alle Partner mit Änderungshinweis');
r = await c.get('/papi/news', { who: 'p' }); check(JSON.stringify(r).includes('Aktualisierte AGB'), 'News erscheint im Partner-Dashboard');
const ar = sq.prepare("SELECT ref_id FROM archive WHERE kind = 'agb_partner' ORDER BY ref_id").all().map((x) => x.ref_id);
check(ar.join(',') === '1,2', 'Fassung 1 und 2 im Archiv', ar);
const days = (() => { const a = q1("SELECT * FROM archive WHERE kind = 'agb_partner' AND ref_id = 2"); return Math.round((Date.parse(a.expires_at) - Date.parse(a.archived_at)) / 864e5); })();
check(days >= 3650, 'Aufbewahrung 10 Jahre', days);
r = await c.get('/api/partner-terms/versions/1', { who: 'vt' }); check(r.ok && r.version.html === base, 'Alte Fassung 1 abrufbar (Nachweis)');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'partner_agb_veroeffentlicht'").n === 1, 'Veröffentlichung im Protokoll');
const st = (await c.get('/api/partner-terms', { who: 'admin' }));
check(st.terms.shop_sync && !st.terms.shop_sync.ok && /nicht verbunden/.test(st.terms.shop_sync.error), 'Ohne Shopify-Zugang: Hinweis statt Fehler', st.terms.shop_sync);
check(st.stats.current === 0 && st.stats.any === 1, 'Quote: noch niemand hat Fassung 2 bestätigt');

console.log('Gleichzeitige Bearbeitung');
r = await put('/api/partner-terms', { html: t2.html + '<p>Noch was</p>', base_version: 1, note: 'alt' }, { who: 'admin' });
check(r.status === 409, 'Veraltete Grundlage (Fassung 1) wird abgelehnt – nichts wird überschrieben', r.status);

console.log('Erneute Zustimmung + Shopify-Abgleich');
env.SHOPIFY_ADMIN_TOKEN = 'shpat_test';
r = await put('/api/partner-terms', { html: t2.html.replace('Neue Regelung für Testzwecke.', 'Neue Regelung, wesentlich geändert.'), base_version: 2, note: '§ 12 wesentlich geändert', reconsent: true, notify: true }, { who: 'admin' });
check(r.ok && r.version === 3 && r.shop_sync && r.shop_sync.ok, 'Fassung 3 veröffentlicht, Shopify-Seite aktualisiert', r);
check(shopCalls.length === 1 && shopCalls[0].variables.id === 'gid://shopify/Page/186627916115' && /wesentlich geändert/.test(shopCalls[0].variables.page.body), 'Shopify pageUpdate mit Seite agb-partner und neuem Text');
r = await c.get('/papi/session', { who: 'p' });
check(r.user && !r.user.consentsOk && r.user.termsOutdated && r.user.termsVersion === 3, 'Partner muss Fassung 3 bestätigen', r.user);
r = await c.get('/papi/requests', { who: 'p' }); check(r.status === 451, 'Bis dahin keine Anfragen', r.status);
r = await c.post('/papi/consents', { agb: true, privacy: true, version: 2 }, { who: 'p' }); check(r.status === 409, 'Zustimmung zu veralteter Fassung wird abgelehnt');
r = await c.post('/papi/consents', { agb: true, privacy: true, version: 3 }, { who: 'p' }); check(r.ok, 'Zustimmung zu Fassung 3');
const row = q1('SELECT agb_at, agb_version FROM partner_users WHERE id = ?', pu.id);
check(row.agb_version === 3 && row.agb_at.startsWith('2026-11-12'), 'Neuer Zustimmungszeitpunkt und Fassung gespeichert', row);
r = await c.get('/papi/session', { who: 'p' }); check(r.user.consentsOk && (await c.get('/papi/requests', { who: 'p' })).ok, 'Danach geht es normal weiter');
check(q1("SELECT detail FROM audit WHERE action = 'partner_zustimmung' ORDER BY id DESC LIMIT 1").detail.includes('"agb_fassung":3'), 'Zustimmung mit Fassung im Protokoll');
r = await c.get('/api/partner-terms', { who: 'admin' });
check(r.stats.current === 1 && r.versions.length === 3 && r.versions[0].reconsent && r.terms.shop_sync.ok, 'Übersicht: Quote 1/1, 3 Fassungen, Fassung 3 mit neuer Zustimmung');
r = await c.post('/api/partner-terms/shop-sync', {}, { who: 'admin' }); check(r.ok && r.shop_sync.ok && shopCalls.length === 2, 'Erneuter Abgleich mit der Webseite');
r = await c.post('/api/partner-terms/shop-sync', {}, { who: 'vt' }); check(r.status === 403, 'Abgleich nur für Berechtigte');

console.log('Oberflächen');
const staff = await (await c.call('GET', '/admin', null, { raw: true })).text();
check(/termsTeaser/.test(staff) && /Partner-AGB/.test(staff) && /termsPublish/.test(staff), 'Internes Dashboard: Reiter „Partner-AGB“ und Hinweis in den Einstellungen');
const partner = await (await c.call('GET', '/partner', null, { raw: true })).text();
check(/AGB für Partner/.test(partner) && /pagbShow/.test(partner) && /#\/agb/.test(partner), 'Partner-Dashboard: Menüpunkt, Seite und Link bei Zustimmung/Anmeldung');
if (!process.exitCode) console.log('OK – Partner-AGB');
