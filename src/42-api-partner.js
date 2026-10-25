/* ============================================================
   Schnittstelle Partner-Dashboard (/papi/…)
   Sichtbarkeit: Neue Anfragen sieht die ganze Organisation (nur Eckdaten),
   nach Übernahme nur die bearbeitende Person; Verkaufsleitung/Geschäftsführer
   sehen nur, wer bearbeitet (Angebote über die Seite „Angebote“, protokolliert).
   ============================================================ */

function partnerPublic(p) {
  return p && { id: p.id, name: p.name, email: p.email, role: p.role, roleLabel: p.roleLabel, phone: p.phone, mustChangePw: p.mustChangePw, consentsOk: p.consentsOk, prevLogin: p.prevLogin,
    org: { id: p.org.id, name: p.org.name, kind: p.org.kind, city: p.org.city, brands: jparse(p.org.brands, []) } };
}
function asgTone(a) { return (ASSIGN_STATUSES.find((s) => s.key === a.status) || {}).tone || 'info'; }

async function partnerAssignmentView(ctx, p, a, { detail = false } = {}) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  const mine = a.taken_by === p.id;
  const base = { id: a.id, status: a.status, statusLabel: statusLabel(ASSIGN_STATUSES, a.status), tone: a.archived ? 'warn' : asgTone(a), distance_km: a.distance_km, deadline_at: a.deadline_at,
    created_at: a.created_at, lock_until: mine ? a.lock_until : null, taken_at: a.taken_at, sent_at: a.sent_at, won_at: a.won_at, contact_due_at: mine || p.rank >= 2 ? a.contact_due_at : null,
    closed_reason: a.closed_reason, archived: !!a.archived, mine, direct: a.target_user_id === p.id, source: a.source };
  if (a.status === 'neu') return { ...base, level: 'teaser', request: partnerRequestData(req, 'teaser') };
  if (!mine) {
    if (p.rank < 2) return null;
    const taker = a.taken_by ? await DB.one(ctx.db, 'SELECT name FROM partner_users WHERE id = ?', a.taken_by) : null;
    return { ...base, level: 'summary', taker: taker ? taker.name : null, request: partnerRequestData(req, 'teaser') };
  }
  const v = { ...base, level: 'full', request: partnerRequestData(req, 'full') };
  if (detail) {
    const offer = a.offer_id ? await DB.one(ctx.db, 'SELECT * FROM offers WHERE id = ?', a.offer_id) : null;
    v.offer = offer ? { ...offer, data: jparse(offer.data, {}) } : null;
    v.events = await DB.all(ctx.db, 'SELECT action, text, actor_name, created_at FROM partner_events WHERE assignment_id = ? AND visible_partner = 1 ORDER BY id DESC', a.id);
    if (['gewonnen', 'kontaktiert', 'nicht_erreicht', 'gescheitert'].includes(a.status)) v.contact = customerContact(req);
    v.payKind = req.pay_kind; v.kindHint = req.type === 'sell' ? 'ankauf' : ({ kaufen: 'kauf', finanzieren: 'finanzierung', leasen: 'leasing' }[req.pay_kind] || 'kauf');
    v.b2b = /gewerb|selbst/i.test(jparse(req.data, {}).Kundenart || '');
    if (!a.seen_at) await DB.update(ctx.db, 'assignments', a.id, { seen_at: nowIso() });
  }
  return v;
}

// PDF-Text grob auslesen (unkomprimiert und Flate), um Eckdaten vorzuschlagen
async function pdfText(bytes) {
  const raw = new TextDecoder('latin1').decode(bytes);
  const chunks = [];
  const re = /stream\r?\n/g; let mt;
  while ((mt = re.exec(raw))) {
    const start = mt.index + mt[0].length, end = raw.indexOf('endstream', start);
    if (end < 0) break;
    const dict = raw.slice(Math.max(0, mt.index - 300), mt.index);
    const data = bytes.subarray(start, end);
    let txt = '';
    if (/FlateDecode/.test(dict)) { try { const ds = new DecompressionStream('deflate'); txt = new TextDecoder('latin1').decode(await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer()); } catch (e) { txt = ''; } }
    else txt = new TextDecoder('latin1').decode(data);
    const parts = [];
    for (const t of txt.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj|\[(?:[^\]]*)\]\s*TJ/g)) {
      const s = t[0];
      const strs = [...s.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((x) => x[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, '$1'));
      parts.push(strs.join(''));
    }
    if (parts.length) chunks.push(parts.join(' '));
    re.lastIndex = end;
  }
  return chunks.join('\n').replace(/\s+/g, ' ').slice(0, 50000);
}
function offerSuggestions(text) {
  const num = (s) => toNum(s);
  const find = (patterns) => { for (const p of patterns) { const m = text.match(p); if (m) { const n = num(m[1]); if (n !== null) return n; } } return null; };
  const amount = '([0-9]{1,3}(?:[.\\s][0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)\\s*(?:€|EUR)?';
  const sug = {
    monthly_rate: find([new RegExp('(?:monatliche?\\s*(?:Leasing|Finanzierungs)?rate|Rate\\s*mtl\\.?|mtl\\.?\\s*Rate|Leasingrate|monatlich)[^0-9]{0,40}' + amount, 'i')]),
    price: find([new RegExp('(?:Kaufpreis|Barpreis|Hauspreis|Gesamtpreis|Fahrzeugpreis)[^0-9]{0,40}' + amount, 'i')]),
    final_rate: find([new RegExp('(?:Schlussrate|Restrate|Restwert)[^0-9]{0,40}' + amount, 'i')]),
    down_payment: find([new RegExp('(?:Anzahlung|Sonderzahlung|Leasingsonderzahlung)[^0-9]{0,40}' + amount, 'i')]),
    transfer_cost: find([new RegExp('(?:Überführung|Ueberfuehrung|Bereitstellung|Zulassung)[^0-9]{0,60}' + amount, 'i')]),
    term_months: find([/(?:Laufzeit|Vertragslaufzeit)[^0-9]{0,30}([0-9]{2})\s*(?:Monate|Mon)/i, /([0-9]{2})\s*Monate/i]),
    km_per_year: find([/([0-9]{1,3}[.\s]?[0-9]{3})\s*km\s*(?:\/|pro|p\.)\s*(?:Jahr|a)/i, /(?:Fahrleistung|Laufleistung)[^0-9]{0,30}([0-9]{1,3}[.\s]?[0-9]{3})/i]),
    upe: find([new RegExp('(?:UPE|Listenpreis|unverbindliche Preisempfehlung)[^0-9]{0,40}' + amount, 'i')]),
    mileage: find([/(?:Kilometerstand|km-Stand|Laufleistung)[^0-9]{0,20}([0-9]{1,3}[.\s]?[0-9]{3})\s*km/i])
  };
  const herst = text.match(/(?:Konfigurationscode|Konfigurations-?Nr|Code)[:\s]*([A-Z0-9-]{6,20})/i);
  if (herst) sug.herstellercode = herst[1];
  return Object.fromEntries(Object.entries(sug).filter(([, v]) => v !== null && v !== undefined));
}

async function handlePartnerApi(ctx, url) {
  const { request, db } = ctx;
  const path = url.pathname.replace(/^\/papi/, '') || '/';
  const method = request.method;
  if (method !== 'GET') { need(request.headers.get('X-KFL') === '1', 403, 'Ungültige Anfrage'); const o = request.headers.get('Origin'); need(!o || o === url.origin, 403, 'Ungültige Herkunft'); }
  const body = method === 'GET' ? {} : await readJson(request, 20_000_000);
  const q = Object.fromEntries(url.searchParams);
  const s = await settingsOf(ctx);
  let m;

  if (path === '/session' && method === 'GET') { const p = await currentPartner(ctx); return out({ ok: true, user: partnerPublic(p), links: { shop: s.link_shop, instagram: s.link_instagram, agb: s.link_agb_partner, privacy: s.link_privacy }, config: { assignStatuses: ASSIGN_STATUSES, partnerRoles: PARTNER_ROLES, weekdays: WEEKDAYS, weekdayLabels: WEEKDAY_LABELS } }); }
  if (path === '/login' && method === 'POST') {
    const r = await loginGeneric(ctx, 'partner_users', 'partner_sessions', str(body.email, 200).toLowerCase(), String(body.password || ''));
    if (r.error) return fail(r.status, r.error);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(PARTNER_COOKIE, r.session.token, r.session.maxAge) });
  }
  if (path === '/logout' && method === 'POST') { const t = readCookie(request, PARTNER_COOKIE); if (t) await DB.run(db, 'DELETE FROM partner_sessions WHERE token_hash = ?', await sha256Hex(t)); return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(PARTNER_COOKIE, '', 0) }); }
  if (path === '/invite/check' && method === 'GET') {
    const t = q.token || ''; need(/^[0-9a-f]{64}$/.test(t), 400, 'Ungültiger Link.');
    const u = await DB.one(db, 'SELECT u.email, u.name, u.invite_expires, o.name AS org_name FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE u.invite_hash = ? AND u.active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ungültig oder abgelaufen. Bitte wende dich an den KFL-Support.');
    return out({ ok: true, email: u.email, name: u.name, org: u.org_name });
  }
  if (path === '/invite/accept' && method === 'POST') {
    const t = str(body.token, 64); need(/^[0-9a-f]{64}$/.test(t), 400, 'Ungültiger Link.');
    const u = await DB.one(db, 'SELECT * FROM partner_users WHERE invite_hash = ? AND active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ungültig oder abgelaufen.');
    const pr = passwordProblem(body.password); need(!pr, 400, pr);
    need(body.agb && body.privacy, 400, 'Bitte akzeptiere die AGB und die Datenschutzhinweise.');
    const h = await hashPassword(body.password);
    await DB.run(db, 'UPDATE partner_users SET pass_hash = ?, pass_salt = ?, invite_hash = NULL, invite_expires = NULL, failed_logins = 0, must_change_pw = 0, agb_at = COALESCE(agb_at, ?), privacy_at = COALESCE(privacy_at, ?), last_login = ? WHERE id = ?', h.hash, h.salt, nowIso(), nowIso(), nowIso(), u.id);
    await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', u.id);
    ctx.actor = { type: 'partner', id: u.id, name: u.name };
    await audit(ctx, 'partner_passwort_gesetzt', 'partnerkonto', u.id, { agb: true, datenschutz: true });
    const sess = await createSessionRow(db, 'partner_sessions', u.id);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(PARTNER_COOKIE, sess.token, sess.maxAge) });
  }
  if (path === '/support-public' && method === 'POST') {
    if (body.website) return out({ ok: true });
    const name = str(body.name, 80), email = str(body.email, 200).toLowerCase(), message = str(body.message, 4000);
    need(name && emailOk(email) && message.length >= 5, 400, 'Bitte fülle Name, E-Mail und Nachricht aus.');
    need((await DB.val(db, "SELECT COUNT(*) FROM audit WHERE action = 'support_ticket' AND ip = ? AND at >= ?", ctx.ipHash || '-', isoOf(nowMs() - 3600e3))) < 5, 429, 'Zu viele Anfragen. Bitte später erneut versuchen.');
    const known = await DB.one(db, 'SELECT id, org_id FROM partner_users WHERE email = ?', email);
    ctx.actor = { type: 'web', name };
    const id = await createTicket(ctx, { tag: 'Partner', category: str(body.topic, 60) || 'Anmeldung / Zugang', subject: str(body.topic, 60) || 'Support-Anfrage (Partner-Login)', requester: { type: known ? 'partner' : 'web', id: known ? known.id : null, name, email }, orgId: known ? known.org_id : null, text: message });
    return out({ ok: true, number: id });
  }

  const p = await currentPartner(ctx);
  requirePartner(p);
  if (path === '/consents' && method === 'POST') {
    need(body.agb && body.privacy, 400, 'Bitte akzeptiere beides.');
    await DB.run(db, 'UPDATE partner_users SET agb_at = COALESCE(agb_at, ?), privacy_at = COALESCE(privacy_at, ?) WHERE id = ?', nowIso(), nowIso(), p.id);
    await audit(ctx, 'partner_zustimmung', 'partnerkonto', p.id, { agb: true, datenschutz: true });
    return out({ ok: true });
  }
  if (path === '/password' && method === 'POST') {
    const row = await DB.one(db, 'SELECT pass_hash, pass_salt FROM partner_users WHERE id = ?', p.id);
    need(await verifyPassword(body.current, row.pass_hash, row.pass_salt), 400, 'Das aktuelle Passwort ist falsch.');
    const pr = passwordProblem(body.next); need(!pr, 400, pr);
    const h = await hashPassword(body.next);
    await DB.run(db, 'UPDATE partner_users SET pass_hash = ?, pass_salt = ?, must_change_pw = 0 WHERE id = ?', h.hash, h.salt, p.id);
    await audit(ctx, 'partner_passwort_geaendert', 'partnerkonto', p.id, null);
    return out({ ok: true });
  }
  need(p.consentsOk, 451, 'Bitte bestätige zuerst die AGB und die Datenschutzhinweise.');
  need(!p.mustChangePw, 428, 'Bitte vergib zuerst ein eigenes Passwort.');
  const visibleAsg = async (where, ...args) => {
    const rows = await DB.all(db, `SELECT * FROM assignments WHERE org_id = ? AND ${where} ORDER BY id DESC LIMIT 300`, p.orgId, ...args);
    const out2 = []; for (const a of rows) { const v = await partnerAssignmentView(ctx, p, a); if (v) out2.push(v); } return out2;
  };

  /* ---------- Start ---------- */
  if (path === '/start' && method === 'GET') {
    const w = isoWeek(nowMs());
    const news = await newsFor(ctx, 'partner', p, { limit: 20 });
    const since = p.prevLogin || isoOf(nowMs() - 7 * 86400e3);
    const today = berlinDate(nowMs());
    const notes = await DB.all(db, 'SELECT * FROM partner_notes WHERE user_id = ? AND (day IS NULL OR day = ?) ORDER BY day IS NOT NULL DESC, id DESC', p.id, today);
    const newReq = await visibleAsg("status = 'neu' AND archived = 0 AND (target_user_id IS NULL OR target_user_id = ? OR ? >= 2)", p.id, p.rank);
    const mine = await visibleAsg("taken_by = ? AND status = 'in_bearbeitung'", p.id);
    const waiting = await visibleAsg("taken_by = ? AND status IN ('versendet','vorgestellt')", p.id);
    const won = await visibleAsg("taken_by = ? AND status IN ('gewonnen','nicht_erreicht')", p.id);
    const st = await DB.one(db, `SELECT COUNT(*) AS taken, SUM(offer_id IS NOT NULL) AS offers, SUM(status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won, SUM(status = 'vorgestellt' OR status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS presented FROM assignments WHERE org_id = ? AND taken_by = ?`, p.orgId, p.id);
    const weekStart = isoOf(berlinToUtc(...addDaysDate(today, -((['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'].indexOf(berlinParts(nowMs()).wd)))).split('-').map(Number), 0, 0));
    const weekOffers = await DB.val(db, 'SELECT COUNT(*) FROM offers WHERE user_id = ? AND created_at >= ?', p.id, weekStart);
    const orgAvg = await DB.val(db, `SELECT AVG(n) FROM (SELECT COUNT(*) AS n FROM offers WHERE org_id = ? AND created_at >= ? GROUP BY user_id)`, p.orgId, isoOf(nowMs() - 28 * 86400e3));
    const goal = Math.max(3, Math.ceil(((orgAvg || 0) / 4) * 1.2));
    const newSince = await DB.val(db, "SELECT COUNT(*) FROM notifications WHERE recipient_type = 'partner' AND recipient_id = ? AND created_at > ?", p.id, since);
    return out({ ok: true, today, week: w.week, year: w.year, news, notes, newRequests: newReq, mine, waiting, won, newSince,
      stats: { taken: st.taken || 0, offers: st.offers || 0, won: st.won || 0, presented: st.presented || 0, winRate: st.offers ? Math.round((st.won || 0) / st.offers * 100) : 0, weekOffers, weekGoal: goal } });
  }
  if (path === '/notes' && method === 'GET') return out({ ok: true, notes: await DB.all(db, 'SELECT * FROM partner_notes WHERE user_id = ? ORDER BY day IS NULL DESC, day, id DESC', p.id) });
  if (path === '/notes' && method === 'POST') { need(str(body.text, 1000), 400, 'Bitte einen Text eingeben.'); need(!body.day || /^\d{4}-\d{2}-\d{2}$/.test(body.day), 400, 'Ungültiges Datum.'); const id = await DB.insert(db, 'partner_notes', { user_id: p.id, day: body.day || null, text: str(body.text, 1000), created_at: nowIso() }); return out({ ok: true, id }); }
  if ((m = path.match(/^\/notes\/(\d+)$/)) && method === 'DELETE') { await DB.run(db, 'DELETE FROM partner_notes WHERE id = ? AND user_id = ?', +m[1], p.id); return out({ ok: true }); }

  /* ---------- Anfragen ---------- */
  if (path === '/requests' && method === 'GET') {
    const tab = q.tab || 'neu';
    const W = {
      neu: ["status = 'neu' AND archived = 0 AND (target_user_id IS NULL OR target_user_id = ? OR ? >= 2)", p.id, p.rank],
      meine: ["taken_by = ? AND status = 'in_bearbeitung'", p.id],
      beantwortet: ["taken_by = ? AND (status IN ('versendet','vorgestellt') OR (status = 'geschlossen' AND archived = 0))", p.id],
      gewonnen: ["taken_by = ? AND status IN ('gewonnen','kontaktiert','nicht_erreicht')", p.id],
      archiv: [p.rank >= 2 ? "(archived = 1 OR status IN ('verloren','gescheitert','kontaktiert'))" : "taken_by = ? AND (archived = 1 OR status IN ('verloren','gescheitert','kontaktiert'))", ...(p.rank >= 2 ? [] : [p.id])],
      team: ["status NOT IN ('neu') AND archived = 0", ]
    }[tab];
    need(W && (tab !== 'team' || p.rank >= 2), 400, 'Unbekannte Ansicht.');
    return out({ ok: true, items: await visibleAsg(...W) });
  }
  if ((m = path.match(/^\/requests\/(\d+)(?:\/(take|release|offer|contact|parse-pdf))?$/))) {
    const a = await DB.one(db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', +m[1], p.orgId);
    need(a, 404, 'Anfrage nicht gefunden.');
    const sub = m[2] || '';
    if (!sub && method === 'GET') { const v = await partnerAssignmentView(ctx, p, a, { detail: true }); need(v, 403, 'Diese Anfrage wird von einer anderen Person bearbeitet.'); return out({ ok: true, item: v }); }
    if (sub === 'take' && method === 'POST') return out(await takeAssignment(ctx, p, a.id));
    if (sub === 'release' && method === 'POST') { need(a.taken_by === p.id && a.status === 'in_bearbeitung', 409, 'Du kannst nur deine eigenen Anfragen in Bearbeitung wieder öffnen.'); await releaseAssignment(ctx, a.id, { byPartner: true }); await audit(ctx, 'partner_wieder_geoeffnet', 'zuordnung', a.id, null); return out({ ok: true }); }
    if (sub === 'offer' && method === 'POST') return out(await submitOffer(ctx, p, a.id, body));
    if (sub === 'contact' && method === 'POST') { await partnerContactStatus(ctx, p, a.id, body.status, str(body.note, 1000)); await audit(ctx, 'partner_kontaktstatus', 'zuordnung', a.id, { status: body.status }); return out({ ok: true }); }
    if (sub === 'parse-pdf' && method === 'POST') {
      need(a.taken_by === p.id, 403, 'Bitte übernimm die Anfrage zuerst.');
      need(body.base64, 400, 'Bitte eine PDF-Datei auswählen.');
      const text = await pdfText(unb64(body.base64));
      return out({ ok: true, suggestions: offerSuggestions(text), textFound: text.length > 20 });
    }
  }

  /* ---------- Angebote (Verkaufsleitung, Geschäftsführer) ---------- */
  if (path === '/offers' && method === 'GET') {
    requirePartner(p, 'vl');
    const rows = await DB.all(db, `SELECT o.id, o.request_id, o.kind, o.status, o.created_at, o.data, o.pdf_file_id, o.expose_file_id, a.status AS a_status, a.id AS assignment_id, pu.name AS user_name, r.brand, r.model, r.zustand
      FROM offers o JOIN assignments a ON a.id = o.assignment_id JOIN requests r ON r.id = o.request_id LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.org_id = ? ORDER BY o.id DESC LIMIT 500`, p.orgId);
    return out({ ok: true, offers: rows.map((o) => ({ id: o.id, number: toNumber(o.request_id), kind: o.kind, status: o.status, aStatus: o.a_status, aStatusLabel: statusLabel(ASSIGN_STATUSES, o.a_status), created_at: o.created_at, user_name: o.user_name, brand: o.brand, model: o.model, zustand: o.zustand, has_pdf: !!o.pdf_file_id, has_expose: !!o.expose_file_id })) });
  }
  if ((m = path.match(/^\/offers\/(\d+)(?:\/file)?$/)) && method === 'GET') {
    requirePartner(p, 'vl');
    const o = await DB.one(db, 'SELECT o.*, pu.name AS user_name, r.brand, r.model FROM offers o JOIN requests r ON r.id = o.request_id LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.id = ? AND o.org_id = ?', +m[1], p.orgId);
    need(o, 404, 'Angebot nicht gefunden.');
    const isFile = path.endsWith('/file');
    await partnerEvent(ctx, { assignmentId: o.assignment_id, requestId: o.request_id, orgId: p.orgId, action: 'angebot_eingesehen', confidential: true, text: `Vertrauliche Information: ${p.name} (${p.roleLabel}) hat ${isFile ? 'die PDF-Datei' : 'das Angebot'} von ${o.user_name || 'einem Nutzer'} geöffnet.` });
    await audit(ctx, 'partner_angebot_eingesehen', 'angebot', o.id, { datei: isFile });
    if (isFile) { const fid = q.which === 'expose' ? o.expose_file_id : o.pdf_file_id; need(fid, 404, 'Keine Datei vorhanden.'); return fileResponse(await getFile(ctx, fid), q.download === '1'); }
    return out({ ok: true, offer: { id: o.id, number: toNumber(o.request_id), kind: o.kind, status: o.status, created_at: o.created_at, user_name: o.user_name, brand: o.brand, model: o.model, data: jparse(o.data, {}), has_pdf: !!o.pdf_file_id, has_expose: !!o.expose_file_id } });
  }

  /* ---------- News ---------- */
  if (path === '/news' && method === 'GET') return out({ ok: true, ...(await newsFor(ctx, 'partner', p, { limit: 100 })) });
  if (path === '/news/read' && method === 'POST') {
    const read = body.read !== false;
    for (const id of (body.posts || []).map(Number)) { if (read) await DB.run(db, 'INSERT OR IGNORE INTO news_reads (post_id, reader_type, reader_id, read_at) VALUES (?, ?, ?, ?)', id, 'partner', p.id, nowIso()); else await DB.run(db, "DELETE FROM news_reads WHERE post_id = ? AND reader_type = 'partner' AND reader_id = ?", id, p.id); }
    for (const id of (body.notifications || []).map(Number)) await DB.run(db, "UPDATE notifications SET read_at = ? WHERE id = ? AND recipient_type = 'partner' AND recipient_id = ?", read ? nowIso() : null, id, p.id);
    if (body.all) await DB.run(db, "UPDATE notifications SET read_at = ? WHERE recipient_type = 'partner' AND recipient_id = ? AND read_at IS NULL", nowIso(), p.id);
    return out({ ok: true });
  }

  /* ---------- Statistik ---------- */
  if ((path === '/stats' || path === '/report') && method === 'GET') {
    requirePartner(p, 'vl');
    const days = path === '/report' ? (q.days === '60' ? 60 : 30) : null;
    const P = periodOf(days ? { from: addDaysDate(berlinDate(nowMs()), -(days - 1)) } : q);
    const where = ['a.org_id = ?', 'a.created_at >= ?', 'a.created_at < ?'], args = [p.orgId, ...P.range];
    if (q.brand) { where.push('r.brand = ?'); args.push(q.brand); }
    if (q.model) { where.push('r.model = ?'); args.push(q.model); }
    if (q.role && p.role === 'gf' && PARTNER_ROLES[q.role]) { where.push('a.taken_by IN (SELECT id FROM partner_users WHERE org_id = ? AND role = ?)'); args.push(p.orgId, q.role); }
    const W = where.join(' AND ');
    const tot = await DB.one(db, `SELECT COUNT(*) AS received, SUM(a.status != 'neu' AND a.status != 'verloren' OR a.offer_id IS NOT NULL) AS worked, SUM(a.status = 'verloren' AND a.offer_id IS NULL) AS missed,
      SUM(a.status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won, SUM(a.status IN ('geschlossen','gescheitert')) AS lost, SUM(a.status IN ('in_bearbeitung','versendet','vorgestellt')) AS open, SUM(a.offer_id IS NOT NULL) AS offers FROM assignments a JOIN requests r ON r.id = a.request_id WHERE ${W}`, ...args);
    const brands = await DB.all(db, `SELECT COALESCE(NULLIF(r.brand,''),'(ohne)') AS brand, COUNT(*) AS n, SUM(a.status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won FROM assignments a JOIN requests r ON r.id = a.request_id WHERE ${W} GROUP BY brand ORDER BY n DESC LIMIT 15`, ...args);
    const models = await DB.all(db, `SELECT COALESCE(NULLIF(r.brand,''),'') || ' ' || COALESCE(r.model,'') AS model, COUNT(*) AS n FROM assignments a JOIN requests r ON r.id = a.request_id WHERE ${W} GROUP BY model ORDER BY n DESC LIMIT 15`, ...args);
    let team = null;
    if (p.role === 'gf') team = await DB.all(db, `SELECT u.id, u.name, u.role, COUNT(a.id) AS taken, SUM(a.offer_id IS NOT NULL) AS offers, SUM(a.status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won,
      AVG(CASE WHEN a.taken_at IS NOT NULL THEN (julianday(a.taken_at) - julianday(a.created_at)) * 24 END) AS react_h, AVG(CASE WHEN a.sent_at IS NOT NULL THEN (julianday(a.sent_at) - julianday(a.taken_at)) * 24 END) AS offer_h
      FROM partner_users u LEFT JOIN assignments a ON a.taken_by = u.id AND a.created_at >= ? AND a.created_at < ? WHERE u.org_id = ? AND u.active = 1 GROUP BY u.id ORDER BY offers DESC`, ...P.range, p.orgId);
    const accept = await DB.one(db, `SELECT SUM(o.status = 'angenommen') AS accepted, SUM(o.status IN ('nicht_ausgewaehlt','abgelehnt_kunde')) AS rejected, SUM(o.status = 'vorgestellt') AS presented FROM offers o WHERE o.org_id = ? AND o.created_at >= ? AND o.created_at < ?`, p.orgId, ...P.range);
    const data = { period: { from: P.from, to: P.to }, totals: tot, brands, models, team, accept, filters: { brands: (await DB.all(db, 'SELECT DISTINCT r.brand FROM assignments a JOIN requests r ON r.id = a.request_id WHERE a.org_id = ? AND r.brand != \'\' ORDER BY r.brand', p.orgId)).map((x) => x.brand) } };
    if (path === '/stats') return out({ ok: true, ...data });
    requirePartner(p, 'gf');
    await audit(ctx, 'partner_bericht', 'partner', p.orgId, { tage: days, rolle: q.role || 'alle' });
    const pdf = renderReportPdf(s, `Bericht ${p.org.name}`, `Zeitraum ${fmtDateDE(P.from)} – ${fmtDateDE(P.to)} (${days} Tage)${q.role ? ' · Rolle: ' + PARTNER_ROLES[q.role].label : ''} · erstellt ${fmtDE(nowMs())}`, [
      { title: 'Überblick', columns: ['Erhalten', 'Bearbeitet', 'Angebote', 'Gewonnen', 'Nicht gewählt', 'Verpasst'], rows: [[tot.received || 0, tot.worked || 0, tot.offers || 0, tot.won || 0, tot.lost || 0, tot.missed || 0]] },
      { title: 'Angebote beim Kunden', columns: ['Angenommen', 'Nicht gewählt / abgelehnt', 'Aktuell vorgestellt'], rows: [[accept.accepted || 0, accept.rejected || 0, accept.presented || 0]] },
      ...(team ? [{ title: 'Team', columns: ['Name', 'Rolle', 'Übernommen', 'Angebote', 'Gewonnen', 'Reaktion (h)', 'Angebot (h)'], widths: [140, 80, 60, 55, 55, 60, 60], rows: team.map((t) => [t.name, PARTNER_ROLES[t.role].label, t.taken || 0, t.offers || 0, t.won || 0, t.react_h != null ? t.react_h.toFixed(1) : '–', t.offer_h != null ? t.offer_h.toFixed(1) : '–']) }] : []),
      { title: 'Marken', columns: ['Marke', 'Anfragen', 'Gewonnen'], rows: brands.map((b) => [b.brand, b.n, b.won || 0]) },
      { title: 'Modelle', columns: ['Modell', 'Anfragen'], rows: models.map((x) => [x.model, x.n]) }
    ]);
    return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="KFL-Bericht-${days}-Tage.pdf"`, ...SEC_HEADERS } });
  }

  /* ---------- Einstellungen ---------- */
  if (path === '/settings' && method === 'GET') {
    const org = p.org;
    const res = { profile: { name: p.name, email: p.email, phone: p.phone, role: p.role }, org: { name: org.name, street: org.street, zip: org.zip, city: org.city, phone: org.phone, email: org.email, website: org.website, brands: jparse(org.brands, []) } };
    if (p.role === 'gf') {
      Object.assign(res.org, { opening: jparse(org.opening, DEFAULT_OPENING), billing_email: org.billing_email, billing_name: org.billing_name, billing_street: org.billing_street, billing_zip: org.billing_zip, billing_city: org.billing_city, vat_id: org.vat_id, billing_mode: org.billing_mode });
      res.users = await DB.all(db, 'SELECT id, name, email, role, active, last_login FROM partner_users WHERE org_id = ? AND active = 1 ORDER BY role, name', p.orgId);
      res.pending = await DB.all(db, "SELECT id, subject, created_at, status FROM tickets WHERE org_id = ? AND kind = 'aenderung' AND status != 'erledigt' ORDER BY id DESC", p.orgId);
      res.invoices = await DB.all(db, "SELECT id, number, issue_date, due_date, gross, paid, fees, status, dunning_level FROM invoices WHERE org_id = ? AND kind != 'storno' ORDER BY id DESC LIMIT 50", p.orgId);
    }
    return out({ ok: true, ...res });
  }
  if (path === '/settings/profile' && method === 'PATCH') { await DB.update(db, 'partner_users', p.id, { name: str(body.name, 80) || p.name, phone: str(body.phone, 40) }); await audit(ctx, 'partner_profil', 'partnerkonto', p.id, null); return out({ ok: true }); }
  if (path === '/settings/org' && method === 'PATCH') {
    requirePartner(p, 'gf');
    const upd = {};
    if (body.opening) { const op = {}; for (const d of WEEKDAYS) { const v = body.opening[d]; op[d] = v && v[0] && v[1] && /^\d{2}:\d{2}$/.test(v[0]) && /^\d{2}:\d{2}$/.test(v[1]) ? [v[0], v[1]] : null; } upd.opening = JSON.stringify(op); }
    if (body.billing_email !== undefined) { need(emailOk(body.billing_email), 400, 'Bitte eine gültige Rechnungs-E-Mail angeben.'); upd.billing_email = str(body.billing_email, 200).toLowerCase(); }
    for (const k of ['billing_name', 'billing_street', 'billing_city']) if (body[k] !== undefined) upd[k] = str(body[k], 160);
    if (body.billing_zip !== undefined) { need(!body.billing_zip || plzOk(body.billing_zip), 400, 'Ungültige Postleitzahl.'); upd.billing_zip = str(body.billing_zip, 5); }
    upd.updated_at = nowIso();
    await DB.update(db, 'orgs', p.orgId, upd);
    await DB.insert(db, 'org_notes', { org_id: p.orgId, user_id: null, text: `Partner-Geschäftsführer ${p.name} hat geändert: ${Object.keys(upd).filter((k) => k !== 'updated_at').join(', ')}`, created_at: nowIso() });
    await audit(ctx, 'partner_org_geaendert', 'partner', p.orgId, Object.keys(upd));
    return out({ ok: true });
  }
  if (path === '/settings/users/request' && method === 'POST') {
    requirePartner(p, 'gf');
    const action = body.action;
    need(['role', 'delete_user', 'add_user', 'delete_org'].includes(action), 400, 'Unbekannte Änderung.');
    let label = '', payload = { action };
    if (action === 'delete_org') { label = `Löschung der gesamten Organisation ${p.org.name}`; }
    else if (action === 'add_user') { need(emailOk(body.email) && str(body.name, 80) && PARTNER_ROLES[body.role], 400, 'Bitte Name, E-Mail und Rolle angeben.'); payload = { action, email: str(body.email, 200).toLowerCase(), name: str(body.name, 80), role: body.role, phone: str(body.phone, 40) }; label = `Neues Konto: ${payload.name} (${payload.email}) als ${PARTNER_ROLES[body.role].label}`; }
    else {
      const t = await DB.one(db, 'SELECT * FROM partner_users WHERE id = ? AND org_id = ? AND active = 1', toInt(body.user_id), p.orgId); need(t, 404, 'Konto nicht gefunden.'); need(t.id !== p.id || action === 'role', 400, 'Du kannst dein eigenes Konto nicht löschen.');
      if (action === 'role') { need(PARTNER_ROLES[body.role], 400, 'Unbekannte Rolle.'); payload = { action, user_id: t.id, role: body.role }; label = `Rolle von ${t.name} ändern: ${PARTNER_ROLES[t.role].label} → ${PARTNER_ROLES[body.role].label}`; }
      else { payload = { action, user_id: t.id }; label = `Konto von ${t.name} (${t.email}) löschen`; }
    }
    payload.label = label;
    const id = await createTicket(ctx, { tag: 'Partner', kind: action === 'delete_org' ? 'ticket' : 'aenderung', category: action === 'delete_org' ? 'Löschung Organisation' : 'Änderungsantrag', subject: label, priority: 'hoch', requester: { type: 'partner', id: p.id, name: p.name, email: p.email }, orgId: p.orgId, payload, text: `${label}${body.note ? '\nAnmerkung: ' + str(body.note, 1000) : ''}\nBeantragt von ${p.name} (Geschäftsführer, ${p.org.name}).` });
    return out({ ok: true, ticket: id });
  }
  if ((m = path.match(/^\/invoices\/(\d+)\/pdf$/)) && method === 'GET') {
    requirePartner(p, 'gf');
    const inv = await DB.one(db, 'SELECT * FROM invoices WHERE id = ? AND org_id = ?', +m[1], p.orgId); need(inv, 404, 'Rechnung nicht gefunden.');
    return fileResponse(await getFile(ctx, inv.file_id), q.download === '1');
  }

  /* ---------- Support ---------- */
  if (path === '/tickets' && method === 'GET') {
    const rows = await DB.all(db, `SELECT t.id, t.subject, t.category, t.status, t.priority, t.created_at, t.updated_at, t.kind, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.internal = 0) AS messages FROM tickets t WHERE (t.requester_type = 'partner' AND t.requester_id = ?) ${p.role === 'gf' ? 'OR t.org_id = ?' : ''} ORDER BY t.id DESC LIMIT 200`, p.id, ...(p.role === 'gf' ? [p.orgId] : []));
    return out({ ok: true, tickets: rows });
  }
  if (path === '/tickets' && method === 'POST') {
    need(str(body.subject, 200) && str(body.text, 8000), 400, 'Bitte Betreff und Nachricht angeben.');
    const id = await createTicket(ctx, { tag: 'Partner', category: str(body.category, 60) || 'Allgemein', subject: str(body.subject, 200), priority: p.role === 'gf' ? 'hoch' : 'normal', requester: { type: 'partner', id: p.id, name: p.name, email: p.email }, orgId: p.orgId, requestId: body.request_number ? fromNumber(body.request_number) : null, text: str(body.text, 8000) });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/tickets\/(\d+)(?:\/reply)?$/))) {
    const tk = await DB.one(db, 'SELECT * FROM tickets WHERE id = ?', +m[1]);
    need(tk && ((tk.requester_type === 'partner' && tk.requester_id === p.id) || (p.role === 'gf' && tk.org_id === p.orgId)), 404, 'Ticket nicht gefunden.');
    if (method === 'GET') return out({ ok: true, ticket: { id: tk.id, subject: tk.subject, status: tk.status, priority: tk.priority, category: tk.category, created_at: tk.created_at }, messages: await DB.all(db, "SELECT id, author_type, author_name, text, created_at FROM ticket_messages WHERE ticket_id = ? AND internal = 0 AND author_type != 'system' ORDER BY id", tk.id) });
    if (method === 'POST') { await ticketReply(ctx, tk.id, { authorType: 'requester', authorId: p.id, authorName: p.name, text: str(body.text, 8000) }); return out({ ok: true }); }
  }
  return fail(404, 'Nicht gefunden.');
}
