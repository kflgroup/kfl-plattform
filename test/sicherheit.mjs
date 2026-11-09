// Sicherheit: Anmelde-Bremse je Anschluss, Zusatzpasswörter, Dateiausgabe nach Inhalt, Sitzungen, Spam-Bremse, Sicherheits-Header
import { makeD1, makeR2, installFetch, SECRET, sig, nowSec, setNow, advance, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-09T10:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);

await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
const org = (await c.post('/api/orgs', { name: 'Autohaus Alpha', kind: 'einzel', zip: '49074', email: 'a@a.de', brands: ['Audi'] }, { who: 'admin' })).id;
const pu = await c.post(`/api/orgs/${org}/users`, { email: 'p@alpha.de', name: 'Paul Partner', role: 'gf' }, { who: 'admin' });
const inv = await c.post(`/api/orgs/${org}/users/${pu.id}/invite`, {}, { who: 'admin' });
await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345!', agb: true, privacy: true }, { who: 'pa' });

console.log('Sicherheits-Header');
let res = await c.call('GET', '/api/session', null, { who: 'admin', raw: true });
check(/max-age=31536000/.test(res.headers.get('Strict-Transport-Security') || '') && res.headers.get('X-Content-Type-Options') === 'nosniff', 'API: HSTS und nosniff');
res = await c.call('GET', '/admin', null, { raw: true });
check(/frame-ancestors 'none'/.test(res.headers.get('Content-Security-Policy') || '') && res.headers.get('X-Frame-Options') === 'DENY' && /max-age/.test(res.headers.get('Strict-Transport-Security') || ''), 'Oberfläche: CSP, Klickschutz, HSTS');

console.log('Anmelde-Bremse je Anschluss');
// gleicher Anschluss (who-Länge 5 → gleiche IP): Durchprobieren vieler Adressen
for (let i = 0; i < 10; i++) await c.post('/api/login', { email: `x${i}@test.de`, password: 'Falsch123!' }, { who: 'angr1' });
let r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!' }, { who: 'angr2' });
check(r.status === 429 && /Anschluss/.test(r.error), 'Nach 10 Fehlversuchen von einem Anschluss: auch richtige Daten werden 15 Min. abgewiesen', r);
r = await c.post('/papi/login', { email: 'p@alpha.de', password: 'Partner12345!' }, { who: 'angr3' }); check(r.status === 429, 'Gilt auch für das Partner-Login');
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!' }, { who: 'admin2' }); check(r.ok, 'Anderer Anschluss ist nicht betroffen');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'login_unbekannt'").n === 10, 'Versuche mit unbekannten Adressen stehen im Protokoll');
advance(0.3);
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!' }, { who: 'angr2' }); check(r.ok, 'Nach 15 Minuten wieder möglich');

console.log('Zusatzpasswörter');
for (let i = 0; i < 5; i++) await c.post('/api/area/unlock', { password: 'falsch' + i }, { who: 'admin' });
r = await c.post('/api/area/unlock', { password: 'irgendwas' }, { who: 'admin' }); check(r.status === 429, 'Bereichspasswort: nach 5 Fehlversuchen gesperrt', r);
r = await c.post('/api/settings/scoring-password', { current: 'falsch', next: 'NeuesFreigabe#2026' }, { who: 'admin' }); check(r.status === 403, 'Freigabepasswort ändern nur mit dem aktuellen');
r = await c.get('/api/me/start?full=1', { who: 'admin' });
check(Array.isArray(r.security) && r.security.length === 3 && r.security.every((x) => x.ok === false), 'Admin sieht offene Sicherheitspunkte (Server-Schlüssel, Bereichs- und Freigabepasswort)', r.security);

console.log('Dateien: Typ nach Inhalt');
const kid = '777', ts = nowSec();
await c.post('/', { _form: 'deal', _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.deal`), Zustand: 'Neuwagen', Marke: 'Audi', Modell: 'A3', Bezahlart: 'kaufen', Kundenart: 'Privat', Umkreis: '100 km', Vorname: 'K', name: 'Kunde', email: 'k@kunde.de', phone: '0171 1', PLZ: '49451', Ort: 'Holdorf', 'AGB akzeptiert': 'Ja', 'Datenschutz akzeptiert': 'Ja', 'Weitergabe an Partner und Kontaktaufnahme': 'Ja' });
const aid = q1('SELECT id FROM assignments WHERE org_id = ?', org).id;
await c.post(`/papi/requests/${aid}/take`, {}, { who: 'pa' });
const evil = Buffer.from('<html><script>fetch("/api/users")</script></html>').toString('base64');
r = await c.post(`/papi/requests/${aid}/offer`, { config: 'gleich', equipment_match: 'ja', price: '30000', pdf: { name: 'angebot.pdf', type: 'application/pdf', base64: evil } }, { who: 'pa' });
const f = q1('SELECT * FROM files ORDER BY id DESC LIMIT 1');
check(f && f.mime === 'application/octet-stream', 'Getarnte HTML-Datei wird nicht als PDF gespeichert', f && f.mime);
const oid = q1('SELECT id FROM offers ORDER BY id DESC LIMIT 1');
if (oid) {
  res = await c.call('GET', `/api/requests/1001/offers/${oid.id}/file`, null, { who: 'admin2', raw: true });
  const cd = res.headers.get('Content-Disposition') || '', ct = res.headers.get('Content-Type') || '';
  check(res.status === 200 && (/^attachment/.test(cd) && !/html/.test(ct) && /sandbox/.test(res.headers.get('Content-Security-Policy') || '')), 'Ausgabe nur als Download in abgeschotteter Antwort', { s: res.status, cd, ct });
}

console.log('Sitzungen');
await c.post('/papi/login', { email: 'p@alpha.de', password: 'Partner12345!' }, { who: 'pb' });
r = await c.post('/papi/password', { current: 'Partner12345!', next: 'Partner67890!' }, { who: 'pa' }); check(r.ok, 'Partner ändert sein Passwort');
r = await c.get('/papi/me', { who: 'pb' }); check(r.status === 401, 'Andere Anmeldungen des Partners werden beendet', r.status);
r = await c.get('/papi/me', { who: 'pa' }); check(r.status !== 401, 'Eigene Anmeldung bleibt');

console.log('Spam-Bremse für Formulare ohne Kundenkonto');
let last;
for (let i = 0; i < 9; i++) { const t = nowSec(); last = await c.post('/', { _form: 'support', _kid: '0', _ts: t, _sig: sig(`0.${t}.support`), name: 'Spam', email: 'spam@x.de', Thema: 'x', Nachricht: 'Werbung ' + i }); }
check(last.status === 429, 'Ab dem 9. Formular je Stunde und Anschluss: abgewiesen', last);
check(q1("SELECT COUNT(*) AS n FROM tickets WHERE requester_email = 'spam@x.de'").n === 8, 'Nur 8 Tickets angelegt');

console.log('Große Daten');
r = await c.post('/api/login', { email: 'a'.repeat(13_000_000) }, { who: 'big' }); check(r.status === 413, 'Zu große Anfrage wird abgewiesen', r.status);
console.log('fertig');
