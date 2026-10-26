// Automatische Jobs: abgebrochener Job blockiert nicht dauerhaft, Laufmarke, Herzschlag
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check, cron, ticks } from './harness.mjs';
installFetch();
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123' };
const c = client(worker, env); const q1 = (sql, ...a) => env.DB._sq.prepare(sql).get(...a);
console.log('Automatische Jobs');
setNow('2026-11-01T00:10:00Z'); // 1:10 Uhr Berliner Zeit
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
env.DB._sq.prepare("INSERT OR REPLACE INTO jobs (key, last_run, last_result) VALUES ('backup', '2026-10-31', ?)").run(JSON.stringify('läuft seit 2026-10-31T23:30:00.000Z'));
await cron(worker, env);
const b = q1("SELECT * FROM jobs WHERE key = 'backup'");
check(b.last_run === '2026-11-01' && /abgebrochen/.test(b.last_result), 'Seit 40 Minuten „laufender“ Job wird als abgebrochen markiert', b);
check(q1("SELECT COUNT(*) AS n FROM notifications WHERE title LIKE '%abgebrochen%'").n >= 1, 'Admin bekommt eine Meldung');
check(!!q1("SELECT value FROM settings WHERE key = '_cron_tick'"), 'Herzschlag des Cron-Durchlaufs gespeichert');
await ticks(worker, env, 4);
const f = q1("SELECT * FROM jobs WHERE key = 'fibu'");
check(f && f.last_run === '2026-11-01' && !/läuft/.test(f.last_result), 'Andere Tagesjobs laufen danach normal', f);
env.DB._sq.prepare("UPDATE jobs SET last_run = '2026-10-31', last_result = ? WHERE key = 'mahnung'").run(JSON.stringify('läuft seit 2026-11-01T00:05:00.000Z'));
setNow('2026-11-01T08:00:00Z'); await cron(worker, env);
check(/abgebrochen/.test(q1("SELECT last_result FROM jobs WHERE key = 'mahnung'").last_result) || q1("SELECT last_run FROM jobs WHERE key = 'mahnung'").last_run === '2026-11-01', 'Hängende Mahnung blockiert nicht');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nJOB-TEST BESTANDEN');
