/* ============================================================
   Support: Tickets (Webseite / Intern / Partner / Kunde), Antworten,
   Eskalation nach 24 h, Archiv, Änderungsanträge, System-Fehlerliste
   ============================================================ */

async function createTicket(ctx, { tag, kind = 'ticket', category, subject, priority = 'normal', requester, orgId = null, requestId = null, text, payload = null, ack = true, notifyAdmin = false }) {
  const s = await settingsOf(ctx);
  const t = nowIso();
  const id = await DB.insert(ctx.db, 'tickets', { tag, kind, category: category || null, subject: str(subject, 200) || 'Support-Anfrage', priority, status: 'neu',
    requester_type: requester.type, requester_id: requester.id || null, requester_name: str(requester.name, 120), requester_email: str(requester.email, 200).toLowerCase(),
    org_id: orgId, request_id: requestId, payload: payload ? JSON.stringify(payload) : null, created_at: t, updated_at: t });
  await DB.insert(ctx.db, 'ticket_messages', { ticket_id: id, author_type: 'requester', author_id: requester.id || null, author_name: str(requester.name, 120), text: String(text || '').slice(0, 8000), internal: 0, created_at: t });
  await audit(ctx, 'support_ticket', 'ticket', id, { tag, kind, priority });
  await notifyStaff(ctx, notifyAdmin ? { roles: ['admin'] } : { perm: 'support_manage' }, { kind: 'support', title: `Support #${id} · ${tag}${priority !== 'normal' ? ' · ' + statusLabel(TICKET_PRIORITIES, priority) : ''}`, body: subject, link: `#/support/${id}` });
  if (ack && emailOk(requester.email)) {
    await sendMail(ctx, { category: 'system', to: requester.email, toName: requester.name, subject: `${s.support_ack_subject} (Ticket #${id})`, title: s.support_ack_subject,
      body: `<p>Hallo ${esc(requester.name || '')},</p><p>${esc(s.support_ack_text).replace(/\n/g, '<br>')}</p>${mailTable([['Ticketnummer', '#' + id], ['Betreff', subject], ['Eingang', fmtDE(t)]])}<p>Viele Grüße<br>Dein Support-Team der ${esc(s.company_name)}</p>` });
  }
  return id;
}

async function ticketReply(ctx, ticketId, { authorType, authorId, authorName, text, internal = false }) {
  const s = await settingsOf(ctx);
  const tk = await DB.one(ctx.db, 'SELECT * FROM tickets WHERE id = ?', ticketId);
  need(tk, 404, 'Ticket nicht gefunden.');
  need(str(text, 8000).length >= 1, 400, 'Bitte gib eine Nachricht ein.');
  const t = nowIso();
  await DB.insert(ctx.db, 'ticket_messages', { ticket_id: ticketId, author_type: authorType, author_id: authorId || null, author_name: authorName || '', text: String(text).slice(0, 8000), internal: internal ? 1 : 0, created_at: t });
  const upd = { updated_at: t };
  if (authorType === 'staff' && !internal && tk.status === 'neu') upd.status = 'in_bearbeitung';
  if (authorType !== 'staff' && tk.status === 'wartet') upd.status = 'in_bearbeitung';
  if (authorType !== 'staff' && tk.status === 'erledigt') upd.status = 'in_bearbeitung';
  await DB.update(ctx.db, 'tickets', ticketId, upd);
  if (authorType === 'staff' && !internal) {
    // Antwort an den Absender: News (Mitarbeiter/Partner) + E-Mail
    if (tk.requester_type === 'staff' && tk.requester_id) await notify(ctx, 'staff', tk.requester_id, { kind: 'support', title: `Antwort vom Support zu #${ticketId}`, body: String(text).slice(0, 300), link: `#/support/${ticketId}` });
    if (tk.requester_type === 'partner' && tk.requester_id) await notify(ctx, 'partner', tk.requester_id, { kind: 'support', title: `Antwort vom KFL-Support zu #${ticketId}`, body: String(text).slice(0, 300), link: `#/support/${ticketId}` });
    if (emailOk(tk.requester_email)) await sendMail(ctx, { category: 'support', to: tk.requester_email, toName: tk.requester_name, subject: `Re: ${tk.subject} (Ticket #${ticketId})`, title: 'Antwort vom KFL-Support',
      body: `<p>Hallo ${esc(tk.requester_name || '')},</p><p style="white-space:pre-wrap">${esc(text)}</p><p>Viele Grüße<br>Dein Support-Team der ${esc(s.company_name)}</p><p style="color:#6b6b70;font-size:12.5px">Ticket #${ticketId} · ${esc(tk.subject)}</p>` });
  } else if (authorType !== 'staff') {
    await notifyStaff(ctx, tk.assignee_id ? { userIds: [tk.assignee_id] } : { perm: 'support_manage' }, { kind: 'support', title: `Neue Nachricht zu Support #${ticketId}`, body: String(text).slice(0, 200), link: `#/support/${ticketId}` });
  }
  return true;
}

// Änderungsantrag eines Partner-Geschäftsführers (Rollen, Konten löschen) → Support bestätigt
async function applyChangeRequest(ctx, tk, approve, note) {
  const p = jparse(tk.payload, {});
  const t = nowIso();
  if (approve) {
    if (p.action === 'role' && p.user_id && PARTNER_ROLES[p.role]) await DB.run(ctx.db, 'UPDATE partner_users SET role = ? WHERE id = ? AND org_id = ?', p.role, p.user_id, tk.org_id);
    if (p.action === 'delete_user' && p.user_id) await DB.run(ctx.db, "UPDATE partner_users SET active = 0, email = email || '.geloescht-' || id, invite_hash = NULL WHERE id = ? AND org_id = ?", p.user_id, tk.org_id);
    if (p.action === 'add_user' && emailOk(p.email) && PARTNER_ROLES[p.role]) {
      const exists = await DB.one(ctx.db, 'SELECT id FROM partner_users WHERE email = ?', p.email.toLowerCase());
      if (!exists) {
        const inv = await newInvite();
        const uid = await DB.insert(ctx.db, 'partner_users', { org_id: tk.org_id, email: p.email.toLowerCase(), name: str(p.name, 80), role: p.role, phone: str(p.phone, 40), active: 1, invite_hash: inv.hash, invite_expires: inv.expires, created_at: t });
        await sendPartnerInvite(ctx, uid, inv.token);
      }
    }
    await partnerAudit(ctx, tk.org_id, `Änderung bestätigt: ${p.label || p.action}`);
  }
  await DB.update(ctx.db, 'tickets', tk.id, { status: 'erledigt', done_at: t, updated_at: t });
  await DB.insert(ctx.db, 'ticket_messages', { ticket_id: tk.id, author_type: 'staff', author_id: ctx._staff ? ctx._staff.id : null, author_name: ctx._staff ? ctx._staff.name : 'System', text: (approve ? 'Änderung bestätigt und durchgeführt.' : 'Änderung abgelehnt.') + (note ? ' ' + note : ''), internal: 0, created_at: t });
  if (tk.requester_id) {
    await notify(ctx, 'partner', tk.requester_id, { kind: 'support', title: approve ? 'Deine Änderung wurde durchgeführt' : 'Deine Änderung wurde abgelehnt', body: (p.label || '') + (note ? ' – ' + note : ''), link: `#/support/${tk.id}` });
    if (emailOk(tk.requester_email)) await sendMail(ctx, { category: 'support', to: tk.requester_email, toName: tk.requester_name, subject: approve ? `Änderung durchgeführt (Ticket #${tk.id})` : `Änderung abgelehnt (Ticket #${tk.id})`,
      title: approve ? 'Deine Änderung wurde durchgeführt.' : 'Deine Änderung wurde nicht durchgeführt.', body: `<p>Hallo ${esc(tk.requester_name || '')},</p><p>${esc(p.label || 'Deine beantragte Änderung')} wurde ${approve ? 'vom KFL-Support bestätigt und durchgeführt' : 'vom KFL-Support abgelehnt'}.${note ? '<br>' + esc(note) : ''}</p>` });
  }
  await audit(ctx, approve ? 'aenderung_bestaetigt' : 'aenderung_abgelehnt', 'ticket', tk.id, p);
}
async function partnerAudit(ctx, orgId, text) { await DB.insert(ctx.db, 'org_notes', { org_id: orgId, user_id: ctx._staff ? ctx._staff.id : null, text, created_at: nowIso() }); }

async function sendPartnerInvite(ctx, uid, token, { reset = false, tempPassword = null } = {}) {
  const s = await settingsOf(ctx);
  const u = await DB.one(ctx.db, 'SELECT u.*, o.name AS org_name FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE u.id = ?', uid);
  const base = s.link_partner || ((ctx.origin || '') + '/partner');
  const link = token ? `${base.replace(/\/$/, '')}#/einladung/${token}` : base;
  const body = tempPassword
    ? `<p>Hallo ${esc(u.name)},</p><p>dein Passwort für das KFL-Partner-Dashboard wurde zurückgesetzt. Dein vorläufiges Passwort lautet:</p><p style="font:700 20px monospace;background:#f4f4f4;border-radius:10px;padding:12px 16px;display:inline-block">${esc(tempPassword)}</p><p>Bitte melde dich an und vergib sofort ein eigenes Passwort.</p>${mailBtn(base, 'Zum Partner-Dashboard')}`
    : `<p>Hallo ${esc(u.name)},</p><p>${reset ? 'über diesen Link kannst du ein neues Passwort für dein KFL-Partner-Dashboard festlegen' : `willkommen bei KFL! Für <strong>${esc(u.org_name)}</strong> wurde ein Zugang zum KFL-Partner-Dashboard eingerichtet. Lege jetzt dein Passwort fest`} (Link gültig ${INVITE_DAYS} Tage):</p>${mailBtn(link, reset ? 'Neues Passwort festlegen' : 'Passwort festlegen und starten')}<p style="color:#6b6b70;font-size:13px">Wenn du diese E-Mail nicht erwartet hast, ignoriere sie einfach.</p>`;
  return sendMail(ctx, { category: 'system', to: u.email, toName: u.name, subject: tempPassword ? 'Dein vorläufiges Passwort für das KFL-Partner-Dashboard' : reset ? 'Neues Passwort für dein KFL-Partner-Dashboard' : 'Deine Einladung zum KFL-Partner-Dashboard', title: reset || tempPassword ? 'Passwort zurückgesetzt' : 'Willkommen im KFL-Partner-Dashboard', body });
}

async function runSupportJobs(ctx) {
  const s = await settingsOf(ctx);
  const t = nowIso(), res = { escalated: 0, archived: 0, toBackup: 0, sysToBackup: 0 };
  // Eskalation: nach 24 h ohne Bearbeitung → Priorität hoch
  const cut = isoOf(nowMs() - s.support_escalate_hours * 3600e3);
  for (const tk of await DB.all(ctx.db, "SELECT * FROM tickets WHERE status = 'neu' AND priority = 'normal' AND created_at < ? AND archived_at IS NULL", cut)) {
    await DB.update(ctx.db, 'tickets', tk.id, { priority: 'hoch', escalated_at: t, updated_at: t });
    await DB.insert(ctx.db, 'ticket_messages', { ticket_id: tk.id, author_type: 'system', author_name: 'System', text: `Automatisch auf Priorität „Hoch“ gesetzt (seit ${s.support_escalate_hours} Stunden unbearbeitet).`, internal: 1, created_at: t });
    res.escalated++;
  }
  // Erledigte Tickets: nach X Tagen ins Backup-Archiv verschieben
  const arch = isoOf(nowMs() - s.support_archive_days * 86400e3);
  for (const tk of await DB.all(ctx.db, "SELECT * FROM tickets WHERE status = 'erledigt' AND done_at < ? AND archived_at IS NULL", arch)) {
    const msgs = await DB.all(ctx.db, 'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id', tk.id);
    await DB.insert(ctx.db, 'archive', { kind: 'ticket', ref_id: tk.id, title: `#${tk.id} ${tk.subject}`, data: JSON.stringify({ ticket: tk, messages: msgs }), archived_at: t, expires_at: null });
    await DB.update(ctx.db, 'tickets', tk.id, { archived_at: t, updated_at: t });
    res.toBackup++;
  }
  // System-Fehlerliste: erledigte Einträge nach 365 Tagen aus dem Archiv entfernen
  for (const si of await DB.all(ctx.db, "SELECT * FROM sys_issues WHERE status = 'erledigt' AND done_at IS NOT NULL AND id NOT IN (SELECT ref_id FROM archive WHERE kind = 'sysissue')")) {
    await DB.insert(ctx.db, 'archive', { kind: 'sysissue', ref_id: si.id, title: si.title, data: JSON.stringify(si), archived_at: t, expires_at: isoOf(msOf(si.done_at) + s.syslist_retention_days * 86400e3) });
    res.sysToBackup++;
  }
  await DB.run(ctx.db, 'DELETE FROM archive WHERE expires_at IS NOT NULL AND expires_at < ?', t);
  await DB.run(ctx.db, "DELETE FROM sys_issues WHERE status = 'erledigt' AND done_at < ?", isoOf(nowMs() - s.syslist_retention_days * 86400e3));
  return res;
}

/* ---------- News, Chat, Abwesenheit ---------- */
function audienceMatchesStaff(aud, u) {
  if (!aud || aud.type === 'all') return true;
  if (aud.type === 'roles') return (aud.values || []).includes(u.role);
  if (aud.type === 'users') return (aud.values || []).map(Number).includes(u.id);
  return false;
}
function audienceMatchesPartner(aud, p) {
  if (!aud || aud.type === 'partners_all') return true;
  if (aud.type === 'orgs') return (aud.values || []).map(Number).includes(p.orgId);
  if (aud.type === 'partner_users') return (aud.values || []).map(Number).includes(p.id);
  if (aud.type === 'brands') { const ob = jparse(p.org.brands, []).map(normBrand); return ob.includes('*') || (aud.values || []).some((b) => ob.includes(normBrand(b))); }
  if (aud.type === 'partner_roles') return (aud.values || []).includes(p.role);
  return false;
}
async function newsFor(ctx, readerType, reader, { limit = 50 } = {}) {
  const scope = readerType === 'staff' ? 'staff' : 'partner';
  const posts = await DB.all(ctx.db, 'SELECT p.*, r.read_at FROM news_posts p LEFT JOIN news_reads r ON r.post_id = p.id AND r.reader_type = ? AND r.reader_id = ? WHERE p.scope = ? ORDER BY p.id DESC LIMIT 200', readerType, reader.id, scope);
  const match = readerType === 'staff' ? audienceMatchesStaff : audienceMatchesPartner;
  const list = posts.filter((p) => match(jparse(p.audience, {}), reader)).slice(0, limit).map((p) => ({ id: p.id, kind: 'post', title: p.title, body: p.body, author: p.author_name, important: !!p.important, created_at: p.created_at, read: !!p.read_at }));
  const notes = await DB.all(ctx.db, 'SELECT * FROM notifications WHERE recipient_type = ? AND recipient_id = ? ORDER BY id DESC LIMIT ?', readerType, reader.id, limit);
  return { posts: list, notifications: notes.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, created_at: n.created_at, read: !!n.read_at })) };
}

async function chatList(ctx, u) {
  const chats = await DB.all(ctx.db, `SELECT c.*, m.last_read_at, (SELECT COUNT(*) FROM chat_messages x WHERE x.chat_id = c.id AND x.user_id != ? AND (m.last_read_at IS NULL OR x.created_at > m.last_read_at)) AS unread,
    (SELECT text FROM chat_messages x WHERE x.chat_id = c.id ORDER BY x.id DESC LIMIT 1) AS last_text FROM chats c JOIN chat_members m ON m.chat_id = c.id AND m.user_id = ? ORDER BY COALESCE(c.last_at, c.created_at) DESC`, u.id, u.id);
  for (const c of chats) c.members = await DB.all(ctx.db, 'SELECT u.id, u.name, u.role_key FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = ?', c.id);
  return chats;
}
async function chatOpen(ctx, u, { userIds, title }) {
  const ids = uniq((userIds || []).map(Number).filter((x) => x && x !== u.id));
  need(ids.length, 400, 'Bitte wähle mindestens eine Person aus.');
  const users = await DB.all(ctx.db, `SELECT id, role_key, active FROM users WHERE id IN (${inList(ids)})`, ...ids);
  need(users.length === ids.length && users.every((x) => x.active), 400, 'Unbekannte oder gesperrte Person ausgewählt.');
  if (ids.length === 1) {
    const ex = await DB.one(ctx.db, "SELECT c.id FROM chats c WHERE c.kind = 'direct' AND (SELECT COUNT(*) FROM chat_members m WHERE m.chat_id = c.id) = 2 AND EXISTS (SELECT 1 FROM chat_members m WHERE m.chat_id = c.id AND m.user_id = ?) AND EXISTS (SELECT 1 FROM chat_members m WHERE m.chat_id = c.id AND m.user_id = ?)", u.id, ids[0]);
    if (ex) return ex.id;
  } else {
    need(users.every((x) => x.role_key === u.role) || u.role === 'admin' || u.role === 'gf', 403, 'Gruppenchats sind mit Personen der gleichen Rolle möglich.');
  }
  const cid = await DB.insert(ctx.db, 'chats', { kind: ids.length === 1 ? 'direct' : 'group', title: ids.length > 1 ? (str(title, 80) || 'Gruppe') : null, created_by: u.id, created_at: nowIso(), last_at: nowIso() });
  for (const id of [u.id, ...ids]) await DB.run(ctx.db, 'INSERT INTO chat_members (chat_id, user_id, last_read_at) VALUES (?, ?, ?)', cid, id, id === u.id ? nowIso() : null);
  await audit(ctx, 'chat_erstellt', 'chat', cid, { mitglieder: ids.length + 1 });
  return cid;
}
async function chatSend(ctx, u, chatId, text) {
  const m = await DB.one(ctx.db, 'SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ?', chatId, u.id);
  need(m, 403, 'Du bist nicht Mitglied dieses Chats.');
  need(str(text, 4000).length, 400, 'Bitte gib eine Nachricht ein.');
  const t = nowIso();
  await DB.insert(ctx.db, 'chat_messages', { chat_id: chatId, user_id: u.id, text: String(text).slice(0, 4000), created_at: t });
  await DB.run(ctx.db, 'UPDATE chats SET last_at = ? WHERE id = ?', t, chatId);
  await DB.run(ctx.db, 'UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', t, chatId, u.id);
}

async function requestAbsence(ctx, u, { from, to, substituteId, note }) {
  need(/^\d{4}-\d{2}-\d{2}$/.test(from || '') && /^\d{4}-\d{2}-\d{2}$/.test(to || '') && from <= to, 400, 'Bitte gib einen gültigen Zeitraum an.');
  const sub = substituteId ? await DB.one(ctx.db, 'SELECT id, name, role_key, active FROM users WHERE id = ?', substituteId) : null;
  if (substituteId) {
    need(sub && sub.active && sub.id !== u.id, 400, 'Bitte wähle eine aktive Vertretung aus.');
    need(((STAFF_ROLES[sub.role_key] || {}).rank || 0) >= u.rank && (sub.role_key === u.role || STAFF_ROLES[sub.role_key].rank > u.rank), 400, 'Die Vertretung muss die gleiche oder eine höhere Rolle haben.');
  }
  const id = await DB.insert(ctx.db, 'absences', { user_id: u.id, from_date: from, to_date: to, substitute_id: sub ? sub.id : null, status: sub ? 'angefragt' : 'bestaetigt', note: str(note, 300), created_at: nowIso() });
  if (sub) await notify(ctx, 'staff', sub.id, { kind: 'vertretung', title: `${u.name} bittet dich um Vertretung`, body: `${fmtDateDE(from)} – ${fmtDateDE(to)}${note ? ' · ' + note : ''}. Bitte bestätige oder lehne ab.`, link: '#/news/vertretung' });
  await audit(ctx, 'abwesenheit', 'abwesenheit', id, { from, to, vertretung: sub ? sub.name : null });
  return id;
}
