/* ============================================================
   Dienste: Einstellungen, Protokoll, E-Mail, Geodaten, Dateien, Benachrichtigungen
   ============================================================ */

/* ---------- Einstellungen ---------- */
async function loadSettings(db) {
  const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const r of await DB.all(db, 'SELECT key, value FROM settings')) {
    if (r.key.startsWith('_')) { s[r.key] = r.value; continue; }
    s[r.key] = jparse(r.value, r.value);
  }
  return s;
}
async function settingsOf(ctx) { if (!ctx._settings) ctx._settings = await loadSettings(ctx.db); return ctx._settings; }
async function saveSettings(ctx, obj) {
  for (const [k, v] of Object.entries(obj)) {
    await DB.run(ctx.db, 'INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)', k, JSON.stringify(v), nowIso(), ctx.actor ? ctx.actor.name : 'system');
  }
  ctx._settings = null;
}
// Link ins Partner-Dashboard (eingestellte Startseite, sonst Adresse dieses Systems)
function partnerUrl(ctx, s, hash = '') { const base = String(s.link_partner || ((ctx.origin || '') + '/partner')).replace(/\/$/, ''); return /^https?:\/\//.test(base) ? base + hash : ''; }
async function rawSetting(db, key) { const r = await DB.one(db, 'SELECT value FROM settings WHERE key = ?', key); return r ? r.value : null; }
async function setRawSetting(db, key, value) { await DB.run(db, 'INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)', key, value, nowIso(), 'system'); }

/* ---------- Protokoll (wer, was, wann) ---------- */
async function audit(ctx, action, entity, entityId, detail) {
  try {
    const a = ctx.actor || { type: 'system', id: null, name: 'System' };
    const d = detail === undefined || detail === null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail));
    await DB.run(ctx.db, 'INSERT INTO audit (at, actor_type, actor_id, actor_name, action, entity, entity_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      nowIso(), a.type, a.id ?? null, a.name || null, action, entity || null, entityId === undefined || entityId === null ? null : String(entityId), d ? d.slice(0, 4000) : null, ctx.ipHash || null);
  } catch (e) { console.log('Protokoll-Fehler', e.message); }
}
async function reqEvent(ctx, requestId, action, detail) {
  const a = ctx.actor || { type: 'system' };
  const who = a.type === 'staff' ? null : a.type === 'system' ? 'System' : a.type === 'customer' ? 'Kunde' : (a.name || 'Partner');
  const text = [who ? `[${who}]` : null, detail ? String(detail).slice(0, 1000) : null].filter(Boolean).join(' ') || null;
  await DB.run(ctx.db, 'INSERT INTO events (request_id, user_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?)', requestId, a.type === 'staff' ? a.id : null, action, text, nowIso());
}
async function partnerEvent(ctx, { assignmentId, requestId, orgId, action, text, confidential = false, visiblePartner = false }) {
  const a = ctx.actor || { type: 'system', name: 'System' };
  await DB.insert(ctx.db, 'partner_events', { assignment_id: assignmentId || null, request_id: requestId || null, org_id: orgId || null, actor_type: a.type, actor_id: a.id ?? null,
    actor_name: a.name || null, action, text: text || null, confidential: confidential ? 1 : 0, visible_partner: visiblePartner ? 1 : 0, created_at: nowIso() });
}

/* ---------- E-Mail (Brevo) mit Absender je Kategorie ---------- */
function mailWrap(s, title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;padding:24px 0">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;font:16px/1.55 Helvetica,Arial,sans-serif;color:#1a1a1a">
<div style="background:#000;padding:22px 28px"><span style="display:inline-block;background:#ff6c01;color:#fff;font:italic 700 20px Helvetica,Arial;padding:8px 10px;border-radius:4px">KFL</span></div>
<div style="padding:28px"><h1 style="font-size:23px;line-height:1.25;margin:0 0 16px">${esc(title)}</h1>${body}</div>
<div style="padding:18px 28px;background:#f4f4f4;color:#6b6b70;font-size:12.5px;line-height:1.5">${esc(s.company_name)} · ${esc(s.company_street)} · ${esc(s.company_zip)} ${esc(s.company_city)} · ${esc(s.company_email)}</div>
</div></body></html>`;
}
const mailBtn = (href, label) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#ff6c01;color:#000;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none">${esc(label)}</a></p>`;
const mailTable = (rows) => `<table style="border-collapse:collapse;width:100%;font:14.5px/1.5 Helvetica,Arial,sans-serif">${rows.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '').map(([k, v]) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #eee;color:#6b6b70;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:7px 10px;border-bottom:1px solid #eee">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;

async function sendMail(ctx, { category = 'system', to, toName, subject, title, html, body, replyTo, attachments }) {
  const s = await settingsOf(ctx);
  const from = s[(MAIL_CATEGORIES[category] || MAIL_CATEGORIES.system).setting] || s.mail_from_system;
  const content = html || mailWrap(s, title || subject, body || '');
  const recipient = Array.isArray(to) ? to.join(', ') : to;
  if (!recipient || !emailOk(String(recipient).split(',')[0].trim())) return { ok: false, error: 'Keine gültige Empfängeradresse' };
  let status = 'nicht_konfiguriert', error = null, reply = null;
  const list = (Array.isArray(to) ? to : String(to).split(',')).map((x) => String(x).trim()).filter(Boolean);
  const menv = await mailEnv(ctx);
  if (smtpConfigured(menv)) {
    try {
      reply = await smtpSendMail(menv, { from, fromName: s.mail_sender_name, to: list, toName, subject, html: content, replyTo, attachments: (attachments || []).map((a) => ({ name: a.name, base64: a.base64, type: a.type })) });
      status = 'gesendet';
    } catch (e) { status = 'fehler'; error = String(e.message || e).slice(0, 500); }
  } else if (ctx.env.BREVO_API_KEY) {
    try {
      const payload = { sender: { name: s.mail_sender_name, email: from }, to: (Array.isArray(to) ? to : [to]).map((e) => ({ email: e, name: toName || undefined })),
        subject, htmlContent: content };
      if (replyTo) payload.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;
      if (attachments && attachments.length) payload.attachment = attachments.map((a) => ({ name: a.name, content: a.base64 }));
      const res = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': ctx.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { status = 'fehler'; error = 'Brevo ' + res.status + ': ' + (await res.text()).slice(0, 300); } else status = 'gesendet';
    } catch (e) { status = 'fehler'; error = e.message; }
  }
  // Antwort des Mailservers (z. B. „250 … queued as …“) als Zustellnachweis speichern
  await DB.insert(ctx.db, 'mail_outbox', { category, sender: from, recipient, subject, html: content.slice(0, 60000), status, error, server_reply: reply ? String(reply).slice(0, 300) : null, created_at: nowIso() });
  if (status === 'fehler') console.log('Mail-Fehler', error);
  return { ok: status === 'gesendet', status, error };
}

/* ---------- Geodaten (PLZ → Koordinaten) ---------- */
// Grobe Mittelpunkte der Postleitregionen (Fallback, falls kein exakter Wert vorliegt)
const PLZ_REGIONS = {
  '01': [51.05, 13.74], '02': [51.18, 14.42], '03': [51.76, 14.33], '04': [51.34, 12.37], '06': [51.48, 11.97], '07': [50.88, 11.99], '08': [50.62, 12.38], '09': [50.83, 12.92],
  '10': [52.52, 13.40], '12': [52.45, 13.45], '13': [52.57, 13.33], '14': [52.39, 13.06], '15': [52.35, 14.30], '16': [52.83, 13.65], '17': [53.56, 13.26], '18': [54.09, 12.13], '19': [53.63, 11.41],
  '20': [53.55, 10.00], '21': [53.40, 10.15], '22': [53.60, 10.05], '23': [53.87, 10.69], '24': [54.32, 10.13], '25': [54.10, 9.40], '26': [53.20, 7.90], '27': [53.40, 8.80], '28': [53.08, 8.80], '29': [52.80, 10.40],
  '30': [52.37, 9.73], '31': [52.10, 9.60], '32': [52.15, 8.70], '33': [51.90, 8.55], '34': [51.31, 9.48], '35': [50.62, 8.70], '36': [50.55, 9.68], '37': [51.53, 9.93], '38': [52.27, 10.52], '39': [52.13, 11.62],
  '40': [51.23, 6.78], '41': [51.18, 6.50], '42': [51.26, 7.15], '44': [51.51, 7.47], '45': [51.45, 7.01], '46': [51.60, 6.85], '47': [51.40, 6.65], '48': [52.00, 7.60], '49': [52.40, 7.90],
  '50': [50.94, 6.96], '51': [50.98, 7.15], '52': [50.78, 6.08], '53': [50.73, 7.10], '54': [49.75, 6.64], '55': [49.90, 7.95], '56': [50.36, 7.59], '57': [50.87, 8.02], '58': [51.36, 7.47], '59': [51.55, 7.95],
  '60': [50.11, 8.68], '61': [50.25, 8.65], '63': [50.05, 9.00], '64': [49.87, 8.65], '65': [50.08, 8.24], '66': [49.24, 6.99], '67': [49.45, 7.90], '68': [49.49, 8.47], '69': [49.40, 8.69],
  '70': [48.78, 9.18], '71': [48.75, 9.10], '72': [48.50, 9.05], '73': [48.70, 9.60], '74': [49.14, 9.22], '75': [48.89, 8.70], '76': [49.01, 8.40], '77': [48.47, 7.94], '78': [47.95, 8.70], '79': [47.99, 7.85],
  '80': [48.14, 11.58], '81': [48.12, 11.62], '82': [47.80, 11.20], '83': [47.85, 12.12], '84': [48.54, 12.15], '85': [48.60, 11.60], '86': [48.37, 10.90], '87': [47.73, 10.31], '88': [47.78, 9.61], '89': [48.40, 9.99],
  '90': [49.45, 11.08], '91': [49.40, 10.80], '92': [49.50, 12.00], '93': [49.02, 12.10], '94': [48.57, 13.43], '95': [50.00, 11.70], '96': [50.00, 10.95], '97': [49.79, 9.95], '98': [50.60, 10.70], '99': [50.98, 11.03]
};
async function geocodePlz(ctx, plz) {
  plz = String(plz || '').trim();
  if (!plzOk(plz)) return null;
  const c = await DB.one(ctx.db, 'SELECT lat, lon, city, source FROM geo_cache WHERE zip = ?', plz);
  if (c && c.source !== 'region') return c;
  if (!ctx.noNetworkGeo) {
    try {
      const res = await fetch('https://api.zippopotam.us/de/' + plz, { headers: { accept: 'application/json' } });
      if (res.ok) {
        const j = await res.json(); const p = j.places && j.places[0];
        if (p) {
          const row = { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude), city: p['place name'] || '', source: 'zippopotam' };
          await DB.run(ctx.db, 'INSERT OR REPLACE INTO geo_cache (zip, lat, lon, city, source, created_at) VALUES (?, ?, ?, ?, ?, ?)', plz, row.lat, row.lon, row.city, row.source, nowIso());
          return row;
        }
      }
    } catch (e) { console.log('Geodaten nicht erreichbar', e.message); }
  }
  if (c) return c;
  const r = PLZ_REGIONS[plz.slice(0, 2)];
  if (!r) return null;
  const row = { lat: r[0], lon: r[1], city: '', source: 'region' };
  await DB.run(ctx.db, 'INSERT OR REPLACE INTO geo_cache (zip, lat, lon, city, source, created_at) VALUES (?, ?, ?, ?, ?, ?)', plz, row.lat, row.lon, '', 'region', nowIso());
  return row;
}
function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/* ---------- Dateien (R2-Bucket FILES, sonst Datenbank) ---------- */
const CHUNK = 700000;
async function putFile(ctx, { name, mime, bytes, ownerType, ownerId }) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const storage = ctx.env.FILES ? 'r2' : 'd1';
  const id = await DB.insert(ctx.db, 'files', { name: str(name, 200) || 'datei', mime: mime || 'application/octet-stream', size: u8.length, storage, key: null, owner_type: ownerType || null, owner_id: ownerId || null, created_at: nowIso() });
  if (storage === 'r2') {
    const key = `f/${id}-${randomHex(8)}`;
    await ctx.env.FILES.put(key, u8, { httpMetadata: { contentType: mime } });
    await DB.update(ctx.db, 'files', id, { key });
  } else {
    const s = b64(u8);
    for (let i = 0, n = 0; i < s.length || n === 0; i += CHUNK, n++) await DB.run(ctx.db, 'INSERT INTO file_chunks (file_id, idx, data) VALUES (?, ?, ?)', id, n, s.slice(i, i + CHUNK));
  }
  return id;
}
async function getFile(ctx, id) {
  const meta = await DB.one(ctx.db, 'SELECT * FROM files WHERE id = ?', id);
  if (!meta) return null;
  let bytes;
  if (meta.storage === 'r2') { const o = await ctx.env.FILES.get(meta.key); if (!o) return null; bytes = new Uint8Array(await o.arrayBuffer()); }
  else bytes = unb64((await DB.all(ctx.db, 'SELECT data FROM file_chunks WHERE file_id = ? ORDER BY idx', id)).map((r) => r.data).join(''));
  return { meta, bytes };
}
async function deleteFile(ctx, id) {
  const meta = await DB.one(ctx.db, 'SELECT * FROM files WHERE id = ?', id); if (!meta) return;
  if (meta.storage === 'r2' && ctx.env.FILES) await ctx.env.FILES.delete(meta.key);
  await DB.run(ctx.db, 'DELETE FROM file_chunks WHERE file_id = ?', id);
  await DB.run(ctx.db, 'DELETE FROM files WHERE id = ?', id);
}
function fileResponse(f, download = false) {
  return new Response(f.bytes, { headers: { 'Content-Type': f.meta.mime || 'application/octet-stream', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${String(f.meta.name || 'datei').replace(/[^\w.\- ]+/g, '_')}"`, 'Cache-Control': 'private, no-store', ...SEC_HEADERS } });
}

/* ---------- Benachrichtigungen (News-Feed je Nutzer) ---------- */
async function notify(ctx, recipientType, recipientId, { kind, title, body, link }) {
  await DB.insert(ctx.db, 'notifications', { recipient_type: recipientType, recipient_id: recipientId, kind: kind || 'info', title: str(title, 200), body: body ? String(body).slice(0, 2000) : null, link: link || null, read_at: null, created_at: nowIso() });
}
// an alle aktiven Mitarbeiter mit einem bestimmten Recht (oder bestimmte Nutzer)
async function notifyStaff(ctx, { perm, roles, userIds, except }, msg) {
  let ids = [];
  if (userIds) ids = userIds;
  else {
    const users = await DB.all(ctx.db, 'SELECT u.id, u.role_key, u.extra_perms, u.revoked_perms, r.perms FROM users u LEFT JOIN roles r ON r.key = u.role_key WHERE u.active = 1');
    ids = users.filter((u) => {
      if (roles && !roles.includes(u.role_key)) return false;
      if (!perm) return true;
      const p = new Set([...jparse(u.perms, []), ...jparse(u.extra_perms, [])]); for (const x of jparse(u.revoked_perms, [])) p.delete(x);
      return p.has(perm);
    }).map((u) => u.id);
  }
  for (const id of uniq(ids)) if (id && id !== except) await notify(ctx, 'staff', id, msg);
  return ids.length;
}
async function notifyPartner(ctx, { orgId, userIds, roles }, msg) {
  let ids = userIds || (await DB.all(ctx.db, `SELECT id, role FROM partner_users WHERE org_id = ? AND active = 1`, orgId)).filter((u) => !roles || roles.includes(u.role)).map((u) => u.id);
  for (const id of uniq(ids)) await notify(ctx, 'partner', id, msg);
  return ids.length;
}
