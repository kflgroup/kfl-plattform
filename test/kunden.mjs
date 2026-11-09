// Kunden: Besucher (ShopifyQL) und Kundendatenbank mit Einwilligungen – gegen ein nachgebautes Shopify
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check } from './harness.mjs';
installFetch();
setNow('2026-11-08T16:30:00Z');
// Nachgebautes Shopify: Token-Endpunkt und GraphQL
const SHOP = { tokens: 0, gql: 0, lastQuery: '', lastVars: null, expire: false };
const base = globalThis.fetch;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const CUST = (id, extra = {}) => ({ id: 'gid://shopify/Customer/' + id, firstName: 'Max', lastName: 'Muster', displayName: 'Max Muster', createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-02T10:00:00Z', state: 'ENABLED', verifiedEmail: true,
  numberOfOrders: '1', tags: [], note: null, amountSpent: { amount: '19.9', currencyCode: 'EUR' }, defaultEmailAddress: { emailAddress: 'max@kunde.test', marketingState: 'SUBSCRIBED', marketingUpdatedAt: '2026-10-01T10:00:00Z', marketingOptInLevel: 'CONFIRMED_OPT_IN' },
  defaultPhoneNumber: { phoneNumber: '+491701234567' }, defaultAddress: { company: null, address1: 'Am Markt 5', address2: null, zip: '49451', city: 'Holdorf', province: null, countryCodeV2: 'DE', phone: null },
  orders: { nodes: [{ name: '#1011', createdAt: '2026-10-03T10:00:00Z', displayFinancialStatus: 'PAID', totalPriceSet: { shopMoney: { amount: '19.9' } }, customAttributes: [{ key: 'Zustimmung digitale Inhalte', value: '03.10.2026, 12:00' }], lineItems: { nodes: [{ title: 'Ratgeber Leasing', quantity: 1 }] } }] }, ...extra });
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === 'https://3r1qns-2d.myshopify.com/admin/oauth/access_token') {
    SHOP.tokens++; const p = new URLSearchParams(init.body);
    if (p.get('client_secret') !== 'geheim' || p.get('grant_type') !== 'client_credentials') return json({ error: 'invalid_client' }, 401);
    return json({ access_token: 'tok-' + SHOP.tokens, scope: 'read_customers,read_orders,read_reports', expires_in: 86399 });
  }
  if (url === 'https://3r1qns-2d.myshopify.com/admin/api/2026-10/graphql.json') {
    SHOP.gql++; const b = JSON.parse(init.body); SHOP.lastQuery = b.query; SHOP.lastVars = b.variables;
    const tok = (init.headers || {})['X-Shopify-Access-Token'];
    if (SHOP.expire) { SHOP.expire = false; return new Response('expired', { status: 401 }); }
    if (!/^tok-\d+$/.test(tok)) return new Response('no', { status: 401 });
    if (b.query.includes('shopifyqlQuery')) {
      const T = (rows) => ({ tableData: { rows }, parseErrors: [] });
      return json({ data: { series: T([{ hour: '2026-11-08T15:00:00Z', sessions: '2', online_store_visitors: '2' }, { hour: '2026-11-08T16:00:00Z', sessions: '6', online_store_visitors: '5' }]),
        now: T([{ hour: '2026-11-08T15:00:00Z', sessions: '2', online_store_visitors: '2' }, { hour: '2026-11-08T16:00:00Z', sessions: '6', online_store_visitors: '5' }]),
        funnel: T([{ sessions: '8', online_store_visitors: '7', sessions_with_cart_additions: '2', sessions_that_reached_checkout: '1', sessions_that_completed_checkout: '1' }]),
        sources: T([{ referrer_source: 'social', referrer_name: 'instagram', sessions: '5', online_store_visitors: '4' }, { referrer_source: 'direct', referrer_name: null, sessions: '3', online_store_visitors: '3' }]),
        places: T([{ session_country: 'Germany', session_city: 'Holdorf', sessions: '6' }]), pages: T([{ landing_page_path: '/pages/traumwagen-deal', sessions: '4' }]), devices: T([{ session_device_type: 'mobile', sessions: '6' }]) } });
    }
    if (b.query.includes('customer(id:')) return json({ data: { customer: b.variables.id.endsWith('/11134009573715') ? { ...CUST('11134009573715'), addressesV2: { nodes: [{ address1: 'Am Markt 5', zip: '49451', city: 'Holdorf', countryCodeV2: 'DE' }] } } : null } });
    if (b.query.includes('customers(first: 50')) return json({ data: { customers: { pageInfo: { hasNextPage: true, endCursor: 'CUR1' }, nodes: [CUST('11134009573715'), CUST('22200000000002', { displayName: 'Ohne Formular', defaultEmailAddress: { emailAddress: 'o@kunde.test', marketingState: 'NOT_SUBSCRIBED' }, orders: { nodes: [] } })] }, customersCount: { count: 11 } } });
    return json({ data: {} });
  }
  return base(input, init);
};
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123' };
const sq = env.DB._sq, c = client(worker, env), qa = (sql, ...a) => sq.prepare(sql).all(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
for (const [key, role, name] of [['gf', 'gf', 'Greta GF'], ['bh', 'buchhaltung', 'Berta BH'], ['vt', 'vertrieb', 'Vera Vertrieb']]) {
  const r = await c.post('/api/users', { email: key + '@kfl.de', name, role_key: role }, { who: 'admin' });
  await c.post('/api/invite/accept', { token: r.invite.split('/').pop(), password: 'Passwort1234!' }, { who: key });
}
// Anfrage desselben Kunden mit Einwilligungen (wie vom Formular der Webseite)
sq.prepare("INSERT INTO requests (type, status, customer_name, email, brand, model, vehicle, customer_account, data, created_at, updated_at) VALUES ('deal', 'eingang', 'Max Muster', 'max@kunde.test', 'Audi', 'A4', 'Audi A4', '11134009573715', ?, '2026-11-01T10:00:00Z', '2026-11-01T10:00:00Z')")
  .run(JSON.stringify({ 'AGB akzeptiert': 'Ja (Version 2026-10)', 'Datenschutz akzeptiert': 'Ja (Version 2026-10)', 'Weitergabe an Partner und Kontaktaufnahme': 'Ja', 'Einwilligung Zeitpunkt': '01.11.2026, 11:00:00' }));

console.log('Ohne Shopify-Zugang');
let r = await c.get('/api/customers', { who: 'admin' }); check(r.ok && r.configured === false, 'Kundendatenbank meldet „nicht verbunden“');
r = await c.get('/api/customers/visitors', { who: 'admin' }); check(r.ok && r.configured === false, 'Besucher melden „nicht verbunden“');

env.SHOPIFY_CLIENT_ID = 'cid'; env.SHOPIFY_CLIENT_SECRET = 'geheim';
console.log('Rechte');
r = await c.get('/api/customers', { who: 'bh' }); check(r.status === 403, 'Buchhaltung sieht keine Kundendaten');
r = await c.get('/api/customers/visitors', { who: 'vt' }); check(r.status === 403, 'Vertrieb sieht keine Besucherzahlen');
r = await c.get('/api/customers', { who: 'vt' }); check(r.ok && r.configured, 'Vertrieb sieht die Kundendatenbank');
r = await c.get('/api/session', { who: 'gf' }); check(r.user.perms.includes('customers_view') && r.user.perms.includes('visitors_view'), 'Geschäftsführung hat beide Rechte');

console.log('Besucher und Herkunft');
r = await c.get('/api/customers/visitors?range=heute', { who: 'gf' });
check(r.ok && r.now.visitors === 5 && r.now.last24 === 7 && r.totals.sessions === 8 && r.totals.orders === 1 && r.range.grain === 'hour', 'Aktuelle Stunde, letzte 24 Stunden und Trichter', r.now);
check(r.sources[0].source === 'social' && r.sources[0].name === 'instagram' && r.places[0].city === 'Holdorf' && r.pages[0].path === '/pages/traumwagen-deal' && r.devices[0].device === 'mobile', 'Herkunft, Orte, Einstiegsseiten, Geräte');
check(/TIMESERIES hour SINCE today UNTIL now/.test(SHOP.lastQuery) && SHOP.tokens === 1, 'Eine Shopify-Abfrage, Token per Client-ID/Secret geholt');
await c.get('/api/customers/visitors?range=30', { who: 'gf' }); check(/TIMESERIES day SINCE -30d UNTIL today/.test(SHOP.lastQuery) && SHOP.tokens === 1, '30 Tage pro Tag, Token wiederverwendet');

console.log('Kundendatenbank');
r = await c.get('/api/customers', { who: 'admin' });
const max = r.customers.find((x) => x.id === '11134009573715'), other = r.customers.find((x) => x.id === '22200000000002');
check(r.total === 11 && r.next === 'CUR1' && max.email === 'max@kunde.test' && max.phone === '+491701234567' && max.address.city === 'Holdorf', 'Kontaktdaten, Adresse, Gesamtzahl und nächste Seite');
check(max.consents.agb && max.consents.agb.number === 1001 && max.consents.privacy && max.consents.withdrawal && max.consents.digital.order === '#1011' && max.marketing.email === 'SUBSCRIBED' && max.requests === 1, 'Einwilligungen aus Anfrage, Warenkorb und Shopify-Newsletter zusammengeführt', max.consents);
check(!other.consents.agb && !other.consents.privacy && !other.consents.digital, 'Kunde ohne Formular: Einwilligungen „nicht erfasst“');
r = await c.get('/api/customers?consent=fehlt', { who: 'admin' }); check(r.customers.length === 1 && r.customers[0].id === '22200000000002', 'Filter „Einwilligungen fehlen“');
await c.get('/api/customers?q=Muster&state=enabled&buyers=1&sort=name', { who: 'admin' });
check(SHOP.lastVars.q === '(first_name:Muster* OR last_name:Muster* OR email:Muster*) AND state:enabled AND orders_count:>0' && SHOP.lastVars.sort === 'NAME', 'Suche und Filter an Shopify übergeben', SHOP.lastVars);
await c.get('/api/customers?q=max@kunde.test', { who: 'admin' }); check(SHOP.lastVars.q === 'email:max@kunde.test*', 'Suche nach E-Mail');
check(qa("SELECT * FROM audit WHERE action = 'kunden_gesucht'").length === 2, 'Suchen werden protokolliert');

console.log('Kundenakte');
r = await c.get('/api/customers/11134009573715', { who: 'vt' });
check(r.ok && r.customer.order_list[0].digital === '03.10.2026, 12:00' && r.customer.request_list[0].number === 1001 && r.customer.addresses.length === 1, 'Bestellungen mit Zustimmung, Anfragen, Adressen');
check(qa("SELECT * FROM audit WHERE action = 'kunde_angesehen' AND entity_id = '11134009573715'").length === 1, 'Aufruf der Kundenakte steht im Protokoll');
r = await c.get('/api/customers/99999', { who: 'vt' }); check(r.status === 404, 'Unbekannter Kunde: 404');
r = await c.get('/api/customers/abc', { who: 'vt' }); check(r.status === 404 || r.status === 400, 'Ungültige Nummer abgelehnt');
check(!qa("SELECT name FROM sqlite_master WHERE type = 'table'").some((t) => /customer/i.test(t.name) && t.name !== 'customer_consents'), 'Keine Kopie der Kundendaten in der Datenbank (nur Einwilligungsnachweise)');
check(qa("SELECT name FROM pragma_table_info('customer_consents')").every((c) => !/name|email|phone|address/i.test(c.name)), 'Einwilligungsnachweise ohne Name, E-Mail, Telefon, Adresse');

console.log('Bestätigung im Kundenkonto (Hinweis auf der Webseite)');
const { sig: sigF, nowSec: nowF } = await import('./harness.mjs');
const myTok = (kid) => { const ts = nowF(); return { _kid: kid, _ts: ts, _sig: sigF(`${kid}.${ts}.my`) }; };
r = await c.post('/my/consent/status', { ...myTok('22200000000002'), version: '2026-10' }); check(r.ok && r.needed === true, 'Kunde ohne Bestätigung: Hinweis nötig');
r = await c.post('/my/consent/status', { _kid: '22200000000002', _ts: nowF(), _sig: 'falsch', version: '2026-10' }); check(r.status === 403, 'Ohne gültige Signatur abgelehnt');
r = await c.post('/my/consent', { ...myTok('22200000000002'), version: '2026-10', agb: true, privacy: false }); check(r.status === 400, 'Nur eine Bestätigung reicht nicht');
r = await c.post('/my/consent', { ...myTok('22200000000002'), version: '2026-10', agb: true, privacy: true }); check(r.ok, 'AGB, Widerrufsbelehrung und Datenschutz bestätigt');
check(qa("SELECT kind FROM customer_consents WHERE customer_account = '22200000000002' ORDER BY kind").map((x) => x.kind).join(',') === 'agb,privacy,withdrawal', 'Drei Nachweise gespeichert (mit Version, Zeitpunkt, IP als Hash)');
r = await c.post('/my/consent/status', { ...myTok('22200000000002'), version: '2026-10' }); check(r.ok && r.needed === false, 'Danach kein Hinweis mehr');
r = await c.post('/my/consent/status', { ...myTok('22200000000002'), version: '2027-01' }); check(r.ok && r.needed === true, 'Neue Version der Rechtstexte: erneut nachfragen');
r = await c.get('/api/customers', { who: 'admin' });
const oth = r.customers.find((x) => x.id === '22200000000002');
check(oth.consents.agb && oth.consents.agb.account && oth.consents.privacy && oth.consents.withdrawal && /Version 2026-10/.test(oth.consents.agb.value), 'Kundendatenbank zeigt die Bestätigung aus dem Kundenkonto', oth.consents);
r = await c.get('/api/customers?consent=fehlt', { who: 'admin' }); check(r.customers.length === 0, 'Filter „Einwilligungen fehlen“ jetzt leer');

console.log('Token läuft ab');
SHOP.expire = true; const before = SHOP.tokens;
r = await c.get('/api/customers', { who: 'admin' }); check(r.ok && SHOP.tokens === before + 1, 'Abgelaufenes Token: automatisch neu angemeldet');
env.SHOPIFY_CLIENT_SECRET = 'falsch'; SHOP.expire = true;
r = await c.get('/api/customers', { who: 'admin' }); check(r.status === 502 && /Client-ID/.test(r.error), 'Falsches Secret: verständliche Fehlermeldung', r.error);
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nKUNDEN-TEST BESTANDEN');
