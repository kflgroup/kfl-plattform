/* ===== Suche in der Kopfzeile: Anfragen, Kunden, Geschäftspartner, Partnerkonten, Mitarbeiter, Lieferanten, Support =====
   Jede Gruppe nur mit dem passenden Recht. E-Mail-Adressen werden über alle Bereiche hinweg gefunden. */
const likeOf = (s) => '%' + String(s).toLowerCase().replace(/[\\%_]/g, (c) => '\\' + c) + '%';
// Geschäftspartner zu einer E-Mail-Adresse: Partnerkonto, allgemeine oder Rechnungs-E-Mail, Ansprechpartner ohne Konto
async function partnerByEmail(ctx, email) {
  const e = String(email || '').trim().toLowerCase(); if (!emailOk(e)) return null;
  const u = await DB.one(ctx.db, 'SELECT o.id, o.name, o.city, o.active, u.id AS user_id, u.name AS user_name, u.role, u.active AS user_active FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE lower(u.email) = ? AND o.deleted = 0', e);
  if (u) return { org_id: u.id, org_name: u.name, city: u.city || '', active: !!u.active, via: 'konto', user: { id: u.user_id, name: u.user_name, role: u.role, active: !!u.user_active } };
  const o = await DB.one(ctx.db, "SELECT id, name, city, active, lower(email) AS email, lower(billing_email) AS billing_email FROM orgs WHERE deleted = 0 AND (lower(email) = ? OR lower(billing_email) = ? OR instr(lower(contacts), ?) > 0) ORDER BY id LIMIT 1", e, e, '"' + e + '"');
  if (o) return { org_id: o.id, org_name: o.name, city: o.city || '', active: !!o.active, via: o.email === e ? 'firma' : o.billing_email === e ? 'rechnung' : 'ansprechpartner', user: null };
  return null;
}
async function globalSearch(ctx, u, raw) {
  const db = ctx.db, q = str(raw, 100).trim(), out = { q, groups: [] };
  if (q.length < 2) return out;
  const like = likeOf(q), isMail = /@/.test(q), num = /^#?\d{3,}$/.test(q) ? fromNumber(q) : null;
  const add = (key, label, items, more) => { if (items.length) out.groups.push({ key, label, items, more: !!more }); };
  if (can(u, 'req_view')) {
    // E-Mail und Telefon der Kunden nur mit dem Recht „Kontaktdaten sehen“
    const cols = ['customer_name', 'vehicle', 'brand', 'model', 'plz', ...(can(u, 'req_contact') ? ['email', 'phone'] : [])];
    const rows = await DB.all(db, `SELECT id, type, status, customer_name, email, vehicle, created_at FROM requests WHERE deleted = 0 AND (${cols.map((c) => `lower(${c}) LIKE ? ESCAPE '\\'`).join(' OR ')}${num ? ' OR id = ?' : ''}) ORDER BY id DESC LIMIT 11`, ...cols.map(() => like), ...(num ? [num] : []));
    add('anfragen', 'Anfragen', rows.slice(0, 10).map((r) => ({ title: `#${toNumber(r.id)} · ${r.customer_name || 'Kunde'}`, sub: [r.vehicle, REQUEST_TYPES[r.type] ? REQUEST_TYPES[r.type].label : r.type, can(u, 'req_contact') ? r.email : ''].filter(Boolean).join(' · '), status: r.status, date: r.created_at, href: `#/anfragen/${toNumber(r.id)}` })), rows.length > 10);
  }
  if (can(u, 'partner_view')) {
    const orgs = await DB.all(db, `SELECT id, name, city, zip, email, billing_email, active FROM orgs WHERE deleted = 0 AND (lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(billing_email) LIKE ? ESCAPE '\\' OR lower(contacts) LIKE ? ESCAPE '\\' OR zip = ? OR lower(city) LIKE ? ESCAPE '\\') ORDER BY name LIMIT 11`, like, like, like, like, q, like);
    add('partner', 'Geschäftspartner', orgs.slice(0, 10).map((o) => ({ title: o.name, sub: [[o.zip, o.city].filter(Boolean).join(' '), o.email, o.billing_email && o.billing_email !== o.email ? 'Rechnung: ' + o.billing_email : ''].filter(Boolean).join(' · '), badge: o.active ? null : 'inaktiv', href: `#/partner/${o.id}` })), orgs.length > 10);
    const pus = await DB.all(db, `SELECT u.id, u.name, u.email, u.role, u.active, o.id AS org_id, o.name AS org_name FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE o.deleted = 0 AND (lower(u.email) LIKE ? ESCAPE '\\' OR lower(u.name) LIKE ? ESCAPE '\\' OR u.phone LIKE ?) ORDER BY u.name LIMIT 11`, like, like, like);
    add('partnerkonten', 'Partnerkonten', pus.slice(0, 10).map((p) => ({ title: p.name, sub: `${p.email} · ${p.org_name} · ${(PARTNER_ROLES[p.role] || {}).label || p.role}`, badge: p.active ? null : 'deaktiviert', href: `#/partner/${p.org_id}` })), pus.length > 10);
  }
  if (['users_view', 'users_admin', 'users_create', 'users_create_vt'].some((x) => can(u, x))) {
    const st = await DB.all(db, `SELECT id, name, email, role_key, active FROM users WHERE lower(email) LIKE ? ESCAPE '\\' OR lower(name) LIKE ? ESCAPE '\\' ORDER BY name LIMIT 11`, like, like);
    add('mitarbeiter', 'Mitarbeiter', st.slice(0, 10).map((x) => ({ title: x.name, sub: `${x.email} · ${(STAFF_ROLES[x.role_key] || {}).label || x.role_key}`, badge: x.active ? null : 'deaktiviert', href: '#/verwaltung' })), st.length > 10);
  }
  if (can(u, 'acc_view')) {
    const su = await DB.all(db, `SELECT id, name, email, city, active, org_id FROM suppliers WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(vat_id) LIKE ? ESCAPE '\\' OR iban LIKE ? ORDER BY active DESC, name LIMIT 11`, like, like, like, '%' + q.replace(/\s/g, '').toUpperCase() + '%');
    add('lieferanten', 'Lieferanten', su.slice(0, 10).map((x) => ({ title: x.name, sub: [x.email, x.city, x.org_id ? 'Geschäftspartner' : ''].filter(Boolean).join(' · '), badge: x.active ? null : 'inaktiv', href: '#/buchhaltung/lieferanten' })), su.length > 10);
  }
  if (can(u, 'support_view')) {
    const tk = await DB.all(db, `SELECT id, subject, requester_name, requester_email, status, created_at FROM tickets WHERE lower(requester_email) LIKE ? ESCAPE '\\' OR lower(requester_name) LIKE ? ESCAPE '\\' OR lower(subject) LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 11`, like, like, like);
    add('support', 'Support', tk.slice(0, 10).map((t) => ({ title: `#${t.id} · ${t.subject}`, sub: [t.requester_name, t.requester_email].filter(Boolean).join(' · '), status: t.status, date: t.created_at, href: `#/support/${t.id}` })), tk.length > 10);
  }
  if (can(u, 'customers_view') && shopifyConfigured(ctx.env) && (isMail || q.length >= 3)) {
    try {
      const r = await shopifyCustomers(ctx, { q });
      add('kunden', 'Kunden (Shop)', r.customers.slice(0, 10).map((c) => ({ title: c.name, sub: [c.email, c.phone, c.address && c.address.city].filter(Boolean).join(' · '), href: `#/kunden/${c.id}` })), r.customers.length > 10);
    } catch (e) { out.shop_error = e.message; }
  }
  if (isMail) out.partner = can(u, 'partner_view') ? await partnerByEmail(ctx, q) : null;
  await audit(ctx, 'suche', 'suche', null, { suche: q.slice(0, 60), treffer: out.groups.reduce((a, g) => a + g.items.length, 0) });
  return out;
}
