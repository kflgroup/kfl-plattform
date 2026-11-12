// Angebotsfrist verlängern: Partner, die die Anfrage schon haben (ohne Angebot) → +24 Werktags-Stunden, einzeln oder für alle
import { makeD1, makeR2, installFetch, SECRET, setNow, advance, client, check, cron, mails } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-10T09:00:00Z'); // Dienstag
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
const vt = await c.post('/api/users', { email: 'vt@kfl.de', name: 'Vera', role_key: 'vertrieb' }, { who: 'admin' });
await c.post('/api/invite/accept', { token: vt.invite.split('/').pop(), password: 'Vertrieb12345!' }, { who: 'vt' });
const orgs = {};
for (const n of ['A', 'B', 'C']) {
  const id = (await c.post('/api/orgs', { name: 'Autohaus ' + n, kind: 'organisation', zip: '49451', email: `info@${n}.de`, brands: ['Audi'] }, { who: 'admin' })).id;
  const pu = await c.post(`/api/orgs/${id}/users`, { email: `gf@${n}.de`, name: 'GF ' + n, role: 'gf' }, { who: 'admin' });
  const inv = await c.post(`/api/orgs/${id}/users/${pu.id}/invite`, {}, { who: 'admin' });
  await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345!', agb: true, privacy: true }, { who: 'p' + n });
  orgs[n] = id;
}
const relog = async () => { await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!' }, { who: 'admin' }); await c.post('/api/login', { email: 'vt@kfl.de', password: 'Vertrieb12345!' }, { who: 'vt' }); for (const n of ['A', 'B', 'C']) await c.post('/papi/login', { email: `gf@${n}.de`, password: 'Partner12345!' }, { who: 'p' + n }); };
const newReq = () => Number(sq.prepare("INSERT INTO requests (type, status, customer_name, email, brand, model, vehicle, plz, data, radius_km, created_at, updated_at) VALUES ('deal', 'eingang', 'Kim Kunde', 'kim@kunde.de', 'Audi', 'A4', 'Audi A4', '49451', ?, 100, ?, ?)")
  .run(JSON.stringify({ Formular: 'DEIN AUTO-DEAL', Marke: 'Audi', Modell: 'A4', Vorname: 'Kim' }), new Date(globalThis.__KFL_NOW).toISOString(), new Date(globalThis.__KFL_NOW).toISOString()).lastInsertRowid);
const asg = (rid, n) => q1('SELECT * FROM assignments WHERE request_id = ? AND org_id = ?', rid, orgs[n]);

console.log('Anfrage ohne Angebot: Fristen laufen ab');
const rid = newReq(), no = rid + 1000;
for (const n of ['A', 'B', 'C']) await c.post(`/api/requests/${no}/assign`, { org_id: orgs[n] }, { who: 'admin' });
let r = await c.post(`/api/requests/${no}/assign`, { org_id: orgs.A }, { who: 'admin' });
check(r.ok && r.extended && Date.parse(r.deadline) > Date.parse(asg(rid, 'B').deadline_at), 'Partner mit laufender Frist erneut gewählt → Frist +24 Werktags-Stunden statt Fehlermeldung', r);
check(asg(rid, 'A').extended === 1 && qa('SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', rid, orgs.A).length === 1, 'Keine doppelte Zuordnung, Verlängerung gezählt');
advance(24 * 6); await relog(); await cron(worker, env);
check(['B', 'C'].every((n) => asg(rid, n).status === 'verloren') && asg(rid, 'A').status === 'verloren', 'Nach Fristende: alle drei „verloren“');
let req = q1('SELECT * FROM requests WHERE id = ?', rid);
check(req.status === 'kein_angebot' && req.evaluated_at, 'Anfrage: „kein Angebot“', req.status);

console.log('Manuelle Zuordnung zeigt Partner, die die Anfrage schon hatten');
r = await c.get(`/api/requests/${no}/candidates`, { who: 'admin' });
const cb = r.orgs.find((o) => o.id === orgs.B);
check(cb.assigned && cb.assignment && cb.assignment.extendable && cb.assignment.status === 'verloren', 'Partner B auswählbar (Frist abgelaufen, kein Angebot)', cb.assignment);
r = await c.get(`/api/requests/${no}`, { who: 'admin' }); check(r.request.extendOk === true, 'Detail: Verlängerung möglich');
mails.length = 0;
r = await c.post(`/api/requests/${no}/assign`, { org_id: orgs.B, note: 'Der Kunde wartet noch.' }, { who: 'admin' });
const now = globalThis.__KFL_NOW;
let b = asg(rid, 'B');
check(r.ok && r.extended && b.status === 'neu' && !b.closed_reason && Date.parse(b.deadline_at) > now + 20 * 3600e3, 'B wieder geöffnet, neue Frist ab jetzt (24 Werktags-Stunden)', b);
req = q1('SELECT * FROM requests WHERE id = ?', rid);
check(req.status === 'versendet' && !req.evaluated_at && req.deadline_at === b.deadline_at, 'Anfrage wieder „versendet“, Auswertung zurückgesetzt, Gesamtfrist angepasst', req);
const m = mails.find((x) => x.to[0].email === 'gf@b.de');
check(m && /Mehr Zeit/.test(m.subject) && /Neue Angebotsfrist/.test(m.htmlContent) && /Der Kunde wartet noch/.test(m.htmlContent), 'Partner B bekommt E-Mail „Mehr Zeit … Frist verlängert“ mit Notiz', { n: mails.length, last: mails.slice(-1).map((x) => ({ to: x.to, s: x.subject })), outbox: qa('SELECT recipient, subject, status FROM mail_outbox ORDER BY id DESC LIMIT 3') });
r = await c.get('/papi/requests', { who: 'pB' });
check(JSON.stringify(r).includes(String(b.id)) && q1("SELECT COUNT(*) AS n FROM partner_events WHERE assignment_id = ? AND action = 'frist_verlaengert'", b.id).n === 1, 'Partner B sieht die Anfrage wieder, Verlauf mit Hinweis');
check(asg(rid, 'C').status === 'verloren', 'C bleibt unverändert, solange nicht gewählt');

console.log('Für alle Partner verlängern');
r = await c.post(`/api/requests/${no}/extend`, { note: 'Bitte noch ein Angebot abgeben.' }, { who: 'vt' });
check(r.status === 403, 'Vertrieb ohne Recht „Partner zuordnen“ darf nicht verlängern', r.status);
const bBefore = asg(rid, 'B').deadline_at;
mails.length = 0;
r = await c.post(`/api/requests/${no}/extend`, { note: 'Bitte noch ein Angebot abgeben.' }, { who: 'admin' });
check(r.ok && r.extended === 3, 'Alle drei Partner ohne Angebot verlängert', r);
check(Date.parse(asg(rid, 'B').deadline_at) > Date.parse(bBefore) && asg(rid, 'B').extended === 2, 'B: laufende Frist nochmals +24 Werktags-Stunden (2× verlängert)');
check(['A', 'C'].every((n) => asg(rid, n).status === 'neu'), 'A und C wieder geöffnet');
check(['gf@a.de', 'gf@b.de', 'gf@c.de'].every((e) => mails.some((x) => x.to[0].email === e && /Mehr Zeit/.test(x.subject))), 'Alle drei Partner benachrichtigt');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'frist_verlaengert'").n === 3, 'Jede Verlängerung im Protokoll');
advance(3); await relog(); await cron(worker, env);
check(!q1('SELECT evaluated_at FROM requests WHERE id = ?', rid).evaluated_at, 'Vor Ablauf der neuen Frist keine Auswertung');

console.log('Grenzen');
const aA = asg(rid, 'A');
sq.prepare("INSERT INTO offers (request_id, assignment_id, org_id, kind, data, compare_value, status, created_at, updated_at) VALUES (?, ?, ?, 'kauf', '{}', 30000, 'eingereicht', ?, ?)").run(rid, aA.id, orgs.A, '2026-11-17T09:00:00Z', '2026-11-17T09:00:00Z');
sq.prepare("UPDATE assignments SET offer_id = (SELECT MAX(id) FROM offers), status = 'versendet' WHERE id = ?").run(aA.id);
r = await c.post(`/api/requests/${no}/assign`, { org_id: orgs.A }, { who: 'admin' });
check(r.status === 409 && /bereits ein Angebot/.test(r.error), 'Partner mit Angebot: keine Verlängerung', r);
r = await c.get(`/api/requests/${no}/candidates`, { who: 'admin' });
check(!r.orgs.find((o) => o.id === orgs.A).assignment.extendable, 'Im Auswahldialog als „Angebot liegt vor“ gesperrt');
r = await c.post(`/api/requests/${no}/extend`, {}, { who: 'admin' });
check(r.ok && r.extended === 2, '„Alle verlängern“ überspringt Partner mit Angebot', r);
advance(24 * 8); await relog(); await cron(worker, env);
req = q1('SELECT * FROM requests WHERE id = ?', rid);
check(req.evaluated_at && req.status !== 'kein_angebot', 'Nach Ablauf aller Fristen wird mit dem Angebot von A ausgewertet', req.status);
r = await c.post(`/api/requests/${no}/extend`, {}, { who: 'admin' });
check(r.status === 409 && /bereits ausgewertet/.test(r.error), 'Nach Auswertung mit Angeboten keine Verlängerung mehr', r);
r = await c.get(`/api/requests/${no}`, { who: 'admin' }); check(r.request.extendOk === false, 'Detail: Buttons ausgeblendet');
const r2 = newReq();
r = await c.post(`/api/requests/${r2 + 1000}/extend`, {}, { who: 'admin' });
check(r.status === 409 && /keinen Partner/.test(r.error), 'Ohne Partner: verständlicher Hinweis');
if (!process.exitCode) console.log('OK – Frist verlängern');
