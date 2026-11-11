// Kunden-Erinnerungen: Angebot nach 24 h, Nachfrage nach 5 Tagen (nur mit Einwilligung, abmeldbar),
// Statistik Warenkorb-Erinnerung mit Gutschein und automatische Verlängerung des Codes – gegen ein nachgebautes Shopify
import { makeD1, makeR2, installFetch, mails, SECRET, setNow, client, check, cron } from './harness.mjs';
installFetch();
setNow('2026-11-08T09:30:00Z');
const SHOP = { discounts: true, endsAt: '2026-11-10T22:59:59Z', updates: [], queries: [] };
const base = globalThis.fetch;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === 'https://3r1qns-2d.myshopify.com/admin/oauth/access_token') return json({ access_token: 'tok-1', scope: 'read_orders', expires_in: 86399 });
  if (url === 'https://3r1qns-2d.myshopify.com/admin/api/2026-10/graphql.json') {
    const b = JSON.parse(init.body); SHOP.queries.push(b);
    const denied = () => json({ errors: [{ message: 'Access denied for codeDiscountNodeByCode field.', extensions: { code: 'ACCESS_DENIED' } }] });
    if (b.query.includes('discountCodeBasicUpdate')) { if (!SHOP.discounts) return denied(); SHOP.updates.push(b.variables); SHOP.endsAt = b.variables.d.endsAt; return json({ data: { discountCodeBasicUpdate: { userErrors: [] } } }); }
    if (b.query.includes('codeDiscountNodeByCode')) { if (!SHOP.discounts) return denied(); return json({ data: { codeDiscountNodeByCode: b.variables.c === 'SCHNELLSEIN' ? { id: 'gid://shopify/DiscountCodeNode/1', codeDiscount: { __typename: 'DiscountCodeBasic', title: 'Schnell sein', status: 'ACTIVE', startsAt: '2026-11-08T18:00:00Z', endsAt: SHOP.endsAt, asyncUsageCount: 4 } } : null } }); }
    if (b.query.includes('abandonedCheckoutsCount')) {
      const prev = b.variables.a.includes('created_at:>=2026-09');
      const M = (a) => ({ shopMoney: { amount: String(a) } });
      return json({ data: { ab: { count: prev ? 4 : 10, precision: 'EXACT' }, sent: { count: prev ? 2 : 8, precision: 'EXACT' }, rec: { count: prev ? 0 : 3, precision: 'EXACT' },
        list: { nodes: [{ completedAt: null, totalPriceSet: M(19.9) }, { completedAt: null, totalPriceSet: M(29.9) }, { completedAt: '2026-11-01T10:00:00Z', totalPriceSet: M(9.9) }] },
        orders: { pageInfo: { hasNextPage: false }, nodes: prev ? [] : [{ totalPriceSet: M(13.93), totalDiscountsSet: M(5.97), customer: { id: 'C1' } }, { totalPriceSet: M(20.93), totalDiscountsSet: M(8.97), customer: { id: 'C2' } }, { totalPriceSet: M(6.93), totalDiscountsSet: M(2.97), customer: { id: 'C1' } }] } } });
    }
    if (b.query.includes('orders(first:100')) return json({ data: { orders: { pageInfo: { hasNextPage: false }, nodes: [] } } });
    return json({ data: {} });
  }
  return base(input, init);
};
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo', PUBLIC_ORIGIN: 'https://w.example' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
const DATA = (consent) => JSON.stringify({ Vorname: 'Max', 'AGB akzeptiert': 'Ja (Version 2026-10)', 'Datenschutz akzeptiert': 'Ja (Version 2026-10)', ...(consent ? { 'Einwilligung Feedback und Erinnerungen': 'Ja (Version 2026-10)' } : {}) });
const addReq = (email, status, extra = {}, consent = false) => {
  const cols = { type: 'deal', status, customer_name: 'Max Muster', email, brand: 'Audi', model: 'A4', vehicle: 'Audi A4', data: DATA(consent), created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z', ...extra };
  return sq.prepare(`INSERT INTO requests (${Object.keys(cols).join(',')}) VALUES (${Object.keys(cols).map(() => '?').join(',')})`).run(...Object.values(cols)).lastInsertRowid;
};
const mailTo = (to, re) => mails.filter((m) => m.to.some((x) => x.email === to) && re.test(m.subject));
const linkIn = (m, path) => { const h = m.htmlContent.match(new RegExp(`https://w\\.example${path.replace('/', '\\/')}\\?[^"]+`)); return h && h[0].replace(/&amp;/g, '&'); };

// Tagesjobs (Backup, Mahnungen, FiBu …) laufen zuerst; Erinnerungen laufen nur in Cron-Läufen ohne Tagesjob
for (let i = 0; i < 6; i++) await cron(worker, env);
console.log('Erinnerung an ein vorgestelltes Angebot (24 h ohne Reaktion)');
const r1 = addReq('frisch@kunde.test', 'angebot_beim_kunden', { presented_at: '2026-11-08T00:00:00Z' });
const r2 = addReq('wartet@kunde.test', 'angebot_beim_kunden', { presented_at: '2026-11-07T08:00:00Z' });
const r3 = addReq('entschieden@kunde.test', 'angebot_akzeptiert', { presented_at: '2026-11-06T08:00:00Z', decided_at: '2026-11-06T12:00:00Z' });
await cron(worker, env); await cron(worker, env);
check(mailTo('wartet@kunde.test', /wartet auf dich/).length === 1, 'Kunde ohne Reaktion nach 24 h erinnert (auch ohne Werbeeinwilligung)');
const rem = mailTo('wartet@kunde.test', /wartet auf dich/)[0];
check(rem && /Angebote ansehen/.test(rem.htmlContent) && /Support/.test(rem.htmlContent) && /meine-anfragen#anfrage-/.test(rem.htmlContent), 'Erinnerung mit Link zum Angebot und Hilfe-Angebot');
check(!mailTo('frisch@kunde.test', /wartet/).length && !mailTo('entschieden@kunde.test', /wartet/).length, 'Keine Erinnerung vor 24 h oder nach Entscheidung');
check(q1("SELECT COUNT(*) AS n FROM events WHERE request_id = ? AND action = 'kunde_erinnert'", r2).n === 1, 'Erinnerung im Verlauf der Anfrage');
await cron(worker, env); await cron(worker, env);
check(mailTo('wartet@kunde.test', /wartet auf dich/).length === 1, 'Erinnerung nur einmal');

console.log('Nachfrage nach 5 Tagen: Zufriedenheit und Partnerkontakt (nur mit Einwilligung)');
const s1 = addReq('ja@kunde.test', 'kontaktdaten_versendet', { decided_at: '2026-11-02T09:00:00Z', won_assignment_id: 1 }, true);
const s2 = addReq('nein@kunde.test', 'kontaktdaten_versendet', { decided_at: '2026-11-02T09:00:00Z', won_assignment_id: 1 }, false);
const s3 = addReq('zufrueh@kunde.test', 'kontaktdaten_versendet', { decided_at: '2026-11-05T09:00:00Z', won_assignment_id: 1 }, true);
await cron(worker, env); await cron(worker, env);
const sv = mailTo('ja@kunde.test', /Wie zufrieden bist du mit KFL/);
check(sv.length === 1, 'Kunde mit Einwilligung bekommt die Nachfrage');
check(sv[0] && /Hat sich der Partner bei dir gemeldet/.test(sv[0].htmlContent) && /Anfragetool/.test(sv[0].htmlContent) && /Hier abmelden/.test(sv[0].htmlContent), 'Fragt nach Anfragetool, Service und Partnerkontakt, mit Abmeldelink');
check(!mailTo('nein@kunde.test', /zufrieden/).length, 'Ohne Einwilligung keine Nachfrage');
check(!mailTo('zufrueh@kunde.test', /zufrieden/).length, 'Nicht vor Ablauf der 5 Tage');
await cron(worker, env); await cron(worker, env);
check(mailTo('ja@kunde.test', /Wie zufrieden bist du mit KFL/).length === 1, 'Nachfrage nur einmal');

console.log('Antworten aus der Mail');
let r = await c.post(linkIn(sv[0], '/c/survey').replace(/r=\d/, 'r=2').replace('https://w.example', ''), {}, { who: 'kunde' });
check(r.status === 200 && /Das tut uns leid/.test(r._text || ''), 'Bewertung 2 von 5 gespeichert, Seite bietet Hilfe an');
check(q1("SELECT rating FROM surveys WHERE request_id = ? AND kind = 'service'", s1).rating === 2, 'Bewertung als Service-Umfrage gespeichert');
check(q1("SELECT COUNT(*) AS n FROM notifications WHERE title LIKE ?", `%Kunde unzufrieden (2 von 5)%`).n >= 1, 'Team wird bei schlechter Bewertung benachrichtigt');
r = await c.post(linkIn(sv[0], '/c/feedback').replace('https://w.example', '').replace('a=ja', 'a=nein'), {}, { who: 'kunde' });
check(q1('SELECT feedback_state FROM requests WHERE id = ?', s1).feedback_state === 'nein', 'Antwort „Partner hat sich nicht gemeldet“ gespeichert');

console.log('Abmelden von Umfragen');
const s4 = addReq('ja@kunde.test', 'kontaktdaten_versendet', { decided_at: '2026-11-02T10:00:00Z', won_assignment_id: 1 }, true);
r = await c.post(linkIn(sv[0], '/c/optout').replace('https://w.example', ''), {}, { who: 'kunde' });
check(r.status === 200 && q1('SELECT feedback_optout FROM requests WHERE id = ?', s4).feedback_optout === 1, 'Abmeldung gilt für alle Anfragen dieser E-Mail-Adresse');
await cron(worker, env); await cron(worker, env);
check(mailTo('ja@kunde.test', /Wie zufrieden bist du mit KFL/).length === 1, 'Nach der Abmeldung keine weitere Umfrage');
r = await c.get('/c/optout?r=' + (s1 + 1000) + '&t=' + 'x'.repeat(40), { who: 'kunde' });
check(r.status !== 500 && /ungültig/.test(r._text || ''), 'Gefälschter Abmeldelink abgelehnt');

console.log('Einstellungen');
r = await c.patch('/api/settings', { cart_code: 'schnell sein' }, { who: 'admin' });
r = await c.get('/api/settings', { who: 'admin' });
check(r.settings.cart_code === 'SCHNELLSEIN' && r.settings.offer_reminder_hours === 24 && r.settings.service_survey_days === 5, 'Code ohne Leerzeichen in Großbuchstaben, Standardfristen 24 h und 5 Tage');
r = await c.patch('/api/settings', { cart_code: 'SCHNELL!' }, { who: 'admin' }); check(r.status === 400, 'Ungültiger Code abgelehnt');

console.log('Statistik: Warenkorb-Erinnerung mit Gutschein');
r = await c.get('/api/stats/shop?from=2026-10-10&to=2026-11-08', { who: 'admin' });
check(r.ok && r.configured === false, 'Ohne Shopify-Zugang „nicht verbunden“');
env.SHOPIFY_CLIENT_ID = 'cid'; env.SHOPIFY_CLIENT_SECRET = 'geheim';
r = await c.get('/api/stats/shop?from=2026-10-10&to=2026-11-08', { who: 'admin' });
const k = r.cart;
check(k && k.abandoned === 10 && k.sent === 8 && k.recovered === 3, 'Abgebrochene Kassen, versendete Codes und wiederhergestellte Käufe', k);
check(k.code_orders === 3 && k.code_customers === 2 && k.code_revenue === 41.79 && k.code_discount === 17.91 && k.conversion === 37.5, 'Käufe und Kunden mit Code, Umsatz, Rabatt und Einlösequote', k);
check(k.abandoned_open_value === 49.8 && k.prev && k.prev.abandoned === 4, 'Offener Warenwert und Vorzeitraum');
check(r.cart_code && r.cart_code.status === 'ACTIVE' && r.cart_code.used === 4, 'Status und Einlösungen des Codes');
const qa = SHOP.queries.find((x) => x.query.includes('abandonedCheckoutsCount'));
check(qa && /email_state:sent/.test(qa.variables.s) && /recovery_state:recovered/.test(qa.variables.r) && /discount_code:SCHNELLSEIN/.test(qa.variables.o) && /created_at:<2026-11-09/.test(qa.variables.a), 'Abfragen filtern Zeitraum, Versand, Wiederherstellung und Code');

console.log('Gutschein automatisch verlängern');
let j = await c.post('/api/jobs/run', { job: 'gutschein' }, { who: 'admin' });
check(SHOP.updates.length === 1 && SHOP.updates[0].d.endsAt === '2026-12-10T22:59:59.000Z', 'Läuft in 2 Tagen ab → um 30 Tage verlängert (bis 10.12.)', SHOP.updates);
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'gutschein_verlaengert'").n === 1, 'Verlängerung im Protokoll');
SHOP.discounts = false; SHOP.endsAt = '2026-11-09T22:59:59Z';
r = await c.get('/api/stats/shop?from=2026-10-10&to=2026-11-08', { who: 'admin' });
check(r.cart && r.cart.sent === 8 && r.cart_code && /read_discounts/.test(r.cart_code.error), 'Fehlender Rabatt-Zugriff blockiert die Zahlen nicht');
