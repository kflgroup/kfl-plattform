/* ============================================================
   Backup (täglich 0:01, verschlüsselt), Sicherheitsbericht,
   Aufbewahrungsfristen, Statistik inkl. Prognose und Shopify
   ============================================================ */

const BACKUP_TABLES = ['requests', 'notes', 'events', 'assignments', 'offers', 'partner_events', 'orgs', 'org_notes', 'partner_users', 'partner_notes', 'users', 'roles',
  'settings', 'audit', 'news_posts', 'news_reads', 'notifications', 'chats', 'chat_members', 'chat_messages', 'absences', 'tickets', 'ticket_messages', 'sys_issues', 'archive',
  'billing_items', 'invoices', 'dunnings', 'payments', 'suppliers', 'purchase_invoices', 'payruns', 'surveys', 'files', 'mail_outbox', 'geo_cache', 'acc_notes', 'fibu_accounts', 'fibu_entries', 'fibu_lines', 'fibu_docs', 'fibu_periods'];
const SECRET_COLS = { users: ['pass_hash', 'pass_salt', 'invite_hash'], partner_users: ['pass_hash', 'pass_salt', 'invite_hash'] };

async function securityReport(ctx) {
  const s = await settingsOf(ctx);
  const since = isoOf(nowMs() - 86400e3), t = nowIso();
  const issues = [];
  const failed = await DB.val(ctx.db, "SELECT COUNT(*) FROM audit WHERE action = 'login_fehlgeschlagen' AND at >= ?", since);
  const locks = await DB.val(ctx.db, "SELECT COUNT(*) FROM audit WHERE action = 'login_gesperrt' AND at >= ?", since);
  if (failed >= 20) issues.push({ level: 'hoch', text: `${failed} fehlgeschlagene Anmeldungen in 24 Stunden – möglicher Angriff auf Konten.` }); else if (failed) issues.push({ level: 'info', text: `${failed} fehlgeschlagene Anmeldungen in 24 Stunden.` });
  if (locks) issues.push({ level: 'mittel', text: `${locks} Konto-Sperren wegen Fehlversuchen in 24 Stunden.` });
  const admins = await DB.val(ctx.db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1");
  if (admins > 3) issues.push({ level: 'mittel', text: `${admins} aktive Admin-Konten – bitte prüfen, ob alle nötig sind.` });
  const stale = await DB.val(ctx.db, 'SELECT COUNT(*) FROM users WHERE active = 1 AND (last_login IS NULL OR last_login < ?)', isoOf(nowMs() - 90 * 86400e3));
  if (stale) issues.push({ level: 'info', text: `${stale} aktive Mitarbeiterkonten ohne Anmeldung seit 90 Tagen.` });
  const pstale = await DB.val(ctx.db, 'SELECT COUNT(*) FROM partner_users WHERE active = 1 AND pass_hash IS NOT NULL AND (last_login IS NULL OR last_login < ?)', isoOf(nowMs() - 90 * 86400e3));
  if (pstale) issues.push({ level: 'info', text: `${pstale} aktive Partnerkonten ohne Anmeldung seit 90 Tagen.` });
  const mailErr = await DB.val(ctx.db, "SELECT COUNT(*) FROM mail_outbox WHERE status = 'fehler' AND created_at >= ?", since);
  if (mailErr) issues.push({ level: 'hoch', text: `${mailErr} E-Mails konnten in 24 Stunden nicht zugestellt werden.` });
  if (!mailProvider(await mailEnv(ctx))) issues.push({ level: 'hoch', text: 'Kein E-Mail-Versand eingerichtet (SMTP_USER/SMTP_PASS oder BREVO_API_KEY) – E-Mails werden nur im Postausgang protokolliert.' });
  if (!(await rawSetting(ctx.db, '_area_pw'))) issues.push({ level: 'hoch', text: 'Das Bereichspasswort für Protokoll und Backup ist noch das Standardpasswort. Bitte ändern.' });
  if (!(await rawSetting(ctx.db, '_backup_pw'))) issues.push({ level: 'hoch', text: 'Kein eigenes Backup-Passwort festgelegt – Backups sind mit dem Server-Schlüssel verschlüsselt.' });
  if (!ctx.env.FILES) issues.push({ level: 'info', text: 'Kein R2-Dateispeicher verbunden – Dateien und Backups liegen in der Datenbank (Größenlimit beachten).' });
  if (!s.company_iban) issues.push({ level: 'mittel', text: 'Keine Bankverbindung in den Firmendaten – erscheint nicht auf Rechnungen, SEPA-Export nicht möglich.' });
  if (!s.company_tax_no && !s.company_vat_id) issues.push({ level: 'hoch', text: 'Steuernummer bzw. USt-IdNr. fehlt – Pflichtangabe auf Rechnungen (§ 14 UStG).' });
  const spam = await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests WHERE created_at >= ?', since);
  if (spam > 200) issues.push({ level: 'mittel', text: `${spam} Anfragen in 24 Stunden – ungewöhnlich hohes Aufkommen.` });
  const deletes = await DB.val(ctx.db, "SELECT COUNT(*) FROM audit WHERE action LIKE '%geloescht%' AND at >= ?", since);
  if (deletes > 10) issues.push({ level: 'mittel', text: `${deletes} Löschvorgänge in 24 Stunden.` });
  const rights = await DB.all(ctx.db, "SELECT actor_name, action, at FROM audit WHERE action IN ('rechte_geaendert','rolle_geaendert','bereichspasswort_geaendert','backup_passwort_geaendert') AND at >= ? ORDER BY id DESC LIMIT 20", since);
  for (const r of rights) issues.push({ level: 'info', text: `${r.actor_name}: ${r.action.replace(/_/g, ' ')} (${fmtDE(r.at)})` });
  return { created_at: t, version: APP_VERSION, issues, ok: !issues.some((i) => i.level === 'hoch') };
}

async function backupPassword(ctx) { const sealed = await rawSetting(ctx.db, '_backup_pw'); return sealed ? await openSecret(ctx.env, sealed) : serverKey(ctx.env); }

async function createBackup(ctx, { kind = 'auto' } = {}) {
  const s = await settingsOf(ctx);
  const data = { meta: { app: 'KFL Plattform', version: APP_VERSION, created_at: nowIso(), kind }, tables: {} };
  // Alle Tabellen in einer Sammelabfrage lesen (zählt bei Cloudflare als eine Abfrage); bei Fehler tabellenweise
  let all = null;
  try { all = await ctx.db.batch(BACKUP_TABLES.map((t) => ctx.db.prepare(`SELECT * FROM ${t}`))); } catch (e) { all = null; }
  for (const [i, tbl] of BACKUP_TABLES.entries()) {
    try {
      let rows = all ? ((all[i] && all[i].results) || []) : await DB.all(ctx.db, `SELECT * FROM ${tbl}`);
      if (SECRET_COLS[tbl]) rows = rows.map((r) => { const c = { ...r }; for (const k of SECRET_COLS[tbl]) if (c[k]) c[k] = '[geschützt]'; return c; });
      if (tbl === 'settings') rows = rows.map((r) => (r.key.startsWith('_') ? { ...r, value: '[geschützt]' } : r));
      data.tables[tbl] = rows;
    } catch (e) { data.tables[tbl] = { error: e.message }; }
  }
  // Systemcode (optional über die Cloudflare-API)
  if (ctx.env.CF_API_TOKEN && ctx.env.CF_ACCOUNT_ID) {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ctx.env.CF_ACCOUNT_ID}/workers/scripts/${ctx.env.CF_SCRIPT_NAME || 'kfl-plattform'}/content/v2`, { headers: { Authorization: 'Bearer ' + ctx.env.CF_API_TOKEN } });
      data.system_code = res.ok ? await res.text() : `Nicht abrufbar (${res.status})`;
    } catch (e) { data.system_code = 'Nicht abrufbar: ' + e.message; }
  } else data.system_code = 'Nicht enthalten – für die Sicherung des Codes CF_API_TOKEN und CF_ACCOUNT_ID hinterlegen (Code liegt zusätzlich versioniert in GitHub).';
  const report = await securityReport(ctx);
  data.security_report = report;
  const json = enc.encode(JSON.stringify(data));
  const zipped = await gzip(json);
  const box = await encryptBytes(await backupPassword(ctx), zipped);
  const fileText = JSON.stringify({ format: 'kfl-backup-1', created_at: data.meta.created_at, compression: 'gzip', ...box });
  const sha = await sha256Hex(fileText);
  const name = `KFL-Backup-${berlinDate(nowMs())}-${berlinTime(nowMs()).replace(':', '')}.kflbackup.txt`;
  const fileId = await putFile(ctx, { name, mime: 'text/plain', bytes: enc.encode(fileText), ownerType: 'backup' });
  const id = await DB.insert(ctx.db, 'backups', { created_at: nowIso(), kind, size: fileText.length, sha256: sha, file_id: fileId, report: JSON.stringify(report) });
  let uploaded = null;
  if (s.backup_webhook_url && /^https:\/\//.test(s.backup_webhook_url)) {
    try { const r = await fetch(s.backup_webhook_url, { method: 'PUT', headers: { 'Content-Type': 'text/plain', 'X-KFL-Backup': name }, body: fileText }); uploaded = r.ok ? 'hochgeladen' : 'Fehler ' + r.status; } catch (e) { uploaded = 'Fehler: ' + e.message; }
    await DB.update(ctx.db, 'backups', id, { uploaded });
  }
  // Aufbewahrung: nur die letzten N Backups behalten
  const keep = Math.max(3, toInt(s.backup_keep, 30));
  for (const old of await DB.all(ctx.db, 'SELECT id, file_id FROM backups ORDER BY id DESC LIMIT -1 OFFSET ?', keep)) { await deleteFile(ctx, old.file_id); await DB.run(ctx.db, 'DELETE FROM backups WHERE id = ?', old.id); }
  await audit(ctx, 'backup_erstellt', 'backup', id, { groesse: fileText.length, art: kind, hochgeladen: uploaded });
  if (!report.ok) await notifyStaff(ctx, { roles: ['admin'] }, { kind: 'sicherheit', title: 'Sicherheitsbericht: Handlungsbedarf', body: report.issues.filter((i) => i.level === 'hoch').map((i) => i.text).join(' · '), link: '#/backup' });
  return id;
}
async function retentionJobs(ctx) {
  const s = await settingsOf(ctx);
  const cut = isoOf(nowMs() - toInt(s.audit_retention_days, 30) * 86400e3);
  await ctx.db.batch([
    ctx.db.prepare('DELETE FROM audit WHERE at < ?').bind(cut),
    ctx.db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowIso()),
    ctx.db.prepare('DELETE FROM partner_sessions WHERE expires_at < ?').bind(nowIso()),
    ctx.db.prepare('DELETE FROM notifications WHERE created_at < ? AND read_at IS NOT NULL').bind(isoOf(nowMs() - 180 * 86400e3)),
    ctx.db.prepare('DELETE FROM mail_outbox WHERE created_at < ?').bind(isoOf(nowMs() - 90 * 86400e3))]);
  // Anfragen nach Aufbewahrungsfrist (Datenschutz, Standard 24 Monate)
  const days = toInt(ctx.env.RETENTION_DAYS || 730, 730);
  const old = await DB.all(ctx.db, 'SELECT id FROM requests WHERE created_at < ?', isoOf(nowMs() - days * 86400e3));
  for (const r of old) {
    for (const t of ['notes', 'events', 'partner_events', 'surveys']) await DB.run(ctx.db, `DELETE FROM ${t} WHERE request_id = ?`, r.id);
    for (const o of await DB.all(ctx.db, 'SELECT * FROM offers WHERE request_id = ?', r.id)) for (const f of [o.pdf_file_id, o.expose_file_id, o.public_file_id, o.public_expose_id]) if (f) await deleteFile(ctx, f);
    await DB.run(ctx.db, 'DELETE FROM offers WHERE request_id = ?', r.id);
    await DB.run(ctx.db, 'DELETE FROM assignments WHERE request_id = ?', r.id);
    await DB.run(ctx.db, "UPDATE requests SET customer_name = NULL, email = NULL, phone = NULL, data = '{}', deleted = 1 WHERE id = ? AND billed = 1", r.id);
    await DB.run(ctx.db, 'DELETE FROM requests WHERE id = ? AND billed = 0', r.id);
  }
  return old.length;
}

/* ---------- Statistik ---------- */
function periodOf(q) {
  const now = nowMs();
  const to = q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to) ? q.to : berlinDate(now);
  const from = q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from) ? q.from : addDaysDate(to, -29);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400e3) + 1;
  const prevTo = addDaysDate(from, -1), prevFrom = addDaysDate(prevTo, -(days - 1));
  const lyFrom = `${+from.slice(0, 4) - 1}${from.slice(4)}`, lyTo = `${+to.slice(0, 4) - 1}${to.slice(4)}`;
  const iso = (d, end) => isoOf(berlinToUtc(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10) + (end ? 1 : 0), 0, 0));
  return { from, to, days, range: [iso(from), iso(to, true)], prev: [iso(prevFrom), iso(prevTo, true)], ly: [iso(lyFrom), iso(lyTo, true)], prevFrom, prevTo, lyFrom, lyTo };
}
async function kpis(ctx, [a, b]) {
  const db = ctx.db;
  const req = await DB.one(db, `SELECT COUNT(*) AS total, SUM(type='deal') AS deal, SUM(type='sell') AS sell, SUM(status IN ('kontaktdaten_versendet','angebot_akzeptiert')) AS won, SUM(status='kein_angebot') AS no_offer, SUM(status='spam') AS spam FROM requests WHERE created_at >= ? AND created_at < ? AND (deleted = 0 OR status = 'spam')`, a, b);
  const off = await DB.one(db, "SELECT COUNT(*) AS n, SUM(status='angenommen') AS accepted, SUM(status IN ('nicht_ausgewaehlt','abgelehnt_kunde')) AS rejected FROM offers WHERE created_at >= ? AND created_at < ?", a, b);
  const inv = await DB.one(db, "SELECT COALESCE(SUM(net),0) AS net, COALESCE(SUM(gross),0) AS gross, COUNT(*) AS n FROM invoices WHERE status != 'storniert' AND kind != 'storno' AND issue_date >= ? AND issue_date <= ?", a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const paid = await DB.val(db, 'SELECT COALESCE(SUM(amount),0) FROM payments WHERE date >= ? AND date <= ?', a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const fees = await DB.val(db, 'SELECT COALESCE(SUM(fee),0) FROM dunnings WHERE created_at >= ? AND created_at < ?', a, b);
  const dunn = await DB.val(db, 'SELECT COUNT(*) FROM dunnings WHERE created_at >= ? AND created_at < ?', a, b);
  const exp = await DB.one(db, "SELECT COALESCE(SUM(net),0) AS net, COALESCE(SUM(gross),0) AS gross FROM purchase_invoices WHERE date >= ? AND date <= ?", a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const kulanz = await DB.val(db, "SELECT COALESCE(-SUM(net),0) FROM invoices WHERE kind = 'storno' AND issue_date >= ? AND issue_date <= ?", a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const newOrgs = await DB.val(db, 'SELECT COUNT(*) FROM orgs WHERE created_at >= ? AND created_at < ? AND deleted = 0', a, b);
  const tickets = await DB.val(db, 'SELECT COUNT(*) FROM tickets WHERE created_at >= ? AND created_at < ?', a, b);
  return { requests: req.total || 0, deal: req.deal || 0, sell: req.sell || 0, won: req.won || 0, no_offer: req.no_offer || 0, spam: req.spam || 0,
    offers: off.n || 0, offers_accepted: off.accepted || 0, offers_rejected: off.rejected || 0, conversion: req.total ? round2((req.won || 0) / req.total * 100) : 0,
    revenue_net: round2(inv.net), revenue_gross: round2(inv.gross), invoices: inv.n || 0, payments: round2(paid), dunning_fees: round2(fees), dunnings: dunn,
    expenses_net: round2(exp.net), expenses_gross: round2(exp.gross), profit_net: round2(inv.net - exp.net), kulanz: round2(kulanz), new_partners: newOrgs, tickets };
}
async function statsOverview(ctx, q) {
  const P = periodOf(q);
  const [cur, prev, ly] = [await kpis(ctx, P.range), await kpis(ctx, P.prev), await kpis(ctx, P.ly)];
  const todayStart = isoOf(berlinToUtc(...berlinDate(nowMs()).split('-').map(Number), 0, 0));
  const today = await kpis(ctx, [todayStart, nowIso()]);
  const yStart = isoOf(msOf(todayStart) - 86400e3);
  const yesterday = await kpis(ctx, [yStart, todayStart]);
  const pm = berlinParts(nowMs());
  const mStart = isoOf(berlinToUtc(pm.y, pm.m, 1)), lmStart = isoOf(berlinToUtc(pm.y, pm.m - 1, 1));
  const month = await kpis(ctx, [mStart, nowIso()]), lastMonth = await kpis(ctx, [lmStart, mStart]);
  // Prognose der nächsten 30 Tage: 70 % letzte 30 Tage + 30 % gleiche Zeit im Vorjahr
  const last30 = await kpis(ctx, [isoOf(nowMs() - 30 * 86400e3), nowIso()]);
  const lyNext = await kpis(ctx, [isoOf(nowMs() - 365 * 86400e3), isoOf(nowMs() - 335 * 86400e3)]);
  const hasLy = lyNext.requests || lyNext.revenue_net;
  const fc = (k) => round2(hasLy ? last30[k] * 0.7 + lyNext[k] * 0.3 : last30[k]);
  const forecast = { requests: fc('requests'), won: fc('won'), revenue_net: fc('revenue_net'), expenses_net: fc('expenses_net'), profit_net: round2(fc('revenue_net') - fc('expenses_net')), basis: hasLy ? 'letzte 30 Tage (70 %) und Vorjahr (30 %)' : 'letzte 30 Tage' };
  const open = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno'");
  const overdue = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ?", berlinDate(nowMs()));
  const daily = await DB.all(ctx.db, `SELECT substr(created_at,1,10) AS day, COUNT(*) AS n, SUM(status IN ('kontaktdaten_versendet','angebot_akzeptiert')) AS won FROM requests WHERE created_at >= ? AND created_at < ? GROUP BY day ORDER BY day`, ...P.range);
  const brands = await DB.all(ctx.db, "SELECT COALESCE(NULLIF(brand,''),'(ohne)') AS brand, COUNT(*) AS n FROM requests WHERE created_at >= ? AND created_at < ? AND deleted = 0 GROUP BY brand ORDER BY n DESC LIMIT 12", ...P.range);
  const sources = await DB.all(ctx.db, "SELECT COALESCE(NULLIF(source,''),'Webseite') AS source, COUNT(*) AS n, SUM(status IN ('kontaktdaten_versendet','angebot_akzeptiert')) AS won FROM requests WHERE created_at >= ? AND created_at < ? AND deleted = 0 GROUP BY source ORDER BY n DESC LIMIT 15", ...P.range);
  const statuses = await DB.all(ctx.db, 'SELECT status, COUNT(*) AS n FROM requests WHERE created_at >= ? AND created_at < ? GROUP BY status', ...P.range);
  return { period: { from: P.from, to: P.to, days: P.days, prevFrom: P.prevFrom, prevTo: P.prevTo, lyFrom: P.lyFrom, lyTo: P.lyTo }, cur, prev, ly, today, yesterday, month, lastMonth, forecast,
    open: { n: open.n, sum: round2(open.sum) }, overdue: { n: overdue.n, sum: round2(overdue.sum) }, daily, brands, sources, statuses };
}
async function staffPerformance(ctx, q, onlyRole) {
  const P = periodOf(q);
  const users = await DB.all(ctx.db, `SELECT id, name, role_key FROM users WHERE active = 1 ${onlyRole ? "AND role_key IN ('vertrieb','teamleitung')" : ''} ORDER BY name`);
  const out = [];
  for (const u of users) {
    const acts = await DB.val(ctx.db, 'SELECT COUNT(*) FROM events WHERE user_id = ? AND created_at >= ? AND created_at < ?', u.id, ...P.range);
    const assigned = await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests WHERE assignee_id = ? AND created_at >= ? AND created_at < ?', u.id, ...P.range);
    const firsts = await DB.all(ctx.db, `SELECT r.created_at, MIN(e.created_at) AS first FROM requests r JOIN events e ON e.request_id = r.id AND e.user_id = ? WHERE r.created_at >= ? AND r.created_at < ? GROUP BY r.id`, u.id, ...P.range);
    const reaction = firsts.length ? Math.round(firsts.reduce((a, f) => a + (msOf(f.first) - msOf(f.created_at)), 0) / firsts.length / 60000) : null;
    const tickets = await DB.val(ctx.db, "SELECT COUNT(DISTINCT ticket_id) FROM ticket_messages WHERE author_type = 'staff' AND author_id = ? AND created_at >= ? AND created_at < ?", u.id, ...P.range);
    out.push({ id: u.id, name: u.name, role: u.role_key, actions: acts, assigned, handled: firsts.length, reaction_min: reaction, tickets });
  }
  return out;
}
async function partnerPerformance(ctx, q, orgId) {
  const P = periodOf(q);
  const orgs = orgId ? await DB.all(ctx.db, 'SELECT * FROM orgs WHERE id = ?', orgId) : await DB.all(ctx.db, 'SELECT * FROM orgs WHERE deleted = 0 ORDER BY name');
  const out = [];
  for (const o of orgs) {
    const a = await DB.one(ctx.db, `SELECT COUNT(*) AS n, SUM(status NOT IN ('neu','verloren')) AS worked, SUM(offer_id IS NOT NULL) AS offers, SUM(status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won,
      SUM(status = 'verloren') AS lost, SUM(status = 'geschlossen') AS closed, AVG(CASE WHEN sent_at IS NOT NULL THEN (julianday(sent_at) - julianday(created_at)) * 24 END) AS hours FROM assignments WHERE org_id = ? AND created_at >= ? AND created_at < ?`, o.id, ...P.range);
    const rating = await DB.one(ctx.db, 'SELECT AVG(rating) AS avg, COUNT(*) AS n FROM surveys WHERE org_id = ? AND rating IS NOT NULL', o.id);
    const users = await DB.one(ctx.db, 'SELECT SUM(active = 1) AS active, SUM(active = 0) AS inactive FROM partner_users WHERE org_id = ?', o.id);
    const tk = await DB.one(ctx.db, "SELECT COUNT(*) AS n FROM tickets WHERE org_id = ?", o.id);
    const replyH = await DB.val(ctx.db, `SELECT AVG((julianday(m.created_at) - julianday(t.created_at)) * 24) FROM tickets t JOIN ticket_messages m ON m.ticket_id = t.id AND m.author_type = 'requester' AND m.id != (SELECT MIN(id) FROM ticket_messages WHERE ticket_id = t.id) WHERE t.org_id = ?`, o.id);
    out.push({ id: o.id, name: o.name, kind: o.kind, active: !!o.active, received: a.n || 0, worked: a.worked || 0, offers: a.offers || 0, won: a.won || 0, lost: a.lost || 0, closed: a.closed || 0,
      offer_rate: a.n ? round2((a.offers || 0) / a.n * 100) : 0, win_rate: a.offers ? round2((a.won || 0) / a.offers * 100) : 0, avg_hours: a.hours != null ? round2(a.hours) : null,
      rating: rating.n ? round2(rating.avg) : null, ratings: rating.n, users_active: users.active || 0, users_inactive: users.inactive || 0, tickets: tk.n || 0, support_reply_h: replyH != null ? round2(replyH) : null });
  }
  return out;
}
async function shopifyStats(ctx, q) {
  const token = ctx.env.SHOPIFY_ADMIN_TOKEN, shop = ctx.env.SHOPIFY_SHOP || '3r1qns-2d.myshopify.com';
  if (!token) return { configured: false };
  const P = periodOf(q);
  const gql = async (query, variables) => {
    const res = await fetch(`https://${shop}/admin/api/2025-10/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    if (!res.ok) throw new Error('Shopify ' + res.status);
    const j = await res.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 200)); return j.data;
  };
  const range = async (from, to) => {
    let after = null, orders = [], guard = 0;
    do {
      const d = await gql(`query($q:String!,$after:String){orders(first:100,after:$after,query:$q){pageInfo{hasNextPage endCursor} nodes{createdAt displayFinancialStatus totalPriceSet{shopMoney{amount}} customer{id numberOfOrders} lineItems(first:20){nodes{title quantity}}}}}`, { q: `created_at:>=${from} created_at:<=${to}`, after });
      orders = orders.concat(d.orders.nodes); after = d.orders.pageInfo.hasNextPage ? d.orders.pageInfo.endCursor : null;
    } while (after && ++guard < 10);
    const revenue = round2(orders.reduce((a, o) => a + parseFloat(o.totalPriceSet.shopMoney.amount || 0), 0));
    const products = {}; for (const o of orders) for (const li of o.lineItems.nodes) products[li.title] = (products[li.title] || 0) + li.quantity;
    const newCustomers = orders.filter((o) => o.customer && +o.customer.numberOfOrders === 1).length;
    return { orders: orders.length, revenue, aov: orders.length ? round2(revenue / orders.length) : 0, newCustomers, top: Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 10) };
  };
  try {
    return { configured: true, shop, period: { from: P.from, to: P.to }, cur: await range(P.from, P.to), prev: await range(P.prevFrom, P.prevTo), ly: await range(P.lyFrom, P.lyTo) };
  } catch (e) { return { configured: true, error: e.message }; }
}
