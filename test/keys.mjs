// Schlüsselwechsel: APP_SECRET nachträglich setzen – Backup-Passwort neu verschlüsselt, alte E-Mail-Links bleiben gültig
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check, cron } from './harness.mjs';
import { createHmac } from 'node:crypto';
installFetch();
setNow('2026-11-08T10:00:00Z');
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', AREA_PASSWORD: 'Bereich-Test-2026' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
await c.post('/api/area/unlock', { password: 'Bereich-Test-2026' }, { who: 'admin' });
console.log('Ohne APP_SECRET');
let r = await c.post('/api/backups/password', { password: 'BackupPasswort2026!' }, { who: 'admin' });
check(r.ok, 'Backup-Passwort gesetzt (mit FORM_SECRET verschlüsselt)', r);
const sealedOld = q1("SELECT value FROM settings WHERE key = '_backup_pw'").value;
await cron(worker, env); check(!q1("SELECT value FROM settings WHERE key = '_key_fp'"), 'Ohne APP_SECRET keine Umstellung');
sq.prepare("INSERT INTO requests (type, status, customer_name, email, data, feedback_state, created_at, updated_at) VALUES ('deal', 'kontaktdaten_versendet', 'Kim', 'kim@test.de', '{}', 'gefragt', '2026-11-01T10:00:00Z', '2026-11-01T10:00:00Z')").run();
const oldTok = createHmac('sha256', SECRET).update('fb|1').digest('hex').slice(0, 40);
console.log('APP_SECRET gesetzt');
env.APP_SECRET = 'neuer-zufaelliger-app-schluessel-0123456789abcdef';
await cron(worker, env);
const sealedNew = q1("SELECT value FROM settings WHERE key = '_backup_pw'").value;
check(sealedNew !== sealedOld && q1("SELECT value FROM settings WHERE key = '_key_fp'"), 'Backup-Passwort automatisch mit dem neuen Schlüssel verschlüsselt');
const a = q1("SELECT detail FROM audit WHERE action = 'schluessel_umgestellt'"); check(a && /"neu_verschluesselt":\["_backup_pw"\]/.test(a.detail), 'Umstellung im Protokoll', a);
await cron(worker, env); check(q1("SELECT value FROM settings WHERE key = '_backup_pw'").value === sealedNew && sq.prepare("SELECT COUNT(*) AS n FROM audit WHERE action = 'schluessel_umgestellt'").get().n === 1, 'Nur einmal umgestellt');
// Backup funktioniert weiter (Passwort lesbar)
r = await c.post('/api/backups', {}, { who: 'admin' }); check(r.ok && r.id, 'Backup mit dem gespeicherten Passwort erstellt', r);
// Ohne alten Schlüssel wäre das Passwort jetzt nur noch mit APP_SECRET lesbar
const saved = env.FORM_SECRET; env.FORM_SECRET = 'anderer-schluessel';
r = await c.post('/api/backups', {}, { who: 'admin' }); check(r.ok && r.id, 'Passwort ist mit APP_SECRET allein lesbar');
env.FORM_SECRET = saved;
console.log('Links aus älteren E-Mails');
let res = await worker.fetch(new Request(`https://w.test/c/feedback?r=1001&t=${oldTok}&a=ja`), env);
check(!/Link ungültig/.test(await res.text()), 'Link mit altem Schlüssel bleibt gültig');
res = await worker.fetch(new Request(`https://w.test/c/feedback?r=1001&t=${'0'.repeat(40)}&a=ja`), env);
check(/Link ungültig/.test(await res.text()), 'Gefälschter Link weiterhin abgelehnt');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nSCHLÜSSEL-TEST BESTANDEN');
