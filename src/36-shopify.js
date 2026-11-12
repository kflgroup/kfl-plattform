/* ============================================================
   Shopify-Anbindung: Zugang, Besucher-Analysen (ShopifyQL) und Kundendatenbank
   Zugang (eins von beiden, als Secret im Worker):
   - SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET: App aus dem Shopify Dev Dashboard (seit 2026 Standard);
     Token per „client credentials grant“, 24 Stunden gültig, wird je Worker-Instanz zwischengespeichert
   - SHOPIFY_ADMIN_TOKEN: Token einer alten, vor 2026 im Shopify-Admin angelegten App
   Benötigte Zugriffe der App: read_customers, read_orders, read_reports und Zugriff auf geschützte
   Kundendaten (Name, E-Mail, Telefon, Adresse).
   Kundendaten werden live abgerufen und NICHT in der Datenbank der Plattform gespeichert.
   ============================================================ */

const SHOPIFY_API = '2026-10';
const shopDomain = (env) => String(env.SHOPIFY_SHOP || '3r1qns-2d.myshopify.com').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^([a-z0-9-]+)$/i, '$1.myshopify.com');
const shopifyConfigured = (env) => !!(env.SHOPIFY_ADMIN_TOKEN || (env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET));
let SHOPIFY_TOKEN = null; // { token, exp } – nur im Arbeitsspeicher, nie in der Datenbank

async function shopifyToken(env, { renew = false } = {}) {
  if (env.SHOPIFY_ADMIN_TOKEN) return env.SHOPIFY_ADMIN_TOKEN;
  need(env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET, 503, 'Shopify ist noch nicht verbunden.');
  if (!renew && SHOPIFY_TOKEN && SHOPIFY_TOKEN.exp > Date.now() + 120e3) return SHOPIFY_TOKEN.token;
  const res = await fetch(`https://${shopDomain(env)}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET }).toString() });
  let j = null; try { j = await res.json(); } catch (e) { /* keine JSON-Antwort */ }
  if (!res.ok || !j || !j.access_token) throw new HttpError(502, `Shopify-Anmeldung fehlgeschlagen (${res.status}${j && (j.error_description || j.error) ? ': ' + (j.error_description || j.error) : ''}). Bitte Client-ID, Secret und die Installation der App prüfen.`);
  SHOPIFY_TOKEN = { token: j.access_token, exp: Date.now() + (toInt(j.expires_in, 86399) * 1000) };
  return SHOPIFY_TOKEN.token;
}
// GraphQL Admin API; bei abgelaufenem Token einmal neu anmelden
async function shopifyGql(env, query, variables = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await shopifyToken(env, { renew: attempt > 0 });
    const res = await fetch(`https://${shopDomain(env)}/admin/api/${SHOPIFY_API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    if (res.status === 401 && attempt === 0 && !env.SHOPIFY_ADMIN_TOKEN) { SHOPIFY_TOKEN = null; continue; }
    if (!res.ok) throw new HttpError(502, `Shopify antwortet mit Fehler ${res.status}.`);
    const j = await res.json();
    if (j.errors && j.errors.length) {
      const msg = j.errors.map((e) => e.message).join(' · ');
      if (/access denied|not approved|ACCESS_DENIED/i.test(msg + JSON.stringify(j.errors))) throw new HttpError(403, 'Der Shopify-App fehlt eine Berechtigung: ' + msg.slice(0, 240));
      throw new HttpError(502, 'Shopify: ' + msg.slice(0, 240));
    }
    return j.data;
  }
  throw new HttpError(502, 'Shopify-Anmeldung fehlgeschlagen.');
}

/* ---------- Besucher (ShopifyQL) ---------- */
const VISITOR_RANGES = { heute: { since: 'today', grain: 'hour', label: 'Heute' }, '7': { since: '-7d', grain: 'day', label: '7 Tage' }, '30': { since: '-30d', grain: 'day', label: '30 Tage' }, '90': { since: '-90d', grain: 'week', label: '90 Tage' } };
const qlRows = (r) => (r && r.tableData && r.tableData.rows) || [];
const qlNum = (v) => toNum(v, 0) || 0;
async function shopifyVisitors(env, rangeKey) {
  const R = VISITOR_RANGES[rangeKey] || VISITOR_RANGES['7'];
  const span = `SINCE ${R.since} UNTIL ${R.since === 'today' ? 'now' : 'today'}`;
  const ql = (alias, q) => `${alias}: shopifyqlQuery(query: ${JSON.stringify(q)}) { tableData { rows } parseErrors }`;
  // alles in einer Anfrage (eine Verbindung zu Shopify)
  const d = await shopifyGql(env, `{
    ${ql('series', `FROM sessions SHOW sessions, online_store_visitors TIMESERIES ${R.grain} ${span}`)}
    ${ql('now', 'FROM sessions SHOW sessions, online_store_visitors TIMESERIES hour SINCE -1d UNTIL now')}
    ${ql('funnel', `FROM sessions SHOW sessions, online_store_visitors, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout ${span}`)}
    ${ql('sources', `FROM sessions SHOW sessions, online_store_visitors GROUP BY referrer_source, referrer_name ${span} ORDER BY sessions DESC LIMIT 12`)}
    ${ql('places', `FROM sessions SHOW sessions GROUP BY session_country, session_city ${span} ORDER BY sessions DESC LIMIT 12`)}
    ${ql('pages', `FROM sessions SHOW sessions GROUP BY landing_page_path ${span} ORDER BY sessions DESC LIMIT 10`)}
    ${ql('devices', `FROM sessions SHOW sessions GROUP BY session_device_type ${span} ORDER BY sessions DESC`)}
  }`);
  const errs = Object.values(d).flatMap((x) => (x && x.parseErrors) || []);
  if (errs.length) console.log('ShopifyQL', errs.join(' · '));
  const f = qlRows(d.funnel)[0] || {};
  const hours = qlRows(d.now);
  const last = hours.length ? hours[hours.length - 1] : null, prev = hours.length > 1 ? hours[hours.length - 2] : null;
  return {
    range: { key: VISITOR_RANGES[rangeKey] ? rangeKey : '7', label: R.label, grain: R.grain },
    now: { hour: last ? last.hour : null, sessions: qlNum(last && last.sessions), visitors: qlNum(last && last.online_store_visitors), prevSessions: qlNum(prev && prev.sessions),
      last24: hours.reduce((s, h) => s + qlNum(h.online_store_visitors), 0) },
    totals: { sessions: qlNum(f.sessions), visitors: qlNum(f.online_store_visitors), cart: qlNum(f.sessions_with_cart_additions), checkout: qlNum(f.sessions_that_reached_checkout), orders: qlNum(f.sessions_that_completed_checkout) },
    series: qlRows(d.series).map((r) => ({ t: r[R.grain], sessions: qlNum(r.sessions), visitors: qlNum(r.online_store_visitors) })),
    sources: qlRows(d.sources).map((r) => ({ source: r.referrer_source || 'unbekannt', name: r.referrer_name || '', sessions: qlNum(r.sessions), visitors: qlNum(r.online_store_visitors) })),
    places: qlRows(d.places).map((r) => ({ country: r.session_country || '', city: r.session_city || '', sessions: qlNum(r.sessions) })),
    pages: qlRows(d.pages).map((r) => ({ path: r.landing_page_path || '/', sessions: qlNum(r.sessions) })),
    devices: qlRows(d.devices).map((r) => ({ device: r.session_device_type || 'unbekannt', sessions: qlNum(r.sessions) }))
  };
}

/* ---------- Kundendatenbank ---------- */
const CUSTOMER_FIELDS = `id firstName lastName displayName createdAt updatedAt state verifiedEmail numberOfOrders tags note
  amountSpent { amount currencyCode }
  defaultEmailAddress { emailAddress marketingState marketingUpdatedAt marketingOptInLevel }
  defaultPhoneNumber { phoneNumber }
  defaultAddress { company address1 address2 zip city province countryCodeV2 phone }`;
const gidNum = (gid) => String(gid || '').split('/').pop();
const CONSENT_KEYS = { agb: 'AGB akzeptiert', privacy: 'Datenschutz akzeptiert', partner: 'Weitergabe an Partner und Kontaktaufnahme' };
const isYes = (v) => /^ja/i.test(String(v || '').trim());
// Einwilligungen aus den Anfragen der Plattform (Formulare der Webseite), je Shopify-Kundennummer
async function consentsFromRequests(ctx, ids) {
  const out = {}; if (!ids.length) return out;
  const rows = await DB.all(ctx.db, `SELECT id, type, status, created_at, customer_account, data FROM requests WHERE deleted = 0 AND customer_account IN (${ids.map(() => '?').join(',')}) ORDER BY id DESC`, ...ids);
  for (const r of rows) {
    const d = jparse(r.data, {}), o = out[r.customer_account] || (out[r.customer_account] = { requests: [], agb: null, privacy: null, withdrawal: null, partner: null });
    const at = d['Einwilligung Zeitpunkt'] || d['Eingang (Server)'] || fmtDE(msOf(r.created_at));
    const src = { number: toNumber(r.id), type: r.type, at, created_at: r.created_at };
    o.requests.push({ number: toNumber(r.id), type: r.type, status: r.status, created_at: r.created_at, agb: d[CONSENT_KEYS.agb] || null, privacy: d[CONSENT_KEYS.privacy] || null, partner: d[CONSENT_KEYS.partner] || null });
    // neueste Zustimmung zählt (Liste ist absteigend sortiert)
    if (!o.agb && isYes(d[CONSENT_KEYS.agb])) o.agb = { ...src, value: d[CONSENT_KEYS.agb] };
    if (!o.privacy && isYes(d[CONSENT_KEYS.privacy])) o.privacy = { ...src, value: d[CONSENT_KEYS.privacy] };
    // Kenntnisnahme der Widerrufsbelehrung ist Teil der AGB-Bestätigung bei Dein Auto-DEAL und Auto verkaufen
    if (!o.withdrawal && isYes(d[CONSENT_KEYS.agb]) && (r.type === 'deal' || r.type === 'sell')) o.withdrawal = { ...src, value: 'Widerrufsbelehrung zur Kenntnis genommen (' + d[CONSENT_KEYS.agb] + ')' };
    if (!o.partner && isYes(d[CONSENT_KEYS.partner])) o.partner = { ...src, value: d[CONSENT_KEYS.partner] };
  }
  // Bestätigungen im Kundenkonto (Hinweis auf der Webseite) – die jeweils neueste Erklärung zählt
  const cc = await DB.all(ctx.db, `SELECT customer_account, kind, version, text, source, created_at FROM customer_consents WHERE customer_account IN (${ids.map(() => '?').join(',')}) ORDER BY id DESC`, ...ids);
  const KEY = { agb: 'agb', privacy: 'privacy', withdrawal: 'withdrawal' };
  for (const c of cc) {
    const o = out[c.customer_account] || (out[c.customer_account] = { requests: [], agb: null, privacy: null, withdrawal: null, partner: null });
    const k = KEY[c.kind]; if (!k) continue;
    const cur = o[k];
    if (!cur || String(cur.created_at || '') < c.created_at) o[k] = { account: true, source: c.source || 'Kundenkonto', value: c.text, at: fmtDE(msOf(c.created_at)), created_at: c.created_at, version: c.version };
  }
  return out;
}
// Zustimmung zum vorzeitigen Beginn bei digitalen Inhalten (Warenkorb-Checkbox, an der Bestellung gespeichert)
const DIGITAL_KEY = 'Zustimmung digitale Inhalte';
const digitalConsent = (orders) => { for (const o of orders || []) { const a = (o.customAttributes || []).find((x) => x.key === DIGITAL_KEY && x.value); if (a) return { order: o.name, at: a.value, created_at: o.createdAt }; } return null; };
const marketingLabel = (s) => ({ SUBSCRIBED: 'angemeldet', NOT_SUBSCRIBED: 'nicht angemeldet', PENDING: 'Bestätigung offen', UNSUBSCRIBED: 'abgemeldet', REDACTED: 'gelöscht', INVALID: 'ungültig' }[s] || (s ? String(s).toLowerCase() : '–'));
function customerView(c, cons) {
  const id = gidNum(c.id), k = cons[id] || {}, e = c.defaultEmailAddress || {}, a = c.defaultAddress || null, orders = (c.orders && c.orders.nodes) || [];
  return { id, name: c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(ohne Namen)', first_name: c.firstName || '', last_name: c.lastName || '',
    created_at: c.createdAt, updated_at: c.updatedAt, state: c.state, verified: !!c.verifiedEmail, orders: toInt(c.numberOfOrders, 0), spent: c.amountSpent ? qlNum(c.amountSpent.amount) : 0, tags: c.tags || [], note: c.note || '',
    email: e.emailAddress || '', phone: (c.defaultPhoneNumber && c.defaultPhoneNumber.phoneNumber) || (a && a.phone) || '',
    address: a ? { company: a.company || '', street: [a.address1, a.address2].filter(Boolean).join(', '), zip: a.zip || '', city: a.city || '', country: a.countryCodeV2 || '' } : null,
    marketing: { email: e.marketingState || null, label: marketingLabel(e.marketingState), updated_at: e.marketingUpdatedAt || null, level: e.marketingOptInLevel || null },
    consents: { agb: k.agb || null, privacy: k.privacy || null, withdrawal: k.withdrawal || null, partner: k.partner || null, digital: digitalConsent(orders) },
    requests: (k.requests || []).length };
}
const CUSTOMER_SORT = { neu: ['CREATED_AT', true], alt: ['CREATED_AT', false], name: ['NAME', false], aktualisiert: ['UPDATED_AT', true] };
async function shopifyCustomers(ctx, q) {
  const [sortKey, reverse] = CUSTOMER_SORT[q.sort] || CUSTOMER_SORT.neu;
  const terms = [];
  const s = str(q.q, 120).replace(/["\\]/g, '');
  if (s) terms.push(/@/.test(s) ? `email:${s}*` : /^[+\d][\d\s/-]{5,}$/.test(s) ? `phone:*${s.replace(/\D/g, '').slice(-8)}*` : `(first_name:${s}* OR last_name:${s}* OR email:${s}*)`);
  if (['enabled', 'invited', 'disabled', 'declined'].includes(q.state)) terms.push(`state:${q.state}`);
  if (q.buyers === '1') terms.push('orders_count:>0');
  if (q.newsletter === '1') terms.push('email_marketing_state:subscribed');
  const d = await shopifyGql(ctx.env, `query($q:String,$after:String,$sort:CustomerSortKeys,$rev:Boolean){
    customers(first: 50, after: $after, query: $q, sortKey: $sort, reverse: $rev) { pageInfo { hasNextPage endCursor } nodes { ${CUSTOMER_FIELDS} orders(first: 5, sortKey: CREATED_AT, reverse: true) { nodes { name createdAt customAttributes { key value } } } } }
    customersCount { count } }`, { q: terms.join(' AND ') || null, after: q.after || null, sort: sortKey, rev: reverse });
  const ids = d.customers.nodes.map((c) => gidNum(c.id));
  const cons = await consentsFromRequests(ctx, ids);
  let list = d.customers.nodes.map((c) => customerView(c, cons));
  if (q.consent === 'fehlt') list = list.filter((c) => !c.consents.agb || !c.consents.privacy);
  if (q.consent === 'ok') list = list.filter((c) => c.consents.agb && c.consents.privacy);
  return { customers: list, total: d.customersCount ? toInt(d.customersCount.count, 0) : null, next: d.customers.pageInfo.hasNextPage ? d.customers.pageInfo.endCursor : null };
}
async function shopifyCustomer(ctx, id) {
  need(/^\d{1,20}$/.test(String(id)), 400, 'Ungültige Kundennummer.');
  const d = await shopifyGql(ctx.env, `query($id:ID!){ customer(id:$id) { ${CUSTOMER_FIELDS}
    addressesV2(first: 10) { nodes { company address1 address2 zip city countryCodeV2 phone } }
    orders(first: 25, sortKey: CREATED_AT, reverse: true) { nodes { name createdAt displayFinancialStatus totalPriceSet { shopMoney { amount } } customAttributes { key value } lineItems(first: 5) { nodes { title quantity } } } } } }`, { id: `gid://shopify/Customer/${id}` });
  need(d.customer, 404, 'Kunde nicht gefunden.');
  const cons = await consentsFromRequests(ctx, [String(id)]);
  const v = customerView(d.customer, cons);
  v.addresses = ((d.customer.addressesV2 && d.customer.addressesV2.nodes) || []).map((a) => ({ company: a.company || '', street: [a.address1, a.address2].filter(Boolean).join(', '), zip: a.zip || '', city: a.city || '', country: a.countryCodeV2 || '', phone: a.phone || '' }));
  v.order_list = d.customer.orders.nodes.map((o) => ({ name: o.name, created_at: o.createdAt, status: o.displayFinancialStatus, total: qlNum(o.totalPriceSet.shopMoney.amount),
    items: o.lineItems.nodes.map((l) => `${l.quantity}× ${l.title}`).join(', '), digital: ((o.customAttributes || []).find((x) => x.key === DIGITAL_KEY) || {}).value || null }));
  v.consents.digital = digitalConsent(d.customer.orders.nodes);
  v.request_list = (cons[String(id)] || {}).requests || [];
  return v;
}

/* ---------- Warenkorb-Erinnerung mit Gutscheincode (Versand über Shopify-Automatisierung) ---------- */
// Abgebrochene Kassen, versendete Erinnerungen (enthalten den Code), wiederhergestellte Käufe und Bestellungen mit dem Code
async function shopifyCartStats(env, from, to, code) {
  const span = `created_at:>=${from} created_at:<${addDaysDate(to, 1)}`;
  const d = await shopifyGql(env, `query($a:String!,$s:String!,$r:String!,$o:String!){
    ab: abandonedCheckoutsCount(query:$a){count precision}
    sent: abandonedCheckoutsCount(query:$s){count precision}
    rec: abandonedCheckoutsCount(query:$r){count precision}
    list: abandonedCheckouts(first:100, query:$a){ nodes { completedAt totalPriceSet{shopMoney{amount}} } }
    orders(first:100, query:$o){ pageInfo{hasNextPage} nodes { totalPriceSet{shopMoney{amount}} totalDiscountsSet{shopMoney{amount}} customer{id} } } }`,
  { a: span, s: span + ' email_state:sent', r: span + ' recovery_state:recovered', o: `${span} discount_code:${code}` });
  const amt = (m) => qlNum(m && m.shopMoney && m.shopMoney.amount);
  const open = d.list.nodes.filter((x) => !x.completedAt);
  const orders = d.orders.nodes;
  const customers = new Set(orders.map((o) => (o.customer && o.customer.id) || Math.random()));
  const sent = d.sent.count, buyers = orders.length;
  return {
    code, abandoned: d.ab.count, abandoned_open_value: round2(open.reduce((a, x) => a + amt(x.totalPriceSet), 0)), sent, recovered: d.rec.count,
    code_orders: buyers, code_customers: customers.size, code_revenue: round2(orders.reduce((a, o) => a + amt(o.totalPriceSet), 0)),
    code_discount: round2(orders.reduce((a, o) => a + amt(o.totalDiscountsSet), 0)), more: !!d.orders.pageInfo.hasNextPage,
    conversion: sent ? round2((buyers / sent) * 100) : null, recovery_rate: d.ab.count ? round2((d.rec.count / d.ab.count) * 100) : null
  };
}
const CART_CODE_Q = `query($c:String!){ codeDiscountNodeByCode(code:$c){ id codeDiscount { __typename ... on DiscountCodeBasic { title status startsAt endsAt asyncUsageCount } } } }`;
async function shopifyCartCode(env, code) {
  const d = await shopifyGql(env, CART_CODE_Q, { c: code });
  const n = d.codeDiscountNodeByCode; if (!n) return null;
  const c = n.codeDiscount || {};
  return { id: n.id, title: c.title || '', status: c.status || '', starts_at: c.startsAt || null, ends_at: c.endsAt || null, used: toInt(c.asyncUsageCount, 0) };
}
// Täglich: Gutschein kurz vor (oder kurz nach) Ablauf automatisch um cart_code_days verlängern
async function renewCartCode(ctx, s) {
  if (!shopifyConfigured(ctx.env) || !s.cart_code_renew || !s.cart_code) return 'aus';
  let c;
  try { c = await shopifyCartCode(ctx.env, s.cart_code); } catch (e) { return cartCodeWarn(ctx, e); }
  if (!c) return 'Code nicht gefunden';
  if (!c.ends_at) return 'unbefristet';
  const end = msOf(c.ends_at), now = nowMs();
  if (end - now > 3 * 86400e3) return 'gültig bis ' + berlinDate(end);
  if (now - end > 2 * 86400e3) return 'abgelaufen (manuell beendet?)';
  const day = addDaysDate(berlinDate(Math.max(end, now)), toInt(s.cart_code_days, 30) || 30);
  const [y, m, dd] = day.split('-').map(Number);
  const endsAt = isoOf(berlinToUtc(y, m, dd + 1) - 1000);
  try {
    const r = await shopifyGql(ctx.env, `mutation($id:ID!,$d:DiscountCodeBasicInput!){ discountCodeBasicUpdate(id:$id, basicCodeDiscount:$d){ userErrors{ message } } }`, { id: c.id, d: { endsAt } });
    const errs = r.discountCodeBasicUpdate.userErrors || [];
    if (errs.length) return 'Fehler: ' + errs.map((x) => x.message).join(' · ');
  } catch (e) { return cartCodeWarn(ctx, e); }
  await audit(ctx, 'gutschein_verlaengert', 'gutschein', s.cart_code, { bis: day });
  return 'verlängert bis ' + day;
}
async function cartCodeWarn(ctx, e) {
  if (!(e instanceof HttpError) || e.status !== 403) throw e;
  const last = await rawSetting(ctx.db, '_cart_code_warn');
  if (!last || nowMs() - msOf(last) > 7 * 86400e3) {
    await ctx.db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_cart_code_warn', ?, ?, 'system')").bind(nowIso(), nowIso()).run();
    await notifyStaff(ctx, { perm: 'stats_shop' }, { kind: 'fehler', title: 'Gutschein kann nicht automatisch verlängert werden', body: 'Der Shopify-App fehlen die Zugriffe read_discounts und write_discounts. Bitte im Shopify Dev Dashboard ergänzen oder den Code in Shopify selbst verlängern.', link: '#/statistik/shop' });
  }
  return 'Berechtigung fehlt';
}

/* ---------- Firmenlogo für beide Dashboards (Bild aus Shopify → Dateien, über die eigene Adresse ausgeliefert) ---------- */
let BRAND_LOGO = null; // { url, body, type, at } – je Worker-Instanz zwischengespeichert
const logoUrlOk = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && /(^|\.)(shopify\.com|kfl-group\.com)$/i.test(x.hostname); } catch (e) { return false; } };
async function brandLogoResponse(ctx) {
  const url = String((await settingsOf(ctx)).brand_logo_url || '').trim();
  const head = { 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' };
  const none = () => new Response(null, { status: 404, headers: { ...head, 'Cache-Control': 'public, max-age=300' } });
  if (!logoUrlOk(url)) return none();
  if (!BRAND_LOGO || BRAND_LOGO.url !== url || nowMs() - BRAND_LOGO.at > 864e5) {
    try {
      const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
      const type = (res.headers.get('Content-Type') || '').split(';')[0].trim();
      const body = res.ok && /^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(type) ? await res.arrayBuffer() : null;
      if (!body || body.byteLength > 2e6) return BRAND_LOGO && BRAND_LOGO.url === url ? new Response(BRAND_LOGO.body, { headers: { ...head, 'Content-Type': BRAND_LOGO.type } }) : none();
      BRAND_LOGO = { url, body, type, at: nowMs() };
    } catch (e) { if (!BRAND_LOGO || BRAND_LOGO.url !== url) return none(); }
  }
  const extra = BRAND_LOGO.type === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {};
  return new Response(BRAND_LOGO.body, { headers: { ...head, ...extra, 'Content-Type': BRAND_LOGO.type } });
}
