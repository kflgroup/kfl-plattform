// Zwei-Faktor-Anmeldung (TOTP) für das interne Dashboard
import { createHmac } from 'node:crypto';
import { makeD1, makeR2, installFetch, SECRET, setNow, advance, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-10T08:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo', APP_SECRET: 'app-secret-test-1234567890' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32dec = (s) => { let bits = 0, val = 0; const out = []; for (const ch of s.replace(/\s/g, '')) { val = ((val << 5) | B32.indexOf(ch)) & 0xffffff; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const totp = (secret, offset = 0) => { const step = Math.floor(globalThis.__KFL_NOW / 30000) + offset; const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step)); const h = createHmac('sha1', b32dec(secret)).update(msg).digest(); const o = h[19] & 15; return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0'); };

console.log('Zwei-Faktor-Anmeldung');
// RFC-6238-Testvektor (SHA-1, Zeit 59 s → 94287082 → 6 Stellen 287082)
setNow(59000); check(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ') === '287082', 'Test-Rechner stimmt mit RFC 6238 überein');
setNow('2026-11-10T08:00:00Z');
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
let r = await c.get('/api/2fa', { who: 'admin' }); check(r.ok && r.enabled === false, 'Anfangs aus');
const s = await c.post('/api/2fa/setup', {}, { who: 'admin' });
check(s.ok && /^otpauth:\/\/totp\/KFL:admin%40kfl\.de\?secret=[A-Z2-7]{32}&issuer=KFL/.test(s.uri) && s.secret.replace(/\s/g, '').length === 32, 'Schlüssel und Link für die Authenticator-App', s);
const secret = s.secret.replace(/\s/g, '');
check(!q1('SELECT totp_pending FROM users WHERE id = 1').totp_pending.includes(secret), 'Schlüssel verschlüsselt gespeichert');
r = await c.post('/api/2fa/enable', { code: '000000' }, { who: 'admin' }); check(r.status === 400, 'Falscher Code wird abgelehnt');
r = await c.post('/api/2fa/enable', { code: totp(secret) }, { who: 'admin' }); check(r.ok && q1('SELECT totp_on FROM users WHERE id = 1').totp_on === 1, 'Mit richtigem Code aktiviert');
r = await c.get('/api/users', { who: 'admin' }); check(r.users[0].totp_on === 1 && !JSON.stringify(r).includes('totp_secret'), 'Mitarbeiterliste zeigt 2FA, aber keinen Schlüssel');

r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!' }, { who: 'neu' });
check(r.status === 401 && r.need2fa === true, 'Passwort allein reicht nicht mehr', r);
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'Falsch123!x', code: totp(secret) }, { who: 'neu' });
check(r.status === 401 && !r.need2fa, 'Falsches Passwort mit gültigem Code: normale Fehlermeldung');
advance(1 / 60);
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!', code: '123456' }, { who: 'neu' });
check(r.status === 401 && r.need2fa && /Code ist falsch/.test(r.error), 'Falscher Code: abgelehnt und gezählt');
const code = totp(secret);
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!', code }, { who: 'neu' });
check(r.ok, 'Passwort und Code: angemeldet');
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!', code }, { who: 'neu2' });
check(r.status === 401, 'Derselbe Code ist nicht ein zweites Mal gültig');
for (let i = 0; i < 4; i++) await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!', code: '000000' }, { who: 'x' + i });
check(q1('SELECT locked_until FROM users WHERE id = 1').locked_until, 'Nach 5 falschen Codes vorübergehend gesperrt (Schutz vor Durchprobieren)');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'login_code_falsch'").n >= 1 && q1("SELECT COUNT(*) AS n FROM audit WHERE action = '2fa_aktiviert'").n === 1, 'Protokoll');

advance(0.5);
r = await c.post('/api/2fa/disable', { password: 'AdminPass123!', code: '000000' }, { who: 'admin' }); check(r.status === 400, 'Ausschalten nur mit gültigem Code');
r = await c.post('/api/2fa/disable', { password: 'AdminPass123!', code: totp(secret) }, { who: 'admin' }); check(r.ok && q1('SELECT totp_on FROM users WHERE id = 1').totp_on === 0, 'Mit Passwort und Code ausgeschaltet');
console.log('fertig');
