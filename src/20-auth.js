/* ============================================================
   Anmeldung: Mitarbeiter (Cookie kfl_s) und Geschäftspartner (Cookie kfl_p)
   Passwörter PBKDF2, Sperre nach 5 Fehlversuchen, Sitzungen 12 h,
   geschützte Bereiche (Protokoll, Backup) mit Zusatzpasswort.
   ============================================================ */

const SESSION_HOURS = 12;
const INVITE_DAYS = 7;
const AREA_MINUTES = 30;
const STAFF_COOKIE = 'kfl_s';
const PARTNER_COOKIE = 'kfl_p';

function readCookie(request, name) {
  const h = request.headers.get('Cookie') || '';
  for (const part of h.split(';')) { const [k, ...v] = part.trim().split('='); if (k === name) return v.join('='); }
  return null;
}
const cookieHeader = (name, token, maxAge) => `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

async function createSessionRow(db, table, userId) {
  const token = randomHex(32);
  await DB.run(db, `INSERT INTO ${table} (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`, await sha256Hex(token), userId, isoOf(nowMs() + SESSION_HOURS * 3600e3), nowIso());
  return { token, maxAge: SESSION_HOURS * 3600 };
}
async function newInvite() {
  const token = randomHex(32);
  return { token, hash: await sha256Hex(token), expires: isoOf(nowMs() + INVITE_DAYS * 86400e3) };
}

/* ---------- Mitarbeiter ---------- */
function effectivePerms(row) {
  if (row.role_key === 'admin') return new Set(PERM_KEYS);
  const p = new Set([...jparse(row.perms, []), ...jparse(row.extra_perms, [])]);
  for (const x of jparse(row.revoked_perms, [])) p.delete(x);
  return p;
}
async function currentStaff(ctx) {
  if (ctx._staff !== undefined) return ctx._staff;
  ctx._staff = null;
  const token = readCookie(ctx.request, STAFF_COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await DB.one(ctx.db, `SELECT u.*, s.expires_at, s.area_until, s.token_hash, r.perms, r.name AS role_name FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN roles r ON r.key = u.role_key WHERE s.token_hash = ?`, await sha256Hex(token));
  if (!row || !row.active || row.expires_at < nowIso() || (row.locked_until && row.locked_until > nowIso() && row.locked_until > '9000')) return null;
  const today = berlinDate(nowMs());
  const subs = (await DB.all(ctx.db, "SELECT user_id FROM absences WHERE substitute_id = ? AND status = 'bestaetigt' AND from_date <= ? AND to_date >= ?", row.id, today, today)).map((r) => r.user_id);
  const u = { id: row.id, email: row.email, name: row.name, role: row.role_key, roleLabel: (STAFF_ROLES[row.role_key] || {}).label || row.role_name || row.role_key,
    rank: (STAFF_ROLES[row.role_key] || { rank: 0 }).rank, perms: effectivePerms(row), extra: jparse(row.extra_perms, []), revoked: jparse(row.revoked_perms, []),
    mustChangePw: !!row.must_change_pw, areaUntil: row.area_until, tokenHash: row.token_hash, subs, prevLogin: row.prev_login };
  ctx._staff = u;
  ctx.actor = { type: 'staff', id: u.id, name: u.name };
  return u;
}
const can = (u, perm) => !!u && u.perms.has(perm);
function requirePerm(u, perm) { need(u, 401, 'Bitte melde dich an.'); need(can(u, perm), 403, 'Dafür fehlt dir die Berechtigung.'); }
const areaUnlocked = (u) => !!u && !!u.areaUntil && u.areaUntil > nowIso();
function requireArea(u, perm) { requirePerm(u, perm); need(areaUnlocked(u), 423, 'Dieser Bereich ist zusätzlich geschützt. Bitte gib das Bereichspasswort ein.'); }

// Bereichspasswort (Protokoll/Backup). Standard laut Vorgabe, als Hash gespeichert, vom Admin änderbar.
// Startwert laut Vorgabe – nur als PBKDF2-Hash hinterlegt
const DEFAULT_AREA_HASH = { salt: 'kfl-area-2026-10', hash: 'ee1cf79402a417ca96f3f99861cefb748e01c56be773ee20dd7b89489dc44a3e' };
async function areaPasswordOk(ctx, password) {
  const raw = await rawSetting(ctx.db, '_area_pw');
  if (raw) { const o = jparse(raw, {}); return verifyPassword(password, o.hash, o.salt); }
  if (ctx.env.AREA_PASSWORD) return safeEqual(String(password || ''), String(ctx.env.AREA_PASSWORD));
  return verifyPassword(password, DEFAULT_AREA_HASH.hash, DEFAULT_AREA_HASH.salt);
}
// Freigabepasswort für die Angebotsauswahl (Startwert laut Vorgabe, nur als Hash hinterlegt)
async function scoringPasswordOk(ctx, password) {
  if (!password) return false;
  const raw = await rawSetting(ctx.db, '_scoring_pw');
  if (raw) { const o = jparse(raw, {}); return verifyPassword(password, o.hash, o.salt); }
  if (ctx.env.SCORING_PASSWORD) return safeEqual(String(password), String(ctx.env.SCORING_PASSWORD));
  return verifyPassword(password, DEFAULT_AREA_HASH.hash, DEFAULT_AREA_HASH.salt);
}
async function setAreaPassword(ctx, password) { const h = await hashPassword(password); await setRawSetting(ctx.db, '_area_pw', JSON.stringify(h)); }

async function loginGeneric(ctx, table, sessTable, email, password) {
  const u = await DB.one(ctx.db, `SELECT * FROM ${table} WHERE email = ?`, email);
  const generic = 'E-Mail oder Passwort ist falsch.';
  if (!u || !u.active || !u.pass_hash) { await hashPassword(password || 'x', 'timing-protect'); return { error: generic, status: 401 }; }
  if (table === 'partner_users') { const org = await DB.one(ctx.db, 'SELECT active, deleted FROM orgs WHERE id = ?', u.org_id); if (!org || !org.active || org.deleted) return { error: 'Dieses Partnerkonto ist derzeit nicht aktiv. Bitte wende dich an den KFL-Support.', status: 403 }; }
  if (u.locked_until && u.locked_until > nowIso()) return { error: u.locked_until > '9000' ? 'Dieses Konto ist gesperrt. Bitte wende dich an die Administration.' : 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.', status: 429 };
  if (!(await verifyPassword(password, u.pass_hash, u.pass_salt))) {
    const f = (u.failed_logins || 0) + 1, lock = f >= 5 ? isoOf(nowMs() + 15 * 60e3) : null;
    await DB.run(ctx.db, `UPDATE ${table} SET failed_logins = ?, locked_until = COALESCE(?, locked_until) WHERE id = ?`, lock ? 0 : f, lock, u.id);
    ctx.actor = { type: table === 'users' ? 'staff' : 'partner', id: u.id, name: u.name };
    await audit(ctx, lock ? 'login_gesperrt' : 'login_fehlgeschlagen', table === 'users' ? 'mitarbeiter' : 'partner', u.id, email);
    return { error: generic, status: 401 };
  }
  await DB.run(ctx.db, `UPDATE ${table} SET failed_logins = 0, locked_until = CASE WHEN locked_until > '9000' THEN locked_until ELSE NULL END, prev_login = last_login, last_login = ? WHERE id = ?`, nowIso(), u.id);
  const s = await createSessionRow(ctx.db, sessTable, u.id);
  ctx.actor = { type: table === 'users' ? 'staff' : 'partner', id: u.id, name: u.name };
  await audit(ctx, 'login', table === 'users' ? 'mitarbeiter' : 'partner', u.id, null);
  return { session: s, user: u };
}

/* ---------- Geschäftspartner ---------- */
async function currentPartner(ctx) {
  if (ctx._partner !== undefined) return ctx._partner;
  ctx._partner = null;
  const token = readCookie(ctx.request, PARTNER_COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await DB.one(ctx.db, `SELECT u.*, s.expires_at FROM partner_sessions s JOIN partner_users u ON u.id = s.user_id WHERE s.token_hash = ?`, await sha256Hex(token));
  if (!row || !row.active || row.expires_at < nowIso() || (row.locked_until && row.locked_until > '9000')) return null;
  const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', row.org_id);
  if (!org || !org.active || org.deleted) return null;
  const p = { id: row.id, orgId: row.org_id, email: row.email, name: row.name, role: row.role, rank: (PARTNER_ROLES[row.role] || { rank: 1 }).rank,
    roleLabel: (PARTNER_ROLES[row.role] || {}).label || row.role, phone: row.phone, mustChangePw: !!row.must_change_pw,
    consentsOk: !!(row.agb_at && row.privacy_at), prevLogin: row.prev_login, lastLogin: row.last_login, org };
  ctx._partner = p;
  ctx.actor = { type: 'partner', id: p.id, name: `${p.name} (${org.name})` };
  return p;
}
function requirePartner(p, minRole) {
  need(p, 401, 'Bitte melde dich an.');
  if (minRole) need(p.rank >= PARTNER_ROLES[minRole].rank, 403, 'Diese Funktion steht deiner Rolle nicht zur Verfügung.');
}

/* ---------- Kunden-Token (Shopify-Konto, signiert vom Theme) ---------- */
async function verifyCustomerToken(env, b, scope = 'my', maxAgeSec = 12 * 3600) {
  const kid = String(b._kid || ''), ts = parseInt(b._ts || '0', 10);
  if (!/^[0-9]{3,20}$/.test(kid)) return { error: 'Bitte zuerst anmelden', status: 401 };
  const expected = await hmacHex(env.FORM_SECRET, `${kid}.${ts}.${scope}`);
  if (typeof b._sig !== 'string' || !safeEqual(b._sig, expected)) return { error: 'Signatur ungültig', status: 403 };
  if (!ts || Math.abs(nowMs() / 1000 - ts) > maxAgeSec) return { error: 'Sitzung abgelaufen, bitte Seite neu laden', status: 403 };
  return { kid };
}
// signierte Links in E-Mails (Rückfrage ja/nein, Umfrage)
async function linkToken(env, ...parts) { return (await hmacHex(serverKey(env), parts.join('|'))).slice(0, 40); }
