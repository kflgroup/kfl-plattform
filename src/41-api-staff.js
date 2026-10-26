/* ============================================================
   Schnittstelle internes Dashboard (/api/…)
   ============================================================ */

function staffPublic(u) {
  return u && { id: u.id, email: u.email, name: u.name, role: u.role, roleLabel: u.roleLabel, perms: [...u.perms], mustChangePw: u.mustChangePw, areaUnlocked: areaUnlocked(u), subs: u.subs, prevLogin: u.prevLogin };
}
function publicConfig() {
  return { version: APP_VERSION, roles: STAFF_ROLES, permissions: PERMISSIONS, requestStatuses: REQUEST_STATUSES, assignStatuses: ASSIGN_STATUSES, ticketStatuses: TICKET_STATUSES,
    ticketPriorities: TICKET_PRIORITIES, invoiceStatuses: INVOICE_STATUSES, dunningLevels: DUNNING_LEVELS, partnerRoles: PARTNER_ROLES, requestTypes: REQUEST_TYPES,
    weekdays: WEEKDAYS, weekdayLabels: WEEKDAY_LABELS, brands: BRANDS_TOP, mailCategories: MAIL_CATEGORIES };
}
const REQ_SORT = { number: 'r.id', created_at: 'r.id', status: 'r.status', customer: 'r.customer_name', brand: 'r.brand', model: 'r.model', budget: "CAST(REPLACE(REPLACE(r.budget,'.',''),',','.') AS REAL)", assignee: 'u.name' };

async function staffRequestRow(ctx, r, u) {
  const a = await DB.one(ctx.db, `SELECT COUNT(*) AS n, SUM(status NOT IN ('neu')) AS reacted, SUM(offer_id IS NOT NULL) AS offers, MAX(sent_at) AS last_offer FROM assignments WHERE request_id = ?`, r.id);
  const billing = await DB.one(ctx.db, 'SELECT status FROM billing_items WHERE request_id = ? ORDER BY id DESC LIMIT 1', r.id);
  return { number: toNumber(r.id), type: r.type, status: r.status, status_note: r.status_note, priority: r.priority, created_at: r.created_at, summary: r.summary,
    customer: can(u, 'req_contact') ? r.customer_name : (r.customer_name ? r.customer_name.split(' ')[0] + ' …' : ''), email: can(u, 'req_contact') ? r.email : '',
    brand: r.brand, model: r.model, vehicle: r.vehicle, budget: r.budget, plz: r.plz, assignee_id: r.assignee_id, assignee_name: r.assignee_name || null,
    partners: a.n || 0, partners_reacted: a.reacted || 0, offers: a.offers || 0, last_offer_at: a.last_offer, customer_note_unread: !!r.customer_note_unread,
    spam_state: r.spam_state, billed: !!r.billed, billing: billing ? billing.status : null, deadline_at: r.deadline_at, source: r.source };
}

async function handleStaffApi(ctx, url) {
  const { request, db, env } = ctx;
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;
  if (method !== 'GET') {
    need(request.headers.get('X-KFL') === '1', 403, 'Ungültige Anfrage');
    const o = request.headers.get('Origin'); need(!o || o === url.origin, 403, 'Ungültige Herkunft');
  }
  const body = method === 'GET' ? {} : await readJson(request, 12_000_000);
  const q = Object.fromEntries(url.searchParams);
  let m;

  /* ---------- Öffentlich ---------- */
  if (path === '/session' && method === 'GET') {
    const u = await currentStaff(ctx);
    const cnt = await DB.val(db, 'SELECT COUNT(*) FROM users');
    return out({ ok: true, user: staffPublic(u), needsSetup: cnt === 0, setupConfigured: !!env.SETUP_TOKEN, mailReady: !!mailProvider(await mailEnv(ctx)), config: publicConfig() });
  }
  if (path === '/setup' && method === 'POST') {
    need((await DB.val(db, 'SELECT COUNT(*) FROM users')) === 0, 403, 'Die Ersteinrichtung ist bereits abgeschlossen.');
    need(env.SETUP_TOKEN && safeEqual(str(body.token, 200), env.SETUP_TOKEN), 403, 'Einrichtungsschlüssel ist falsch.');
    const email = str(body.email).toLowerCase(), name = str(body.name, 80);
    need(emailOk(email) && name, 400, 'Bitte Name und gültige E-Mail angeben.');
    const p = passwordProblem(body.password); need(!p, 400, p);
    const h = await hashPassword(body.password);
    const id = await DB.insert(db, 'users', { email, name, role_key: 'admin', pass_hash: h.hash, pass_salt: h.salt, active: 1, created_at: nowIso(), last_login: nowIso() });
    ctx.actor = { type: 'staff', id, name };
    await audit(ctx, 'ersteinrichtung', 'mitarbeiter', id, email);
    const s = await createSessionRow(db, 'sessions', id);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, s.token, s.maxAge) });
  }
  if (path === '/login' && method === 'POST') {
    const r = await loginGeneric(ctx, 'users', 'sessions', str(body.email).toLowerCase(), String(body.password || ''));
    if (r.error) return fail(r.status, r.error);
    return out({ ok: true, mustChangePw: !!r.user.must_change_pw }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, r.session.token, r.session.maxAge) });
  }
  if (path === '/logout' && method === 'POST') {
    const t = readCookie(request, STAFF_COOKIE); if (t) await DB.run(db, 'DELETE FROM sessions WHERE token_hash = ?', await sha256Hex(t));
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, '', 0) });
  }
  if (path === '/invite/check' && method === 'GET') {
    const t = q.token || ''; need(/^[0-9a-f]{64}$/.test(t), 400, 'Ungültiger Link.');
    const u = await DB.one(db, 'SELECT email, name, invite_expires FROM users WHERE invite_hash = ? AND active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.');
    return out({ ok: true, email: u.email, name: u.name });
  }
  if (path === '/invite/accept' && method === 'POST') {
    const t = str(body.token, 64); need(/^[0-9a-f]{64}$/.test(t), 400, 'Ungültiger Link.');
    const u = await DB.one(db, 'SELECT id, name, invite_expires FROM users WHERE invite_hash = ? AND active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ungültig oder abgelaufen.');
    const p = passwordProblem(body.password); need(!p, 400, p);
    const h = await hashPassword(body.password);
    await DB.run(db, "UPDATE users SET pass_hash = ?, pass_salt = ?, invite_hash = NULL, invite_expires = NULL, failed_logins = 0, locked_until = CASE WHEN locked_until > '9000' THEN locked_until ELSE NULL END, must_change_pw = 0, last_login = ? WHERE id = ?", h.hash, h.salt, nowIso(), u.id);
    await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', u.id);
    ctx.actor = { type: 'staff', id: u.id, name: u.name };
    await audit(ctx, 'passwort_gesetzt', 'mitarbeiter', u.id, null);
    const s = await createSessionRow(db, 'sessions', u.id);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, s.token, s.maxAge) });
  }
  // Support-Anfrage von der Anmeldeseite (Mitarbeiter mit Problem, Tag „Intern“)
  if (path === '/support' && method === 'POST') {
    if (body.website) return out({ ok: true, number: null });
    const name = str(body.name, 80), email = str(body.email, 200).toLowerCase(), message = str(body.message, 4000);
    need(name && emailOk(email), 400, 'Bitte gib deinen Namen und eine gültige E-Mail-Adresse an.');
    need(message.length >= 5, 400, 'Bitte beschreib kurz dein Anliegen.');
    const iph = ctx.ipHash || 'unbekannt';
    const since = isoOf(nowMs() - 3600e3);
    const perIp = await DB.val(db, "SELECT COUNT(*) FROM audit WHERE action = 'support_ticket' AND ip = ? AND at >= ?", iph, since);
    need(perIp < 5, 429, 'Gerade sind zu viele Anfragen eingegangen. Bitte versuch es später noch einmal oder schreib an support@kfl-group.com.');
    ctx.actor = { type: 'web', name };
    const known = await DB.one(db, 'SELECT id FROM users WHERE email = ?', email);
    const id = await createTicket(ctx, { tag: 'Intern', category: str(body.topic, 60) || 'Anmeldung / Zugang', subject: str(body.topic, 60) || 'Support-Anfrage aus dem Dashboard', requester: { type: known ? 'staff' : 'web', id: known ? known.id : null, name, email }, text: message });
    return out({ ok: true, number: id });
  }

  /* ---------- Ab hier angemeldet ---------- */
  const u = await currentStaff(ctx);
  need(u, 401, 'Bitte melde dich an.');
  if (u.mustChangePw && !['/password', '/me/start'].includes(path)) need(false, 428, 'Bitte vergib zuerst ein eigenes Passwort.');

  if (path === '/password' && method === 'POST') {
    const row = await DB.one(db, 'SELECT pass_hash, pass_salt FROM users WHERE id = ?', u.id);
    need(await verifyPassword(body.current, row.pass_hash, row.pass_salt), 400, 'Das aktuelle Passwort ist falsch.');
    const p = passwordProblem(body.next); need(!p, 400, p);
    const h = await hashPassword(body.next);
    await DB.run(db, 'UPDATE users SET pass_hash = ?, pass_salt = ?, must_change_pw = 0 WHERE id = ?', h.hash, h.salt, u.id);
    await DB.run(db, 'DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', u.id, u.tokenHash);
    await audit(ctx, 'passwort_geaendert', 'mitarbeiter', u.id, null);
    return out({ ok: true });
  }
  if (path === '/area/unlock' && method === 'POST') {
    need(can(u, 'audit_view') || can(u, 'backup_view'), 403, 'Dafür fehlt dir die Berechtigung.');
    const ok = await areaPasswordOk(ctx, body.password);
    await audit(ctx, ok ? 'bereich_entsperrt' : 'bereich_passwort_falsch', 'bereich', null, null);
    need(ok, 403, 'Das Bereichspasswort ist falsch.');
    await DB.run(db, 'UPDATE sessions SET area_until = ? WHERE token_hash = ?', isoOf(nowMs() + AREA_MINUTES * 60e3), u.tokenHash);
    return out({ ok: true, until: isoOf(nowMs() + AREA_MINUTES * 60e3) });
  }
  if (path === '/area/lock' && method === 'POST') { await DB.run(db, 'UPDATE sessions SET area_until = NULL WHERE token_hash = ?', u.tokenHash); return out({ ok: true }); }

  /* ---------- Startseite ---------- */
  if (path === '/me/start' && method === 'GET') {
    const news = await newsFor(ctx, 'staff', u, { limit: 12 });
    const chats = (await chatList(ctx, u)).slice(0, 8);
    const kp = {};
    if (can(u, 'req_view')) {
      kp.open = await DB.val(db, `SELECT COUNT(*) FROM requests WHERE deleted = 0 AND status IN (${inList(OPEN_STATUSES)})`, ...OPEN_STATUSES);
      kp.mine = await DB.val(db, `SELECT COUNT(*) FROM requests WHERE deleted = 0 AND assignee_id = ? AND status IN (${inList(OPEN_STATUSES)})`, u.id, ...OPEN_STATUSES);
      kp.notes = await DB.val(db, 'SELECT COUNT(*) FROM requests WHERE deleted = 0 AND customer_note_unread = 1');
      kp.problems = await DB.val(db, "SELECT COUNT(*) FROM requests WHERE deleted = 0 AND status IN ('fehler','stoerung','kein_angebot')");
      kp.today = await DB.val(db, 'SELECT COUNT(*) FROM requests WHERE created_at >= ?', isoOf(berlinToUtc(...berlinDate(nowMs()).split('-').map(Number), 0, 0)));
      if (can(u, 'req_spam_confirm')) kp.spam = await DB.val(db, "SELECT COUNT(*) FROM requests WHERE spam_state = 'gemeldet'");
    }
    if (can(u, 'support_view')) kp.tickets = await DB.val(db, "SELECT COUNT(*) FROM tickets WHERE status IN ('neu','in_bearbeitung') AND archived_at IS NULL");
    if (can(u, 'acc_view')) { kp.bill = await DB.val(db, "SELECT COUNT(*) FROM billing_items WHERE status = 'offen'"); kp.overdue = await DB.val(db, "SELECT COUNT(*) FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ?", berlinDate(nowMs())); }
    const abs = await DB.all(db, "SELECT a.*, u.name AS user_name FROM absences a JOIN users u ON u.id = a.user_id WHERE a.substitute_id = ? AND a.status = 'angefragt'", u.id);
    const w = isoWeek(nowMs());
    return out({ ok: true, today: berlinDate(nowMs()), week: w.week, year: w.year, news, chats, kpis: kp, absenceRequests: abs });
  }

  /* ---------- News & Chat ---------- */
  if (path === '/news' && method === 'GET') return out({ ok: true, ...(await newsFor(ctx, 'staff', u, { limit: 100 })) });
  if (path === '/news' && method === 'POST') {
    const scope = body.scope === 'partner' ? 'partner' : 'staff';
    requirePerm(u, scope === 'partner' ? 'news_partner' : 'news_publish');
    const aud = body.audience || { type: scope === 'partner' ? 'partners_all' : 'all' };
    const types = scope === 'partner' ? ['partners_all', 'orgs', 'partner_users', 'brands', 'partner_roles'] : ['all', 'roles', 'users'];
    need(types.includes(aud.type), 400, 'Ungültige Empfängergruppe.');
    need(str(body.title, 200), 400, 'Bitte gib einen Titel an.');
    const id = await DB.insert(db, 'news_posts', { author_id: u.id, author_name: u.name, scope, audience: JSON.stringify({ type: aud.type, values: aud.values || [] }), title: str(body.title, 200), body: str(body.body, 8000), important: body.important ? 1 : 0, created_at: nowIso() });
    await audit(ctx, 'news_veroeffentlicht', 'news', id, { scope, audience: aud });
    if (scope === 'partner' && body.mail) {
      const users = await DB.all(db, 'SELECT u.*, o.brands, o.name AS org_name FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE u.active = 1 AND o.active = 1 AND o.deleted = 0');
      for (const pu of users) if (audienceMatchesPartner(aud, { id: pu.id, orgId: pu.org_id, role: pu.role, org: { brands: pu.brands } }))
        await sendMail(ctx, { category: 'system', to: pu.email, toName: pu.name, subject: str(body.title, 200), title: str(body.title, 200), body: `<p style="white-space:pre-wrap">${esc(str(body.body, 8000))}</p>` });
    }
    return out({ ok: true, id });
  }
  if (path === '/news/read' && method === 'POST') {
    const read = body.read !== false;
    for (const id of (body.posts || []).map(Number)) {
      if (read) await DB.run(db, 'INSERT OR IGNORE INTO news_reads (post_id, reader_type, reader_id, read_at) VALUES (?, ?, ?, ?)', id, 'staff', u.id, nowIso());
      else await DB.run(db, "DELETE FROM news_reads WHERE post_id = ? AND reader_type = 'staff' AND reader_id = ?", id, u.id);
    }
    for (const id of (body.notifications || []).map(Number)) await DB.run(db, "UPDATE notifications SET read_at = ? WHERE id = ? AND recipient_type = 'staff' AND recipient_id = ?", read ? nowIso() : null, id, u.id);
    if (body.all) { await DB.run(db, "UPDATE notifications SET read_at = ? WHERE recipient_type = 'staff' AND recipient_id = ? AND read_at IS NULL", nowIso(), u.id); }
    return out({ ok: true });
  }
  if (path === '/directory' && method === 'GET') return out({ ok: true, users: await DB.all(db, 'SELECT id, name, role_key, department FROM users WHERE active = 1 ORDER BY name') });
  if (path === '/chats' && method === 'GET') return out({ ok: true, chats: await chatList(ctx, u) });
  if (path === '/chats' && method === 'POST') return out({ ok: true, id: await chatOpen(ctx, u, body) });
  if ((m = path.match(/^\/chats\/(\d+)$/))) {
    const cid = +m[1];
    need(await DB.one(db, 'SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ?', cid, u.id), 403, 'Du bist nicht Mitglied dieses Chats.');
    if (method === 'GET') {
      const msgs = await DB.all(db, 'SELECT m.*, u.name FROM chat_messages m JOIN users u ON u.id = m.user_id WHERE m.chat_id = ? ORDER BY m.id DESC LIMIT 200', cid);
      if (q.read !== '0') await DB.run(db, 'UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', nowIso(), cid, u.id);
      const chat = await DB.one(db, 'SELECT * FROM chats WHERE id = ?', cid);
      chat.members = await DB.all(db, 'SELECT u.id, u.name, u.role_key FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = ?', cid);
      return out({ ok: true, chat, messages: msgs.reverse() });
    }
    if (method === 'POST') { await chatSend(ctx, u, cid, body.text); return out({ ok: true }); }
    if (method === 'PATCH') { await DB.run(db, 'UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', body.unread ? null : nowIso(), cid, u.id); return out({ ok: true }); }
  }
  if (path === '/absences' && method === 'GET') {
    return out({ ok: true, mine: await DB.all(db, 'SELECT a.*, s.name AS substitute_name FROM absences a LEFT JOIN users s ON s.id = a.substitute_id WHERE a.user_id = ? ORDER BY a.from_date DESC LIMIT 50', u.id),
      asSubstitute: await DB.all(db, 'SELECT a.*, x.name AS user_name FROM absences a JOIN users x ON x.id = a.user_id WHERE a.substitute_id = ? ORDER BY a.from_date DESC LIMIT 50', u.id),
      candidates: (await DB.all(db, 'SELECT id, name, role_key FROM users WHERE active = 1 AND id != ? ORDER BY name', u.id)).filter((x) => (x.role_key === u.role || (STAFF_ROLES[x.role_key] || {}).rank > u.rank)) });
  }
  if (path === '/absences' && method === 'POST') return out({ ok: true, id: await requestAbsence(ctx, u, { from: body.from, to: body.to, substituteId: toInt(body.substitute_id) || null, note: body.note }) });
  if ((m = path.match(/^\/absences\/(\d+)\/(decide|cancel)$/)) && method === 'POST') {
    const a = await DB.one(db, 'SELECT * FROM absences WHERE id = ?', +m[1]); need(a, 404, 'Nicht gefunden.');
    if (m[2] === 'cancel') { need(a.user_id === u.id, 403, 'Nicht erlaubt.'); await DB.update(db, 'absences', a.id, { status: 'storniert', decided_at: nowIso() }); }
    else {
      need(a.substitute_id === u.id && a.status === 'angefragt', 403, 'Nicht erlaubt.');
      await DB.update(db, 'absences', a.id, { status: body.accept ? 'bestaetigt' : 'abgelehnt', decided_at: nowIso() });
      await notify(ctx, 'staff', a.user_id, { kind: 'vertretung', title: body.accept ? `${u.name} übernimmt deine Vertretung` : `${u.name} kann die Vertretung nicht übernehmen`, body: `${fmtDateDE(a.from_date)} – ${fmtDateDE(a.to_date)}`, link: '#/news/vertretung' });
    }
    await audit(ctx, 'abwesenheit_' + m[2], 'abwesenheit', a.id, { accept: !!body.accept });
    return out({ ok: true });
  }

  /* ---------- Anfragen ---------- */
  if (path === '/requests' && method === 'GET') {
    requirePerm(u, 'req_view');
    const where = ['1=1'], args = [];
    const view = q.view || 'aktiv';
    if (view === 'spam') { where.push("(r.spam_state = 'gemeldet' OR r.status = 'spam')"); }
    else if (view === 'archiv') where.push(`r.deleted = 0 AND r.status NOT IN (${inList(OPEN_STATUSES)})`), args.push(...OPEN_STATUSES);
    else if (view === 'kopien') where.push('r.deleted = 0 AND EXISTS (SELECT 1 FROM billing_items b WHERE b.request_id = r.id)');
    else if (view === 'alle') where.push('r.deleted = 0');
    else { where.push(`r.deleted = 0 AND r.status IN (${inList(OPEN_STATUSES)})`); args.push(...OPEN_STATUSES); }
    if (q.mine === '1') { where.push(`r.assignee_id IN (${inList([u.id, ...u.subs])})`); args.push(u.id, ...u.subs); }
    if (q.unassigned === '1') where.push('r.assignee_id IS NULL');
    if (q.notes === '1') where.push('r.customer_note_unread = 1');
    if (q.type && REQUEST_TYPES[q.type]) { where.push('r.type = ?'); args.push(q.type); }
    if (q.status) { const st = q.status.split(',').filter((x) => REQUEST_STATUSES.some((s) => s.key === x)); if (st.length) { where.push(`r.status IN (${inList(st)})`); args.push(...st); } }
    if (q.brand) { where.push('r.brand = ?'); args.push(q.brand); }
    if (q.model) { where.push('r.model LIKE ?'); args.push('%' + q.model + '%'); }
    if (q.from) { where.push('r.created_at >= ?'); args.push(isoOf(berlinToUtc(...q.from.split('-').map(Number)))); }
    if (q.to) { where.push('r.created_at < ?'); args.push(isoOf(berlinToUtc(+q.to.slice(0, 4), +q.to.slice(5, 7), +q.to.slice(8, 10) + 1))); }
    if (q.assignee) { where.push('r.assignee_id = ?'); args.push(toInt(q.assignee)); }
    if (q.q) {
      const s = str(q.q, 100), num = /^#?\d{3,}$/.test(s) ? fromNumber(s) : null, like = '%' + s.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
      const cols = ['r.customer_name', 'r.email', 'r.phone', 'r.brand', 'r.model', 'r.vehicle', 'r.summary', 'r.plz'];
      where.push('(' + cols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ') + (num ? ' OR r.id = ?' : '') + ')'); cols.forEach(() => args.push(like)); if (num) args.push(num);
    }
    const sort = REQ_SORT[q.sort] || 'r.id', dir = q.dir === 'asc' ? 'ASC' : 'DESC';
    const w = where.join(' AND ');
    const total = await DB.val(db, `SELECT COUNT(*) FROM requests r LEFT JOIN users u ON u.id = r.assignee_id WHERE ${w}`, ...args);
    const per = 50, pages = Math.max(1, Math.ceil(total / per)), page = Math.min(pages, Math.max(1, toInt(q.page, 1)));
    const rows = await DB.all(db, `SELECT r.*, u.name AS assignee_name FROM requests r LEFT JOIN users u ON u.id = r.assignee_id WHERE ${w} ORDER BY ${sort} ${dir}, r.id DESC LIMIT ? OFFSET ?`, ...args, per, (page - 1) * per);
    const items = []; for (const r of rows) items.push(await staffRequestRow(ctx, r, u));
    const brands = (await DB.all(db, "SELECT DISTINCT brand FROM requests WHERE brand IS NOT NULL AND brand != '' ORDER BY brand")).map((x) => x.brand);
    return out({ ok: true, items, total, page, pages, brands });
  }
  if ((m = path.match(/^\/requests\/(\d+)(?:\/(.+))?$/))) {
    requirePerm(u, 'req_view');
    const rid = fromNumber(m[1]), sub = m[2] || '', reqNo = m[1];
    const r = await DB.one(db, 'SELECT r.*, u.name AS assignee_name FROM requests r LEFT JOIN users u ON u.id = r.assignee_id WHERE r.id = ?', rid);
    need(r && (!r.deleted || r.status === 'spam' || can(u, 'req_delete')), 404, 'Anfrage nicht gefunden.');
    if (!sub && method === 'GET') {
      const d = jparse(r.data, {});
      const fields = {}; for (const [k, v] of Object.entries(d)) { if (/^(_|form$|form_type$|utf8$)/.test(k)) continue; if (!can(u, 'req_contact') && PERSONAL_KEY.test(k)) continue; fields[k] = v; }
      const assignments = await DB.all(db, `SELECT a.*, o.name AS org_name, o.city AS org_city, o.kind AS org_kind, pu.name AS taker_name FROM assignments a JOIN orgs o ON o.id = a.org_id LEFT JOIN partner_users pu ON pu.id = a.taken_by WHERE a.request_id = ? ORDER BY a.id`, rid);
      const offers = (await DB.all(db, 'SELECT o.*, g.name AS org_name, pu.name AS user_name FROM offers o JOIN orgs g ON g.id = o.org_id LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.request_id = ? ORDER BY COALESCE(o.rank, 99), o.id', rid)).map((o) => ({ ...o, data: jparse(o.data, {}) }));
      const events = await DB.all(db, 'SELECT e.*, u.name AS author FROM events e LEFT JOIN users u ON u.id = e.user_id WHERE e.request_id = ? ORDER BY e.id DESC LIMIT 300', rid);
      const notes = await DB.all(db, 'SELECT n.*, u.name AS author FROM notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.request_id = ? ORDER BY n.id DESC', rid);
      const pevents = await DB.all(db, 'SELECT * FROM partner_events WHERE request_id = ? ORDER BY id DESC LIMIT 300', rid);
      const billing = await DB.all(db, 'SELECT b.*, i.number AS invoice_number FROM billing_items b LEFT JOIN invoices i ON i.id = b.invoice_id WHERE b.request_id = ?', rid);
      const tickets = await DB.all(db, 'SELECT id, subject, status, tag FROM tickets WHERE request_id = ?', rid);
      if (r.customer_note_unread && can(u, 'req_edit')) await DB.update(db, 'requests', rid, { customer_note_unread: 0 });
      return out({ ok: true, request: { ...(await staffRequestRow(ctx, r, u)), fields, contact: can(u, 'req_contact') ? customerContact(r) : null, radius_km: r.radius_km, lat: r.lat, lon: r.lon,
        customer_account: r.customer_account, dispatched_at: r.dispatched_at, evaluated_at: r.evaluated_at, presented_at: r.presented_at, decided_at: r.decided_at, feedback_state: r.feedback_state, spam_reason: r.spam_reason, deleted: !!r.deleted },
        assignments, offers, events, notes, partnerEvents: pevents, billing, tickets });
    }
    if (!sub && method === 'PATCH') {
      requirePerm(u, 'req_edit');
      const upd = {}, log = [];
      if (body.status !== undefined) {
        need(REQUEST_STATUSES.some((s) => s.key === body.status) && body.status !== 'spam', 400, 'Unbekannter Status.');
        need(can(u, 'req_status_force') || ['eingang', 'in_bearbeitung', 'fehler', 'stoerung'].includes(body.status), 403, 'Diesen Status darf nur die Teamleitung setzen.');
        if (body.status !== r.status) { upd.status = body.status; log.push(['status', statusLabel(REQUEST_STATUSES, body.status) + (body.note ? ' – ' + body.note : '')]); }
      }
      if (body.priority !== undefined && ['normal', 'hoch', 'dringend'].includes(body.priority) && body.priority !== r.priority) { upd.priority = body.priority; log.push(['prioritaet', body.priority]); }
      if (body.assignee_id !== undefined) {
        const aid = body.assignee_id ? toInt(body.assignee_id) : null;
        need(can(u, 'req_assign') || aid === u.id || (aid === null && r.assignee_id === u.id), 403, 'Du kannst Anfragen nur dir selbst zuweisen.');
        if (aid) need(await DB.one(db, 'SELECT id FROM users WHERE id = ? AND active = 1', aid), 400, 'Mitarbeiter nicht gefunden.');
        if (aid !== r.assignee_id) {
          upd.assignee_id = aid; const nm = aid ? (await DB.one(db, 'SELECT name FROM users WHERE id = ?', aid)).name : 'niemand'; log.push(['zuweisung', nm]);
          if (aid && aid !== u.id) await notify(ctx, 'staff', aid, { kind: 'anfrage', title: `Dir wurde Anfrage #${m[1]} zugewiesen`, body: r.vehicle || '', link: `#/anfragen/${m[1]}` });
        }
      }
      if (Object.keys(upd).length) {
        upd.updated_at = nowIso(); if (!r.first_action_at) upd.first_action_at = nowIso();
        await DB.update(db, 'requests', rid, upd);
        for (const [a, dtl] of log) await reqEvent(ctx, rid, a, dtl);
        await audit(ctx, 'anfrage_geaendert', 'anfrage', reqNo, upd);
      }
      return out({ ok: true });
    }
    if (!sub && method === 'DELETE') {
      requirePerm(u, 'req_delete');
      await DB.update(db, 'requests', rid, { deleted: 1, status: 'spam', customer_name: null, email: null, phone: null, data: '{}', updated_at: nowIso() });
      await DB.run(db, "UPDATE assignments SET status = 'geschlossen', archived = 1, closed_reason = 'Anfrage gelöscht' WHERE request_id = ? AND status IN ('neu','in_bearbeitung','versendet','vorgestellt')", rid);
      await audit(ctx, 'anfrage_geloescht', 'anfrage', reqNo, { grund: str(body.reason, 300) });
      return out({ ok: true });
    }
    // Bestehende Notiz für die Buchhaltung markieren (bleibt dauerhaft am Fall angeheftet; aufheben nur Admin)
    const accM = String(sub || '').match(/^notes\/(\d+)\/acc$/);
    if (accM && method === 'POST') {
      const n = await DB.one(db, 'SELECT * FROM notes WHERE id = ? AND request_id = ?', +accM[1], rid); need(n, 404, 'Notiz nicht gefunden.');
      if (body.relevant === false) { need(u.role === 'admin', 403, 'Die Markierung für die Buchhaltung kann nur ein Admin aufheben.'); await DB.update(db, 'notes', n.id, { acc_relevant: 0 }); await audit(ctx, 'notiz_buchhaltung_aufgehoben', 'anfrage', reqNo, { notiz: n.id }); return out({ ok: true }); }
      requirePerm(u, 'req_edit');
      await DB.update(db, 'notes', n.id, { acc_relevant: 1, acc_marked_by: u.name, acc_marked_at: nowIso() });
      await audit(ctx, 'notiz_buchhaltung', 'anfrage', reqNo, { notiz: n.id, text: String(n.text).slice(0, 200) });
      return out({ ok: true });
    }
    if (sub === 'notes' && method === 'POST') {
      requirePerm(u, 'req_edit'); const text = str(body.text, 4000); need(text, 400, 'Bitte einen Text eingeben.');
      const accRel = body.acc_relevant === true || body.acc_relevant === 'on' || body.acc_relevant === '1';
      await DB.insert(db, 'notes', { request_id: rid, user_id: u.id, text, created_at: nowIso(), visibility: 'intern', author_type: 'staff', acc_relevant: accRel ? 1 : 0, acc_marked_by: accRel ? u.name : null, acc_marked_at: accRel ? nowIso() : null });
      if (accRel) await audit(ctx, 'notiz_buchhaltung', 'anfrage', reqNo, { text: text.slice(0, 200) });
      if (!r.first_action_at) await DB.update(db, 'requests', rid, { first_action_at: nowIso() });
      await reqEvent(ctx, rid, 'notiz', text.slice(0, 120));
      return out({ ok: true });
    }
    if (sub === 'dispatch' && method === 'POST') { requirePerm(u, 'req_partner'); const res = await dispatchRequest(ctx, rid); await audit(ctx, 'neu_verteilt', 'anfrage', reqNo, res); return out({ ok: true, ...res }); }
    if (sub === 'evaluate' && method === 'POST') { requirePerm(u, 'req_partner'); need(!r.evaluated_at, 409, 'Die Anfrage wurde bereits ausgewertet.'); await evaluateRequest(ctx, rid); await audit(ctx, 'auswertung_manuell', 'anfrage', reqNo, null); return out({ ok: true }); }
    if (sub === 'present' && method === 'POST') { requirePerm(u, 'req_edit'); need(r.status === 'angebot_in_bearbeitung', 409, 'Keine Angebote zur Freigabe.'); await presentOffers(ctx, rid); await audit(ctx, 'angebot_freigegeben', 'anfrage', reqNo, null); return out({ ok: true }); }
    if (sub === 'assign' && method === 'POST') {
      requirePerm(u, 'req_partner');
      const org = await DB.one(db, 'SELECT * FROM orgs WHERE id = ? AND deleted = 0', toInt(body.org_id)); need(org, 404, 'Geschäftspartner nicht gefunden.');
      need(!(await DB.one(db, 'SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', rid, org.id)), 409, 'Dieser Partner hat die Anfrage bereits.');
      if (r.lat == null && plzOk(r.plz)) { const g = await geocodePlz(ctx, r.plz); if (g) { await DB.update(db, 'requests', rid, { lat: g.lat, lon: g.lon }); r.lat = g.lat; r.lon = g.lon; } }
      const res = await createAssignment(ctx, r, org, { source: 'manuell', targetUserId: toInt(body.target_user_id) || null, note: str(body.note, 2000) || null });
      const upd = { updated_at: nowIso(), deadline_at: await DB.val(db, "SELECT MAX(deadline_at) FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", rid) };
      if (['eingang', 'in_bearbeitung', 'fehler', 'kein_angebot', 'stoerung'].includes(r.status)) { upd.status = 'versendet'; upd.status_note = null; upd.evaluated_at = null; upd.dispatched_at = r.dispatched_at || nowIso(); }
      await DB.update(db, 'requests', rid, upd);
      await reqEvent(ctx, rid, 'partner_zugeordnet', `${org.name} manuell zugeordnet`);
      await audit(ctx, 'partner_zugeordnet', 'anfrage', reqNo, { org: org.name });
      return out({ ok: true, id: res.id });
    }
    if (sub === 'candidates' && method === 'GET') {
      requirePerm(u, 'req_partner');
      const orgs = await DB.all(db, 'SELECT id, name, city, zip, lat, lon, brands, active FROM orgs WHERE deleted = 0 ORDER BY name');
      const have = new Set((await DB.all(db, 'SELECT org_id FROM assignments WHERE request_id = ?', rid)).map((x) => x.org_id));
      return out({ ok: true, orgs: orgs.map((o) => ({ id: o.id, name: o.name, city: o.city, active: !!o.active, assigned: have.has(o.id), brands: jparse(o.brands, []), brandMatch: jparse(o.brands, []).includes('*') || jparse(o.brands, []).some((b) => normBrand(b) === normBrand(r.brand)), distance: r.lat != null && o.lat != null ? distanceKm(r, o) : null })) });
    }
    if (sub === 'message' && method === 'POST') {
      requirePerm(u, 'req_message');
      const text = str(body.text, 4000), kind = ['notiz', 'ergaenzung', 'probefahrt', 'mahnung', 'info'].includes(body.kind) ? body.kind : 'info';
      need(text || kind === 'probefahrt', 400, 'Bitte gib eine Nachricht ein.');
      const s = await settingsOf(ctx);
      if (body.to === 'customer') {
        requirePerm(u, 'req_contact');
        const d = jparse(r.data, {});
        const res = await sendMail(ctx, { category: 'customer', to: r.email, toName: d.Vorname, subject: `Deine Anfrage #${m[1]} bei KFL`, title: `Nachricht zu deiner Anfrage #${m[1]}`, replyTo: s.mail_internal_inbox,
          body: `<p>Hallo ${esc(d.Vorname || '')},</p><p style="white-space:pre-wrap">${esc(text)}</p><p>Viele Grüße<br>${esc(u.name)}<br>${esc(s.company_name)}</p>` });
        await reqEvent(ctx, rid, 'nachricht_kunde', text.slice(0, 300));
        await audit(ctx, 'nachricht_kunde', 'anfrage', reqNo, { status: res.status });
        return out({ ok: true, mail: res.status });
      }
      const ids = (body.assignment_ids || []).map(Number);
      const asgs = await DB.all(db, `SELECT a.*, o.name AS org_name FROM assignments a JOIN orgs o ON o.id = a.org_id WHERE a.request_id = ?${ids.length ? ` AND a.id IN (${inList(ids)})` : ''}`, rid, ...ids);
      need(asgs.length, 400, 'Bitte wähle mindestens einen Partner aus.');
      const label = { notiz: 'Notiz von KFL', ergaenzung: 'Ergänzung zur Anfrage', probefahrt: 'Der Kunde ist an einer Probefahrt interessiert', mahnung: 'Bitte bearbeite diese Anfrage', info: 'Information von KFL' }[kind];
      const full = kind === 'probefahrt' ? (label + (text ? ': ' + text : '.')) : label + ': ' + text;
      for (const a of asgs) {
        await partnerEvent(ctx, { assignmentId: a.id, requestId: rid, orgId: a.org_id, action: kind, text: full, visiblePartner: true });
        if (kind === 'mahnung') { await DB.run(db, 'UPDATE assignments SET reminded_at = ?, reminders = reminders + 1 WHERE id = ?', nowIso(), a.id); await mailAssignment(ctx, r, { id: a.org_id, opening: (await DB.one(db, 'SELECT opening FROM orgs WHERE id = ?', a.org_id)).opening }, a.id, { reminder: true, extra: text, targetUserId: a.taken_by || a.target_user_id }); }
        else {
          const users = a.taken_by ? await DB.all(db, 'SELECT * FROM partner_users WHERE id = ?', a.taken_by) : await DB.all(db, 'SELECT * FROM partner_users WHERE org_id = ? AND active = 1', a.org_id);
          for (const pu of users) {
            await notify(ctx, 'partner', pu.id, { kind: kind === 'probefahrt' ? 'probefahrt' : 'info', title: `${label} · #${m[1]}`, body: text, link: `#/anfragen/${a.id}` });
            await sendMail(ctx, { category: 'partner', to: pu.email, toName: pu.name, subject: `${label} · Anfrage #${m[1]}`, title: label, body: `<p>Hallo ${esc(pu.name)},</p><p>zur Anfrage <strong>#${m[1]} · ${esc(teaserLine(r, a.distance_km))}</strong>:</p><p style="white-space:pre-wrap">${esc(text || label)}</p>${s.link_partner ? mailBtn(s.link_partner + '#/anfragen/' + a.id, 'Zur Anfrage') : ''}` });
          }
        }
      }
      await reqEvent(ctx, rid, 'nachricht_partner', `${label} an ${asgs.map((a) => a.org_name).join(', ')}${text ? ': ' + text.slice(0, 200) : ''}`);
      await audit(ctx, 'nachricht_partner', 'anfrage', reqNo, { kind, partner: asgs.length });
      return out({ ok: true });
    }
    if ((m = sub.match(/^assignments\/(\d+)\/(resend|status|release)$/)) && method === 'POST') {
      const a = await DB.one(db, 'SELECT a.*, o.opening, o.name AS org_name FROM assignments a JOIN orgs o ON o.id = a.org_id WHERE a.id = ? AND a.request_id = ?', +m[1], rid); need(a, 404, 'Zuordnung nicht gefunden.');
      if (m[2] === 'resend') { requirePerm(u, 'req_message'); const res = await mailAssignment(ctx, r, { id: a.org_id, opening: a.opening }, a.id, { targetUserId: a.target_user_id }); await reqEvent(ctx, rid, 'erneut_gesendet', a.org_name); return out({ ok: true, ...res }); }
      if (m[2] === 'release') { requirePerm(u, 'req_partner'); await releaseAssignment(ctx, a.id, { reason: `KFL (${u.name}) hat die Anfrage wieder für die Organisation geöffnet.` }); return out({ ok: true }); }
      requirePerm(u, 'req_message'); await staffSetAssignmentStatus(ctx, a.id, body.status, body.note); await audit(ctx, 'partnerstatus_gesetzt', 'zuordnung', a.id, { status: body.status }); return out({ ok: true });
    }
    if (sub === 'spam' && method === 'POST') { requirePerm(u, 'req_spam_report'); need(!r.spam_state || r.spam_state === 'abgelehnt', 409, 'Diese Anfrage wurde bereits gemeldet.'); await reportSpam(ctx, rid, body.reason); await audit(ctx, 'spam_gemeldet', 'anfrage', reqNo, { grund: body.reason }); return out({ ok: true }); }
    if (sub === 'spam/decide' && method === 'POST') { requirePerm(u, 'req_spam_confirm'); await decideSpam(ctx, rid, !!body.confirm, str(body.note, 500)); await audit(ctx, body.confirm ? 'spam_bestaetigt' : 'spam_abgelehnt', 'anfrage', reqNo, null); return out({ ok: true }); }
    if ((m = sub.match(/^offers\/(\d+)\/(file|public)$/))) {
      const o = await DB.one(db, 'SELECT * FROM offers WHERE id = ? AND request_id = ?', +m[1], rid); need(o, 404, 'Angebot nicht gefunden.');
      if (m[2] === 'file' && method === 'GET') {
        const col = { pdf: 'pdf_file_id', expose: 'expose_file_id', public: 'public_file_id', public_expose: 'public_expose_id' }[q.which || 'pdf'];
        need(col && o[col], 404, 'Keine Datei vorhanden.');
        await audit(ctx, 'angebot_datei_geoeffnet', 'angebot', o.id, { datei: q.which || 'pdf' });
        return fileResponse(await getFile(ctx, o[col]), q.download === '1');
      }
      if (m[2] === 'public' && method === 'POST') {
        requirePerm(u, 'req_edit');
        const f = body.file; need(f && f.base64, 400, 'Bitte eine PDF-Datei auswählen.');
        const id = await putFile(ctx, { name: f.name || 'angebot-neutral.pdf', mime: 'application/pdf', bytes: unb64(f.base64), ownerType: 'offer_public', ownerId: o.id });
        await DB.update(db, 'offers', o.id, { [body.which === 'expose' ? 'public_expose_id' : 'public_file_id']: id, updated_at: nowIso() });
        await reqEvent(ctx, rid, 'neutrale_pdf', 'Neutrale PDF für den Kunden freigegeben'); await audit(ctx, 'neutrale_pdf', 'angebot', o.id, null);
        return out({ ok: true });
      }
    }
  }

  /* ---------- Geschäftspartner ---------- */
  if (path === '/orgs' && method === 'GET') {
    requirePerm(u, 'partner_view');
    const rows = await DB.all(db, `SELECT o.*, (SELECT COUNT(*) FROM partner_users p WHERE p.org_id = o.id AND p.active = 1) AS users, (SELECT COUNT(*) FROM assignments a WHERE a.org_id = o.id AND a.status IN ('neu','in_bearbeitung')) AS open_asg FROM orgs o WHERE o.deleted = 0 ORDER BY o.name`);
    return out({ ok: true, orgs: rows.map((o) => ({ ...o, brands: jparse(o.brands, []), accepts: jparse(o.accepts, []), opening: jparse(o.opening, DEFAULT_OPENING), contacts: jparse(o.contacts, []) })) });
  }
  if (path === '/orgs' && method === 'POST') {
    requirePerm(u, 'partner_manage');
    const o = await orgFromBody(ctx, u, body, null);
    const id = await DB.insert(db, 'orgs', { ...o, created_at: nowIso(), updated_at: nowIso() });
    await audit(ctx, 'partner_angelegt', 'partner', id, { name: o.name });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/orgs\/(\d+)(?:\/(.+))?$/))) {
    requirePerm(u, 'partner_view');
    const oid = +m[1], sub = m[2] || '';
    const org = await DB.one(db, 'SELECT * FROM orgs WHERE id = ?', oid);
    need(org && (!org.deleted || can(u, 'partner_delete')), 404, 'Geschäftspartner nicht gefunden.');
    if (!sub && method === 'GET') {
      const users = await DB.all(db, 'SELECT id, email, name, role, phone, active, agb_at, privacy_at, last_login, created_at, invite_expires, CASE WHEN pass_hash IS NULL THEN 1 ELSE 0 END AS pending, locked_until FROM partner_users WHERE org_id = ? ORDER BY role, name', oid);
      const notes = u.role === 'admin' ? await DB.all(db, 'SELECT n.*, u.name AS author FROM org_notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.org_id = ? ORDER BY n.id DESC', oid) : [];
      const stats = can(u, 'partner_stats') ? (await partnerPerformance(ctx, { from: addDaysDate(berlinDate(nowMs()), -364) }, oid))[0] : null;
      const invoices = can(u, 'acc_view') ? await DB.all(db, 'SELECT id, number, issue_date, due_date, gross, paid, fees, status, dunning_level FROM invoices WHERE org_id = ? ORDER BY id DESC LIMIT 50', oid) : [];
      const asg = await DB.all(db, 'SELECT a.id, a.request_id, a.status, a.created_at, r.vehicle FROM assignments a JOIN requests r ON r.id = a.request_id WHERE a.org_id = ? ORDER BY a.id DESC LIMIT 30', oid);
      return out({ ok: true, org: { ...org, brands: jparse(org.brands, []), accepts: jparse(org.accepts, []), opening: jparse(org.opening, DEFAULT_OPENING), contacts: jparse(org.contacts, []) }, users, notes, stats, invoices, assignments: asg.map((a) => ({ ...a, number: toNumber(a.request_id) })) });
    }
    if (!sub && method === 'PATCH') {
      requirePerm(u, 'partner_manage');
      const o = await orgFromBody(ctx, u, body, org);
      await DB.update(db, 'orgs', oid, { ...o, updated_at: nowIso() });
      if (o.billing_mode && o.billing_mode !== org.billing_mode) await DB.insert(db, 'org_notes', { org_id: oid, user_id: u.id, text: `Abrechnungsart geändert: ${org.billing_mode} → ${o.billing_mode} am ${fmtDE(nowMs())} durch ${u.name}`, created_at: nowIso() });
      const TL = { payment_terms_days: 'Zahlungsziel (Tage)', reminder_due_days: 'Frist Zahlungserinnerung (Tage)', dunning_fee_1: 'Mahngebühr 1. Mahnung', dunning_fee_2: 'Mahngebühr 2. Mahnung', dunning_due_days: 'Frist 1. Mahnung (Tage)', dunning_due_days_2: 'Frist 2. Mahnung (Tage)', lead_price: 'Lead-Preis' };
      for (const k of Object.keys(TL)) if (o[k] !== undefined && o[k] !== org[k]) await DB.insert(db, 'org_notes', { org_id: oid, user_id: u.id, text: `${TL[k]} geändert: ${org[k] ?? 'Standard'} → ${o[k] ?? 'Standard'} (${u.name})`, created_at: nowIso() });
      await audit(ctx, 'partner_geaendert', 'partner', oid, Object.keys(o));
      return out({ ok: true });
    }
    if (!sub && method === 'DELETE') {
      requirePerm(u, 'partner_delete');
      await DB.update(db, 'orgs', oid, { deleted: 1, active: 0, updated_at: nowIso() });
      await DB.run(db, "UPDATE partner_users SET active = 0 WHERE org_id = ?", oid);
      await DB.run(db, "DELETE FROM partner_sessions WHERE user_id IN (SELECT id FROM partner_users WHERE org_id = ?)", oid);
      await audit(ctx, 'partner_geloescht', 'partner', oid, { name: org.name });
      return out({ ok: true });
    }
    if (sub === 'notes' && method === 'POST') { need(u.role === 'admin', 403, 'Nur für Admins.'); await DB.insert(db, 'org_notes', { org_id: oid, user_id: u.id, text: str(body.text, 2000), created_at: nowIso() }); return out({ ok: true }); }
    if (sub === 'training' && method === 'POST') { requirePerm(u, 'partner_manage'); await DB.update(db, 'orgs', oid, { training_done: body.done ? 1 : 0, training_at: body.done ? nowIso() : null }); await audit(ctx, 'schulung_' + (body.done ? 'ja' : 'nein'), 'partner', oid, null); return out({ ok: true }); }
    if (sub === 'users' && method === 'POST') {
      requirePerm(u, 'partner_manage');
      const email = str(body.email, 200).toLowerCase(), name = str(body.name, 80), role = PARTNER_ROLES[body.role] ? body.role : (org.kind === 'einzel' ? 'gf' : 'vt');
      need(emailOk(email) && name, 400, 'Bitte Name und gültige E-Mail angeben.');
      need(!(await DB.one(db, 'SELECT id FROM partner_users WHERE email = ?', email)), 400, 'Diese E-Mail ist bereits als Partnerkonto angelegt.');
      const id = await DB.insert(db, 'partner_users', { org_id: oid, email, name, role, phone: str(body.phone, 40), active: 1, created_at: nowIso() });
      await audit(ctx, 'partnerkonto_angelegt', 'partner', oid, { email, role });
      return out({ ok: true, id });
    }
    if ((m = sub.match(/^users\/(\d+)(?:\/(invite|reset))?$/))) {
      const pu = await DB.one(db, 'SELECT * FROM partner_users WHERE id = ? AND org_id = ?', +m[1], oid); need(pu, 404, 'Konto nicht gefunden.');
      if (m[2] === 'invite' && method === 'POST') {
        requirePerm(u, 'partner_manage');
        need(!pu.pass_hash || can(u, 'partner_pw'), 403, 'Das Konto ist bereits aktiv. Passwörter kann nur ein Admin zurücksetzen.');
        const inv = await newInvite(); await DB.update(db, 'partner_users', pu.id, { invite_hash: inv.hash, invite_expires: inv.expires });
        const r = await sendPartnerInvite(ctx, pu.id, inv.token);
        await audit(ctx, 'partner_einladung', 'partnerkonto', pu.id, { email: pu.email, mail: r.status });
        const s = await settingsOf(ctx);
        return out({ ok: true, mail: r.status, link: `${(s.link_partner || url.origin + '/partner').replace(/\/$/, '')}#/einladung/${inv.token}` });
      }
      if (m[2] === 'reset' && method === 'POST') {
        requirePerm(u, 'partner_pw');
        if (body.mode === 'temp') {
          const p = passwordProblem(body.password); need(!p, 400, p);
          const h = await hashPassword(body.password);
          await DB.update(db, 'partner_users', pu.id, { pass_hash: h.hash, pass_salt: h.salt, must_change_pw: 1, failed_logins: 0, locked_until: null, invite_hash: null });
          await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id);
          const r = await sendPartnerInvite(ctx, pu.id, null, { tempPassword: body.password });
          await audit(ctx, 'partner_passwort_standard', 'partnerkonto', pu.id, { mail: r.status });
          return out({ ok: true, mail: r.status });
        }
        const inv = await newInvite(); await DB.update(db, 'partner_users', pu.id, { invite_hash: inv.hash, invite_expires: inv.expires });
        const r = await sendPartnerInvite(ctx, pu.id, inv.token, { reset: true });
        await audit(ctx, 'partner_passwort_link', 'partnerkonto', pu.id, { mail: r.status });
        return out({ ok: true, mail: r.status });
      }
      if (!m[2] && method === 'PATCH') {
        requirePerm(u, 'partner_manage');
        const upd = {};
        if (body.name !== undefined) upd.name = str(body.name, 80);
        if (body.phone !== undefined) upd.phone = str(body.phone, 40);
        if (body.role !== undefined && PARTNER_ROLES[body.role]) upd.role = body.role;
        if (body.active !== undefined) { upd.active = body.active ? 1 : 0; if (!body.active) await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id); }
        if (body.locked !== undefined) { need(can(u, 'partner_delete'), 403, 'Sperren kann nur ein Admin.'); upd.locked_until = body.locked ? '9999-12-31T00:00:00.000Z' : null; if (body.locked) await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id); }
        await DB.update(db, 'partner_users', pu.id, upd);
        await audit(ctx, 'partnerkonto_geaendert', 'partnerkonto', pu.id, upd);
        return out({ ok: true });
      }
      if (!m[2] && method === 'DELETE') {
        requirePerm(u, 'partner_delete');
        await DB.run(db, "UPDATE partner_users SET active = 0, email = email || '.geloescht-' || id, invite_hash = NULL, pass_hash = NULL WHERE id = ?", pu.id);
        await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id);
        await audit(ctx, 'partnerkonto_geloescht', 'partnerkonto', pu.id, { email: pu.email });
        return out({ ok: true });
      }
    }
  }

  /* ---------- Buchhaltung ---------- */
  if (path.startsWith('/acc/')) return handleAccounting(ctx, u, path.slice(4), method, body, q, url);

  /* ---------- Statistik ---------- */
  if (path === '/stats/overview' && method === 'GET') { requirePerm(u, 'stats_view'); return out({ ok: true, ...(await statsOverview(ctx, q)) }); }
  if (path === '/stats/staff' && method === 'GET') { need(can(u, 'stats_view') || can(u, 'team_stats'), 403, 'Dafür fehlt dir die Berechtigung.'); return out({ ok: true, staff: await staffPerformance(ctx, q, !can(u, 'stats_view')) }); }
  if (path === '/stats/partners' && method === 'GET') { need(can(u, 'stats_view') || can(u, 'partner_stats'), 403, 'Dafür fehlt dir die Berechtigung.'); return out({ ok: true, partners: await partnerPerformance(ctx, q) }); }
  if (path === '/stats/shop' && method === 'GET') { requirePerm(u, 'stats_shop'); return out({ ok: true, ...(await shopifyStats(ctx, q)) }); }

  /* ---------- Support ---------- */
  if (path === '/tickets' && method === 'GET') {
    requirePerm(u, 'support_view');
    const where = [], args = [];
    if (q.archived === '1') where.push('t.archived_at IS NOT NULL'); else where.push('t.archived_at IS NULL');
    if (q.tag) { where.push('t.tag = ?'); args.push(q.tag); }
    if (q.status) { where.push('t.status = ?'); args.push(q.status); } else if (q.archived !== '1' && q.all !== '1') where.push("t.status != 'erledigt'");
    if (q.priority) { where.push('t.priority = ?'); args.push(q.priority); }
    if (q.kind) { where.push('t.kind = ?'); args.push(q.kind); }
    if (q.q) { const like = '%' + q.q + '%'; where.push('(t.subject LIKE ? OR t.requester_name LIKE ? OR t.requester_email LIKE ? OR t.id = ?)'); args.push(like, like, like, toInt(q.q, -1)); }
    const rows = await DB.all(db, `SELECT t.*, u.name AS assignee_name, o.name AS org_name, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS messages
      FROM tickets t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN orgs o ON o.id = t.org_id WHERE ${where.join(' AND ')}
      ORDER BY CASE t.priority WHEN 'dringend' THEN 0 WHEN 'hoch' THEN 1 ELSE 2 END, CASE t.status WHEN 'neu' THEN 0 WHEN 'in_bearbeitung' THEN 1 WHEN 'wartet' THEN 2 ELSE 3 END, t.id DESC LIMIT 300`, ...args);
    return out({ ok: true, tickets: rows });
  }
  if (path === '/tickets' && method === 'POST') {
    const id = await createTicket(ctx, { tag: 'Intern', category: str(body.category, 60) || 'Technisches Problem', subject: str(body.subject, 200), priority: ['normal', 'hoch', 'dringend'].includes(body.priority) ? body.priority : 'normal', requester: { type: 'staff', id: u.id, name: u.name, email: u.email }, text: str(body.text, 8000) });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/tickets\/(\d+)(?:\/(reply|change))?$/))) {
    const tk = await DB.one(db, 'SELECT t.*, o.name AS org_name FROM tickets t LEFT JOIN orgs o ON o.id = t.org_id WHERE t.id = ?', +m[1]);
    need(tk, 404, 'Ticket nicht gefunden.');
    const own = tk.requester_type === 'staff' && tk.requester_id === u.id;
    need(can(u, 'support_view') || own, 403, 'Dafür fehlt dir die Berechtigung.');
    if (!m[2] && method === 'GET') {
      const msgs = await DB.all(db, `SELECT * FROM ticket_messages WHERE ticket_id = ? ${can(u, 'support_view') ? '' : 'AND internal = 0'} ORDER BY id`, tk.id);
      return out({ ok: true, ticket: { ...tk, payload: jparse(tk.payload, null) }, messages: msgs });
    }
    if (m[2] === 'reply' && method === 'POST') {
      if (!own) requirePerm(u, 'support_manage');
      await ticketReply(ctx, tk.id, { authorType: own && !can(u, 'support_manage') ? 'requester' : 'staff', authorId: u.id, authorName: u.name, text: body.text, internal: !!body.internal && can(u, 'support_manage') });
      if (!own || can(u, 'support_manage')) await audit(ctx, 'support_antwort', 'ticket', tk.id, { intern: !!body.internal });
      return out({ ok: true });
    }
    if (m[2] === 'change' && method === 'POST') { requirePerm(u, 'support_changes'); need(tk.kind === 'aenderung' && tk.status !== 'erledigt', 409, 'Kein offener Änderungsantrag.'); await applyChangeRequest(ctx, tk, !!body.approve, str(body.note, 500)); return out({ ok: true }); }
    if (!m[2] && method === 'PATCH') {
      requirePerm(u, 'support_manage');
      const upd = { updated_at: nowIso() };
      if (body.status && TICKET_STATUSES.some((s) => s.key === body.status)) { upd.status = body.status; upd.done_at = body.status === 'erledigt' ? nowIso() : null; }
      if (body.priority && TICKET_PRIORITIES.some((s) => s.key === body.priority)) upd.priority = body.priority;
      if (body.assignee_id !== undefined) upd.assignee_id = body.assignee_id ? toInt(body.assignee_id) : null;
      if (body.tag && ['Webseite', 'Intern', 'Partner', 'Kunde'].includes(body.tag)) upd.tag = body.tag;
      await DB.update(db, 'tickets', tk.id, upd);
      await audit(ctx, 'support_geaendert', 'ticket', tk.id, upd);
      return out({ ok: true });
    }
  }
  if (path === '/sysissues' && method === 'GET') { requirePerm(u, 'support_syslist'); return out({ ok: true, issues: (await DB.all(db, 'SELECT s.*, u.name AS author FROM sys_issues s LEFT JOIN users u ON u.id = s.created_by ORDER BY s.status = \'erledigt\', s.id DESC')).map((x) => ({ ...x, notes: jparse(x.notes, []) })) }); }
  if (path === '/sysissues' && method === 'POST') { requirePerm(u, 'support_syslist'); need(str(body.title, 200), 400, 'Bitte einen Titel angeben.'); const id = await DB.insert(db, 'sys_issues', { title: str(body.title, 200), details: str(body.details, 8000), status: 'offen', created_by: u.id, created_at: nowIso(), notes: '[]' }); await audit(ctx, 'systemfehler_angelegt', 'systemfehler', id, null); return out({ ok: true, id }); }
  if ((m = path.match(/^\/sysissues\/(\d+)$/)) && method === 'PATCH') {
    requirePerm(u, 'support_syslist');
    const si = await DB.one(db, 'SELECT * FROM sys_issues WHERE id = ?', +m[1]); need(si, 404, 'Nicht gefunden.');
    const notes = jparse(si.notes, []);
    if (body.note) notes.push({ at: nowIso(), by: u.name, text: str(body.note, 2000) });
    const upd = { notes: JSON.stringify(notes) };
    if (body.status && ['offen', 'in_bearbeitung', 'erledigt'].includes(body.status)) { upd.status = body.status; upd.done_at = body.status === 'erledigt' ? nowIso() : null; }
    await DB.update(db, 'sys_issues', si.id, upd); await audit(ctx, 'systemfehler_geaendert', 'systemfehler', si.id, { status: upd.status });
    return out({ ok: true });
  }

  /* ---------- Backup (Admin + Bereichspasswort) ---------- */
  if (path === '/backups' && method === 'GET') { requireArea(u, 'backup_view'); return out({ ok: true, backups: (await DB.all(db, 'SELECT * FROM backups ORDER BY id DESC LIMIT 60')).map((b) => ({ ...b, report: jparse(b.report, null) })), report: await securityReport(ctx), passwordSet: !!(await rawSetting(db, '_backup_pw')) }); }
  if (path === '/backups' && method === 'POST') { requireArea(u, 'backup_view'); return out({ ok: true, id: await createBackup(ctx, { kind: 'manuell' }) }); }
  if ((m = path.match(/^\/backups\/(\d+)\/download$/)) && method === 'GET') { requireArea(u, 'backup_view'); const b = await DB.one(db, 'SELECT * FROM backups WHERE id = ?', +m[1]); need(b, 404, 'Backup nicht gefunden.'); await audit(ctx, 'backup_heruntergeladen', 'backup', b.id, null); return fileResponse(await getFile(ctx, b.file_id), true); }
  if (path === '/backups/password' && method === 'POST') {
    requireArea(u, 'backup_view'); need(u.role === 'admin', 403, 'Nur der Admin kann das Backup-Passwort festlegen.');
    const p = passwordProblem(body.password); need(!p, 400, p);
    await setRawSetting(db, '_backup_pw', await sealSecret(env, body.password));
    await audit(ctx, 'backup_passwort_geaendert', 'backup', null, null);
    return out({ ok: true });
  }
  if (path === '/archive' && method === 'GET') { requireArea(u, 'backup_view'); return out({ ok: true, items: await DB.all(db, `SELECT id, kind, ref_id, title, archived_at, expires_at FROM archive ${q.kind ? 'WHERE kind = ?' : ''} ORDER BY id DESC LIMIT 500`, ...(q.kind ? [q.kind] : [])) }); }
  if ((m = path.match(/^\/archive\/(\d+)$/)) && method === 'GET') { requireArea(u, 'backup_view'); const a = await DB.one(db, 'SELECT * FROM archive WHERE id = ?', +m[1]); need(a, 404, 'Nicht gefunden.'); return out({ ok: true, item: { ...a, data: jparse(a.data, {}) } }); }

  /* ---------- Protokoll (Admin + Bereichspasswort) ---------- */
  if (path === '/audit' && method === 'GET') {
    requireArea(u, 'audit_view');
    const where = [], args = [];
    if (q.q) { const like = '%' + q.q + '%'; where.push('(action LIKE ? OR actor_name LIKE ? OR entity_id LIKE ? OR detail LIKE ?)'); args.push(like, like, like, like); }
    if (q.actor_type) { where.push('actor_type = ?'); args.push(q.actor_type); }
    if (q.from) { where.push('at >= ?'); args.push(isoOf(berlinToUtc(...q.from.split('-').map(Number)))); }
    if (q.to) { where.push('at < ?'); args.push(isoOf(berlinToUtc(+q.to.slice(0, 4), +q.to.slice(5, 7), +q.to.slice(8, 10) + 1))); }
    const per = 100, page = Math.max(1, toInt(q.page, 1));
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = await DB.val(db, `SELECT COUNT(*) FROM audit ${w}`, ...args);
    const rows = await DB.all(db, `SELECT * FROM audit ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, per, (page - 1) * per);
    if (q.export === '1') {
      const all = await DB.all(db, `SELECT * FROM audit ${w} ORDER BY id DESC LIMIT 20000`, ...args);
      const txt = all.map((a) => [a.at, a.actor_type, a.actor_name, a.action, a.entity, a.entity_id, a.detail, a.ip].map((x) => String(x ?? '').replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
      await audit(ctx, 'protokoll_export', 'protokoll', null, { eintraege: all.length });
      return new Response('Zeit\tTyp\tWer\tAktion\tObjekt\tID\tDetails\tIP-Kennung\n' + txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="kfl-protokoll-${berlinDate(nowMs())}.txt"`, ...SEC_HEADERS } });
    }
    return out({ ok: true, items: rows, total, page, pages: Math.max(1, Math.ceil(total / per)) });
  }

  /* ---------- Verwaltung: Mitarbeiter, Rollen, Einstellungen, Links ---------- */
  if (path === '/users' && method === 'GET') {
    need(can(u, 'users_view') || can(u, 'users_create') || can(u, 'users_admin'), 403, 'Dafür fehlt dir die Berechtigung.');
    const rows = await DB.all(db, `SELECT id, email, name, role_key, active, department, phone, extra_perms, revoked_perms, created_at, last_login, locked_until, CASE WHEN pass_hash IS NULL THEN 1 ELSE 0 END AS pending FROM users ORDER BY active DESC, name`);
    return out({ ok: true, users: rows.map((r) => ({ ...r, extra_perms: jparse(r.extra_perms, []), revoked_perms: jparse(r.revoked_perms, []), locked: !!(r.locked_until && r.locked_until > '9000') })) });
  }
  if (path === '/users' && method === 'POST') {
    const role = String(body.role_key || '');
    need(STAFF_ROLES[role], 400, 'Bitte eine Rolle wählen.');
    const allowed = can(u, 'users_admin') ? Object.keys(STAFF_ROLES) : can(u, 'users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : can(u, 'users_create_vt') ? ['vertrieb'] : [];
    need(allowed.includes(role), 403, 'Diese Rolle darfst du nicht vergeben.');
    const email = str(body.email, 200).toLowerCase(), name = str(body.name, 80);
    need(emailOk(email) && name, 400, 'Bitte Name und gültige E-Mail angeben.');
    need(!(await DB.one(db, 'SELECT id FROM users WHERE email = ?', email)), 400, 'Diese E-Mail ist bereits angelegt.');
    const inv = await newInvite();
    const id = await DB.insert(db, 'users', { email, name, role_key: role, department: str(body.department, 60), phone: str(body.phone, 40), active: 1, invite_hash: inv.hash, invite_expires: inv.expires, created_by: u.id, created_at: nowIso() });
    await audit(ctx, 'mitarbeiter_angelegt', 'mitarbeiter', id, { email, role });
    const r = await staffInviteMail(ctx, { email, name }, inv.token, url);
    return out({ ok: true, id, invite: r.link, mail: r.status });
  }
  if ((m = path.match(/^\/users\/(\d+)(?:\/(invite|reset))?$/))) {
    const target = await DB.one(db, 'SELECT * FROM users WHERE id = ?', +m[1]); need(target, 404, 'Mitarbeiter nicht gefunden.');
    const targetRank = (STAFF_ROLES[target.role_key] || { rank: 0 }).rank;
    const isAdmin = can(u, 'users_admin');
    if (!isAdmin) need((can(u, 'users_create') && targetRank < 80) || (can(u, 'users_create_vt') && target.role_key === 'vertrieb'), 403, 'Dieses Konto darfst du nicht verwalten.');
    if (m[2] === 'invite' && method === 'POST') {
      need(!target.pass_hash || isAdmin, 403, 'Passwörter bestehender Konten kann nur ein Admin zurücksetzen.');
      const inv = await newInvite(); await DB.update(db, 'users', target.id, { invite_hash: inv.hash, invite_expires: inv.expires });
      const r = await staffInviteMail(ctx, target, inv.token, url);
      await audit(ctx, 'mitarbeiter_einladung', 'mitarbeiter', target.id, null);
      return out({ ok: true, invite: r.link, mail: r.status });
    }
    if (m[2] === 'reset' && method === 'POST') {
      need(isAdmin, 403, 'Passwörter kann nur ein Admin zurücksetzen.');
      if (body.mode === 'temp') {
        const p = passwordProblem(body.password); need(!p, 400, p);
        const h = await hashPassword(body.password);
        await DB.update(db, 'users', target.id, { pass_hash: h.hash, pass_salt: h.salt, must_change_pw: 1, failed_logins: 0, invite_hash: null });
        await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', target.id);
        const s = await settingsOf(ctx);
        const r = await sendMail(ctx, { category: 'system', to: target.email, toName: target.name, subject: 'Dein vorläufiges Passwort für das KFL Dashboard', title: 'Passwort zurückgesetzt', body: `<p>Hallo ${esc(target.name)},</p><p>dein vorläufiges Passwort lautet:</p><p style="font:700 20px monospace;background:#f4f4f4;border-radius:10px;padding:12px 16px;display:inline-block">${esc(body.password)}</p><p>Bitte melde dich an und vergib sofort ein eigenes Passwort.</p>${mailBtn(s.link_staff || url.origin + '/admin', 'Zum Dashboard')}` });
        await audit(ctx, 'mitarbeiter_passwort_standard', 'mitarbeiter', target.id, { mail: r.status });
        return out({ ok: true, mail: r.status });
      }
      const inv = await newInvite(); await DB.update(db, 'users', target.id, { invite_hash: inv.hash, invite_expires: inv.expires });
      const r = await staffInviteMail(ctx, target, inv.token, url, true);
      await audit(ctx, 'mitarbeiter_passwort_link', 'mitarbeiter', target.id, null);
      return out({ ok: true, invite: r.link, mail: r.status });
    }
    if (!m[2] && method === 'PATCH') {
      const upd = {};
      if (body.name !== undefined) upd.name = str(body.name, 80);
      if (body.department !== undefined) upd.department = str(body.department, 60);
      if (body.phone !== undefined) upd.phone = str(body.phone, 40);
      if (body.role_key !== undefined && body.role_key !== target.role_key) {
        need(STAFF_ROLES[body.role_key], 400, 'Unbekannte Rolle.');
        const allowed = isAdmin ? Object.keys(STAFF_ROLES) : can(u, 'users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : ['vertrieb'];
        need(allowed.includes(body.role_key), 403, 'Diese Rolle darfst du nicht vergeben.');
        if (target.role_key === 'admin') need((await DB.val(db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1 AND id != ?", target.id)) > 0, 400, 'Es muss mindestens ein aktiver Admin bleiben.');
        upd.role_key = body.role_key;
      }
      if (body.active !== undefined || body.locked !== undefined) {
        need(isAdmin, 403, 'Konten sperren kann nur ein Admin.');
        need(target.id !== u.id, 400, 'Du kannst dein eigenes Konto nicht sperren.');
        if (body.active === false || body.locked === true) need(target.role_key !== 'admin' || (await DB.val(db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1 AND id != ?", target.id)) > 0, 400, 'Es muss mindestens ein aktiver Admin bleiben.');
        if (body.active !== undefined) upd.active = body.active ? 1 : 0;
        if (body.locked !== undefined) upd.locked_until = body.locked ? '9999-12-31T00:00:00.000Z' : null;
        if (body.active === false || body.locked === true) await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', target.id);
      }
      if (body.extra_perms !== undefined || body.revoked_perms !== undefined) {
        need(can(u, 'users_perms'), 403, 'Sonderrechte kann nur der Admin vergeben.');
        if (body.extra_perms !== undefined) upd.extra_perms = JSON.stringify((body.extra_perms || []).filter((p) => PERM_KEYS.includes(p)));
        if (body.revoked_perms !== undefined) upd.revoked_perms = JSON.stringify((body.revoked_perms || []).filter((p) => PERM_KEYS.includes(p)));
      }
      await DB.update(db, 'users', target.id, upd);
      await audit(ctx, upd.extra_perms || upd.revoked_perms ? 'rechte_geaendert' : 'mitarbeiter_geaendert', 'mitarbeiter', target.id, upd);
      return out({ ok: true });
    }
    if (!m[2] && method === 'DELETE') {
      need(isAdmin, 403, 'Nutzerkonten löschen kann nur ein Admin.'); need(target.id !== u.id, 400, 'Du kannst dich nicht selbst löschen.');
      need(target.role_key !== 'admin' || (await DB.val(db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1 AND id != ?", target.id)) > 0, 400, 'Es muss mindestens ein aktiver Admin bleiben.');
      await DB.run(db, "UPDATE users SET active = 0, email = email || '.geloescht-' || id, pass_hash = NULL, invite_hash = NULL WHERE id = ?", target.id);
      await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', target.id);
      await audit(ctx, 'mitarbeiter_geloescht', 'mitarbeiter', target.id, { email: target.email });
      return out({ ok: true });
    }
  }
  if (path === '/roles' && method === 'GET') { need(can(u, 'users_view') || can(u, 'users_admin') || can(u, 'users_create'), 403, 'Dafür fehlt dir die Berechtigung.'); return out({ ok: true, roles: (await DB.all(db, 'SELECT * FROM roles')).map((r) => ({ ...r, perms: jparse(r.perms, []) })) }); }
  if ((m = path.match(/^\/roles\/([a-z_]+)$/)) && method === 'PATCH') {
    requirePerm(u, 'users_perms'); need(STAFF_ROLES[m[1]] && m[1] !== 'admin', 400, 'Die Admin-Rolle hat immer alle Rechte.');
    const perms = (body.perms || []).filter((p) => PERM_KEYS.includes(p));
    await DB.run(db, 'UPDATE roles SET perms = ? WHERE key = ?', JSON.stringify(perms), m[1]);
    await audit(ctx, 'rolle_geaendert', 'rolle', m[1], perms);
    return out({ ok: true });
  }
  if (path === '/settings' && method === 'GET') {
    need(can(u, 'settings_all') || can(u, 'acc_settings') || can(u, 'acc_manage'), 403, 'Dafür fehlt dir die Berechtigung.');
    const s = await settingsOf(ctx);
    const keys = (can(u, 'settings_all') ? Object.keys(DEFAULT_SETTINGS) : can(u, 'acc_settings') ? GF_SETTINGS : ACC_SETTINGS).filter((k) => !SCORING_KEYS.includes(k) && k !== 'score_weight_price');
    const menv = await mailEnv(ctx);
    return out({ ok: true, settings: Object.fromEntries(keys.map((k) => [k, s[k]])), editable: keys, env: can(u, 'settings_all') ? { mail: mailProvider(menv), smtpUser: menv.SMTP_PASS ? smtpUser(menv) : null, smtpSource: menv._smtpSource || null, smtpCheck: { user: true, pass: !!menv.SMTP_PASS, host: env.SMTP_HOST || 'smtp.ionos.de', port: env.SMTP_PORT || '587', similar: Object.keys(env).filter((k) => /smtp|e-?mail|ionos|norepl/i.test(k) && !['SMTP_USER', 'SMTP_PASS', 'SMTP_HOST', 'SMTP_PORT'].includes(k) && !/^SMTP_PASS_[A-Z0-9_]+$/.test(k)) }, brevo: !!env.BREVO_API_KEY, r2: !!env.FILES, shopify: !!env.SHOPIFY_ADMIN_TOKEN, cfapi: !!env.CF_API_TOKEN, oldDb: !!env.OLD_DB } : undefined });
  }
  if (path === '/settings' && method === 'PATCH') {
    need(can(u, 'settings_all') || can(u, 'acc_settings') || can(u, 'acc_manage'), 403, 'Dafür fehlt dir die Berechtigung.');
    const keys = (can(u, 'settings_all') ? Object.keys(DEFAULT_SETTINGS) : can(u, 'acc_settings') ? GF_SETTINGS : ACC_SETTINGS).filter((k) => !SCORING_KEYS.includes(k) && k !== 'score_weight_price');
    const upd = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!keys.includes(k)) continue;
      const def = DEFAULT_SETTINGS[k];
      if (typeof def === 'number') { const n = toNum(v); need(n !== null && n >= 0, 400, `Ungültiger Wert für ${k}.`); upd[k] = n; }
      else if (typeof def === 'boolean') upd[k] = !!v;
      else if (Array.isArray(def)) upd[k] = Array.isArray(v) ? v : String(v).split(',').map((x) => toInt(x.trim())).filter((x) => !isNaN(x));
      else upd[k] = str(v, 4000);
      if (/^mail_from_/.test(k)) need(emailOk(upd[k]), 400, `Bitte eine gültige Absenderadresse für ${k} angeben.`);
    }
    await saveSettings(ctx, upd);
    await audit(ctx, 'einstellungen_geaendert', 'einstellungen', null, upd);
    return out({ ok: true });
  }
  /* ---------- Angebotsauswahl: Gewichtung der Faktoren (nur Admin, Freigabe mit Passwort) ---------- */
  if (path === '/scoring' && method === 'GET') {
    need(u.role === 'admin', 403, 'Die Angebotsauswahl kann nur der Admin einsehen und ändern.');
    const s = await settingsOf(ctx);
    return out({ ok: true, factors: SCORE_FACTORS, weights: scoreWeights(s), presented_count: toInt(s.presented_count, 3), review_before_present: !!s.review_before_present,
      history: (await DB.all(db, "SELECT at, actor_name, detail FROM audit WHERE action = 'angebotsauswahl_geaendert' ORDER BY id DESC LIMIT 10")).map((h) => ({ at: h.at, author: h.actor_name, detail: jparse(h.detail, {}) })) });
  }
  if (path === '/scoring' && method === 'POST') {
    need(u.role === 'admin', 403, 'Die Angebotsauswahl kann nur der Admin ändern.');
    need(await scoringPasswordOk(ctx, body.password), 403, 'Das Freigabepasswort ist falsch. Die Einstellungen wurden nicht gespeichert.');
    const upd = {}; let sum = 0;
    for (const f of SCORE_FACTORS) {
      const v = toInt(body.weights && body.weights[f.key], NaN);
      need(Number.isInteger(v) && v >= 0 && v <= 100, 400, `Bitte für „${f.label}“ einen Wert zwischen 0 und 100 % angeben.`);
      upd['score_w_' + f.key] = v; sum += v;
    }
    need(sum === 100, 400, `Die Faktoren müssen zusammen genau 100 % ergeben (aktuell ${sum} %).`);
    const n = toInt(body.presented_count, 3); need(n >= 1 && n <= 3, 400, 'Es können 1 bis 3 Angebote vorgestellt werden.');
    upd.presented_count = n;
    await saveSettings(ctx, upd);
    await audit(ctx, 'angebotsauswahl_geaendert', 'einstellungen', null, upd);
    return out({ ok: true });
  }
  if (path === '/settings/area-password' && method === 'POST') {
    need(u.role === 'admin', 403, 'Nur der Admin kann das Bereichspasswort ändern.');
    need(await areaPasswordOk(ctx, body.current), 403, 'Das aktuelle Bereichspasswort ist falsch.');
    const p = passwordProblem(body.next); need(!p, 400, p);
    await setAreaPassword(ctx, body.next);
    await audit(ctx, 'bereichspasswort_geaendert', 'einstellungen', null, null);
    return out({ ok: true });
  }
  if (path === '/links' && method === 'GET') {
    const s = await settingsOf(ctx);
    return out({ ok: true, staff: s.link_staff || url.origin + '/admin', partner: s.link_partner || url.origin + '/partner', shopify: can(u, 'links_view') ? s.link_shopify_admin : null });
  }
  if (path === '/links/send' && method === 'POST') {
    need(can(u, 'users_create') || can(u, 'users_create_vt') || can(u, 'partner_manage'), 403, 'Dafür fehlt dir die Berechtigung.');
    const s = await settingsOf(ctx);
    const which = body.which === 'partner' ? 'partner' : 'staff';
    need(emailOk(body.email), 400, 'Bitte eine gültige E-Mail-Adresse angeben.');
    const link = which === 'partner' ? (s.link_partner || url.origin + '/partner') : (s.link_staff || url.origin + '/admin');
    const r = await sendMail(ctx, { category: 'system', to: str(body.email, 200), subject: which === 'partner' ? 'Dein Link zum KFL-Partner-Dashboard' : 'Dein Link zum KFL Dashboard', title: which === 'partner' ? 'KFL-Partner-Dashboard' : 'KFL Dashboard', body: `<p>Hallo,</p><p>hier ist der Link ${which === 'partner' ? 'zum KFL-Partner-Dashboard' : 'zum internen KFL Dashboard'}:</p>${mailBtn(link, 'Dashboard öffnen')}<p style="color:#6b6b70;font-size:13px">${esc(link)}</p>` });
    await audit(ctx, 'link_versendet', 'link', which, { an: body.email });
    return out({ ok: true, mail: r.status });
  }
  // Postfach-Zugang im Dashboard hinterlegen: wird bei IONOS geprüft und verschlüsselt gespeichert
  if (path === '/mail/credentials' && method === 'POST') {
    requirePerm(u, 'settings_all');
    const user = str(body.user, 200).toLowerCase(), pass = String(body.pass || '');
    need(emailOk(user), 400, 'Bitte die E-Mail-Adresse des Postfachs angeben.');
    need(pass.length >= 1 && pass.length <= 200, 400, 'Bitte das Passwort des Postfachs angeben.');
    try { await smtpVerify(env, user, pass); }
    catch (e) { await audit(ctx, 'mailzugang_fehlgeschlagen', 'einstellungen', null, { postfach: user }); throw new HttpError(400, /AUTH|535|Authentication/i.test(e.message) ? 'IONOS hat die Anmeldung abgelehnt: E-Mail-Adresse oder Passwort des Postfachs stimmen nicht.' : 'Keine Verbindung zum Mailserver: ' + e.message); }
    await setRawSetting(db, '_smtp_cred', await sealSecret(env, JSON.stringify({ user, pass })));
    ctx._mailEnv = null;
    await audit(ctx, 'mailzugang_gespeichert', 'einstellungen', null, { postfach: user });
    return out({ ok: true, user });
  }
  if (path === '/mail/credentials' && method === 'DELETE') {
    requirePerm(u, 'settings_all');
    await DB.run(db, "DELETE FROM settings WHERE key = '_smtp_cred'"); ctx._mailEnv = null;
    await audit(ctx, 'mailzugang_entfernt', 'einstellungen', null, null);
    return out({ ok: true });
  }
  if (path === '/mail/test' && method === 'POST') {
    requirePerm(u, 'settings_all');
    const to = str(body.to, 200) || u.email; need(emailOk(to), 400, 'Bitte eine gültige E-Mail-Adresse angeben.');
    const cat = MAIL_CATEGORIES[body.category] ? body.category : 'system';
    const s = await settingsOf(ctx);
    const r = await sendMail(ctx, { category: cat, to, subject: 'Test-E-Mail aus dem KFL Dashboard', title: 'Der E-Mail-Versand funktioniert',
      body: `<p>Hallo ${esc(u.name)},</p><p>diese Test-E-Mail wurde über ${mailProvider(await mailEnv(ctx)) === 'smtp' ? 'das Postfach ' + esc(smtpUser(await mailEnv(ctx))) : mailProvider(await mailEnv(ctx)) === 'brevo' ? 'Brevo' : 'keinen Dienst'} mit dem Absender <strong>${esc(s[MAIL_CATEGORIES[cat].setting] || s.mail_from_system)}</strong> versendet.</p>` });
    await audit(ctx, 'test_mail', 'einstellungen', null, { an: to, status: r.status });
    return out({ ok: true, status: r.status, error: r.error || null, provider: mailProvider(await mailEnv(ctx)) });
  }
  if (path === '/outbox' && method === 'GET') { requirePerm(u, 'settings_all'); return out({ ok: true, mails: await DB.all(db, 'SELECT id, category, sender, recipient, subject, status, error, server_reply, created_at FROM mail_outbox ORDER BY id DESC LIMIT 200') }); }
  if ((m = path.match(/^\/outbox\/(\d+)$/)) && method === 'GET') { requirePerm(u, 'settings_all'); const mm = await DB.one(db, 'SELECT * FROM mail_outbox WHERE id = ?', +m[1]); need(mm, 404, 'Nicht gefunden.'); return new Response(mm.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'", ...SEC_HEADERS } }); }
  if (path === '/geo/import' && method === 'POST') {
    requirePerm(u, 'settings_all');
    let n = 0;
    for (const line of String(body.csv || '').split(/\r?\n/)) {
      const [zip, lat, lon, city] = line.split(/[;,\t]/).map((x) => (x || '').trim());
      if (!plzOk(zip) || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) continue;
      await DB.run(db, 'INSERT OR REPLACE INTO geo_cache (zip, lat, lon, city, source, created_at) VALUES (?, ?, ?, ?, ?, ?)', zip, parseFloat(lat), parseFloat(lon), city || '', 'import', nowIso()); n++;
    }
    await audit(ctx, 'geodaten_importiert', 'einstellungen', null, { anzahl: n });
    return out({ ok: true, imported: n });
  }
  if (path === '/jobs/run' && method === 'POST') { requirePerm(u, 'settings_all'); const r = await runJobs(ctx, { force: body.job }); await audit(ctx, 'job_manuell', 'system', body.job || 'alle', r); return out({ ok: true, result: r }); }
  if (path === '/import-old' && method === 'POST') { requirePerm(u, 'settings_all'); const r = await importOldDatabase(ctx); await audit(ctx, 'altdaten_importiert', 'system', null, r); return out({ ok: true, ...r }); }

  return fail(404, 'Nicht gefunden.');
}

async function staffInviteMail(ctx, user, token, url, reset = false) {
  const s = await settingsOf(ctx);
  const base = s.link_staff || url.origin + '/admin';
  const link = `${base.replace(/\/$/, '')}#/einladung/${token}`;
  const r = await sendMail(ctx, { category: 'system', to: user.email, toName: user.name, subject: reset ? 'Neues Passwort für dein KFL Dashboard' : 'Deine Einladung zum KFL Dashboard', title: reset ? 'Neues Passwort festlegen' : 'Willkommen im KFL Dashboard',
    body: `<p>Hallo ${esc(user.name)},</p><p>${reset ? 'über diesen Link legst du ein neues Passwort fest' : 'du wurdest zum internen KFL Dashboard eingeladen. Lege über diesen Link dein Passwort fest'} (gültig ${INVITE_DAYS} Tage):</p>${mailBtn(link, 'Passwort festlegen')}<p style="color:#6b6b70;font-size:13px">Wenn du diese E-Mail nicht erwartet hast, ignoriere sie einfach.</p>` });
  return { link, status: r.status };
}

async function orgFromBody(ctx, u, b, existing) {
  const o = {};
  const set = (k, v) => { if (v !== undefined) o[k] = v; };
  if (!existing || b.name !== undefined) { need(str(b.name, 160), 400, 'Bitte gib den Firmennamen an.'); o.name = str(b.name, 160); }
  if (b.kind !== undefined) set('kind', b.kind === 'einzel' ? 'einzel' : 'organisation');
  for (const k of ['street', 'city', 'country', 'phone', 'website', 'billing_name', 'billing_street', 'billing_city', 'vat_id', 'tax_no']) if (b[k] !== undefined) set(k, str(b[k], 200));
  for (const k of ['email', 'billing_email']) if (b[k] !== undefined) { const e = str(b[k], 200).toLowerCase(); need(!e || emailOk(e), 400, 'Bitte eine gültige E-Mail-Adresse angeben.'); set(k, e); }
  for (const k of ['zip', 'billing_zip']) if (b[k] !== undefined) { const z = str(b[k], 10); need(!z || plzOk(z), 400, 'Bitte eine gültige Postleitzahl angeben.'); set(k, z); }
  if (b.brands !== undefined) set('brands', JSON.stringify(Array.isArray(b.brands) ? b.brands.map((x) => str(x, 60)).filter(Boolean) : String(b.brands).split(',').map((x) => x.trim()).filter(Boolean)));
  if (b.accepts !== undefined) set('accepts', JSON.stringify((Array.isArray(b.accepts) ? b.accepts : []).filter((x) => REQUEST_TYPES[x])));
  if (b.max_radius_km !== undefined) set('max_radius_km', b.max_radius_km === '' || b.max_radius_km === null ? null : toInt(b.max_radius_km, null));
  if (b.opening !== undefined) { const op = {}; for (const d of WEEKDAYS) { const v = b.opening[d]; op[d] = v && v[0] && v[1] ? [str(v[0], 5), str(v[1], 5)] : null; } set('opening', JSON.stringify(op)); }
  if (b.contacts !== undefined) set('contacts', JSON.stringify((b.contacts || []).slice(0, 20).map((c) => ({ role: str(c.role, 60), name: str(c.name, 80), email: str(c.email, 200), phone: str(c.phone, 40) }))));
  if (b.active !== undefined) set('active', b.active ? 1 : 0);
  const terms = ['billing_mode', 'lead_price', ...Object.keys(ORG_TERMS)].filter((k) => b[k] !== undefined && (!existing || String(b[k] ?? '') !== String(existing[k] ?? '')));
  if (terms.length) {
    need(can(u, 'partner_terms'), 403, 'Konditionen (Abrechnungsart, Zahlungsziel, Gebühren) dürfen nur Geschäftsführung und Admin ändern.');
    if (b.billing_mode !== undefined) set('billing_mode', b.billing_mode === 'monatlich' ? 'monatlich' : 'einzel');
    // Zahlungsziel, Fristen (Tage) und Mahngebühren (€) – leer = Standard aus den Einstellungen
    for (const k of Object.keys(ORG_TERMS)) if (b[k] !== undefined) {
      const isFee = /fee/.test(k), v = b[k] === '' || b[k] === null ? null : isFee ? toNum(b[k]) : toInt(b[k], null);
      need(v === null || (v >= 0 && (isFee ? v <= 10000 : v <= 365)), 400, isFee ? 'Bitte eine gültige Mahngebühr angeben.' : 'Bitte eine gültige Anzahl Tage (0–365) angeben.');
      set(k, v === null ? null : isFee ? round2(v) : v);
    }
    if (b.lead_price !== undefined) set('lead_price', b.lead_price === '' || b.lead_price === null ? null : toNum(b.lead_price));
  }
  // Geokoordinaten der Anschrift
  const zip = o.zip !== undefined ? o.zip : existing && existing.zip;
  if (zip && (!existing || o.zip !== undefined)) { const g = await geocodePlz(ctx, zip); if (g) { o.lat = g.lat; o.lon = g.lon; } }
  if (!existing) {
    if (!o.opening) o.opening = JSON.stringify(DEFAULT_OPENING); if (!o.brands) o.brands = '[]';
    // Neue Geschäftspartner bekommen die Standard-Konditionen fest hinterlegt (danach je Partner änderbar)
    const st = await settingsOf(ctx); for (const [col, key] of Object.entries(ORG_TERMS)) if (o[col] === undefined || o[col] === null) o[col] = st[key];
  }
  return o;
}
