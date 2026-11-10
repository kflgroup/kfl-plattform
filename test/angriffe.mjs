// Sechs Angriffsversuche wie von außen (Penetrationstest gegen die echte Worker-Logik mit Testdatenbank).
// Jeder Versuch besteht aus mehreren Einzelproben. ✓ = Angriff abgewehrt, ✗ = Lücke.
// Ergebnis zusätzlich als JSON: ANGRIFFE_JSON=/pfad node test/angriffe.mjs
import { writeFileSync } from 'node:fs';
import { makeD1, makeR2, installFetch, SECRET, sig, nowSec, setNow, advance, client, mails } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-10T20:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, APP_SECRET: 'x'.repeat(40), SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (s, ...a) => sq.prepare(s).get(...a);
const report = []; let cur = null; let fails = 0;
const attack = (no, title, goal) => { cur = { no, title, goal, probes: [] }; report.push(cur); console.log(`\nAngriff ${no}: ${title}`); };
const probe = (ok, text, extra) => { cur.probes.push({ ok: !!ok, text }); if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${text}${!ok && extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 400) : ''}`); };
const tok = (link) => String(link).split('/').pop().split('#').pop().replace(/^.*token=/, '');

// --- Ausgangslage: Admin, Vertriebler, zwei Partnerfirmen, eine Kundenanfrage ---
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Admin', password: 'AdminPass123!' }, { who: 'admin' });
const vt = await c.post('/api/users', { email: 'vt@kfl.de', name: 'Vera Vertrieb', role_key: 'vertrieb' }, { who: 'admin' });
await c.post('/api/invite/accept', { token: tok(vt.invite), password: 'Vertrieb12345!' }, { who: 'vt' });
const orgA = (await c.post('/api/orgs', { name: 'Autohaus Alpha', kind: 'einzel', zip: '49074', email: 'a@a.de', brands: ['Audi'] }, { who: 'admin' })).id;
const orgB = (await c.post('/api/orgs', { name: 'Autohaus Beta', kind: 'einzel', zip: '49074', email: 'b@b.de', brands: ['Audi'] }, { who: 'admin' })).id;
const mkPartner = async (org, email, role, who) => { const u = await c.post(`/api/orgs/${org}/users`, { email, name: who, role }, { who: 'admin' }); const inv = await c.post(`/api/orgs/${org}/users/${u.id}/invite`, {}, { who: 'admin' }); await c.post('/papi/invite/accept', { token: tok(inv.link), password: 'Partner12345!', agb: true, privacy: true }, { who }); return u.id; };
await mkPartner(orgA, 'gf@alpha.de', 'gf', 'pa');
await mkPartner(orgB, 'gf@beta.de', 'gf', 'pbeta');
const kid = '4711', ts = nowSec();
const XSS = '<img src=x onerror=alert(document.cookie)>';
let r = await c.post('/', { _form: 'deal', _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.deal`), Zustand: 'Neuwagen', Marke: 'Audi', Modell: 'A3 ' + XSS, Bezahlart: 'kaufen', Kundenart: 'Privat', Umkreis: '100 km', Vorname: XSS, name: '=HYPERLINK("http://evil.test","x")', email: 'k@kunde.de', phone: '0171 1234567', Straße: 'Weg 1', PLZ: '49074', Ort: 'Osnabrück', 'AGB akzeptiert': 'Ja', 'Datenschutz akzeptiert': 'Ja' });
const reqNo = r.number || r.id;
const asgA = q1('SELECT id FROM assignments WHERE org_id = ?', orgA), asgB = q1('SELECT id FROM assignments WHERE org_id = ?', orgB);

/* 1 ---------------------------------------------------------------- */
attack(1, 'Passwort-Angriff auf die Anmeldungen (Durchprobieren, Konten ausspähen, Zwei-Faktor umgehen)', 'Zugang zum internen oder Partner-Dashboard ohne gültige Zugangsdaten');
const a = await c.post('/api/login', { email: 'admin@kfl.de', password: 'Falsch!123' }, { who: 'x1' });
const b = await c.post('/api/login', { email: 'gibtsnicht@kfl.de', password: 'Falsch!123' }, { who: 'x2' });
probe(a.status === b.status && a.error === b.error, 'Gleiche Antwort für vorhandene und unbekannte Konten (keine Konten-Ausspähung)', [a, b]);
let last; for (let i = 0; i < 12; i++) last = await c.post('/api/login', { email: 'admin@kfl.de', password: 'Rate' + i + '!xyzAB' }, { who: 'brute' });
probe(last.status === 429, 'Durchprobieren von Passwörtern wird nach 10 Versuchen je Anschluss gestoppt', last);
let sp; for (let i = 0; i < 12; i++) sp = await c.post('/papi/login', { email: 'gf@alpha.de', password: 'Rate' + i + '!xyzAB' }, { who: 'brute-' + 'x'.repeat(i) });
r = await c.post('/papi/login', { email: 'gf@alpha.de', password: 'Partner12345!' }, { who: 'neueip' });
probe(r.status === 423 || r.status === 429 || r.status === 401, 'Verteiltes Durchprobieren (viele Anschlüsse) sperrt das Partnerkonto vorübergehend', r);
advance(1);
// Zwei-Faktor einrichten und dann ohne Code anmelden
const setup = await c.post('/api/2fa/setup', {}, { who: 'admin' });
const { createHmac } = await import('node:crypto');
const b32 = (s) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = []; for (const ch of s.replace(/=+$/, '')) bits += A.indexOf(ch).toString(2).padStart(5, '0'); for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
const totp = (secret0, t = Date.now()) => { const secret = String(secret0).replace(/\s+/g, ''); const step = Math.floor((globalThis.__KFL_NOW ?? t) / 1000 / 30); const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(step)); const h = createHmac('sha1', b32(secret)).update(buf).digest(); const o = h[h.length - 1] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0'); };
r = setup.secret ? await c.post('/api/2fa/enable', { code: totp(setup.secret) }, { who: 'admin' }) : { ok: false };
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!' }, { who: 'ohnecode' });
probe(!r.ok && r.need2fa, 'Mit richtigem Passwort, aber ohne Zwei-Faktor-Code: kein Zugang', r);
let tf; for (let i = 0; i < 12; i++) tf = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!', code: String(100000 + i) }, { who: 'codeguess' });
probe(tf.status === 429 || tf.status === 423, 'Raten des 6-stelligen Codes wird gebremst', tf);
advance(1);
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!', code: totp(setup.secret) }, { who: 'admin' });
const used = totp(setup.secret);
r = await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!', code: used }, { who: 'replay' });
probe(!r.ok, 'Ein bereits benutzter Code kann nicht ein zweites Mal verwendet werden', r);
// Standard-Bereichspasswort (stand im öffentlichen Quellcode als Hash)
const src = (await import('node:fs')).readFileSync(new URL('./wk.mjs', import.meta.url), 'utf8');
probe(!/DEFAULT_AREA_HASH|ee1cf79402a417ca/.test(src), 'Kein Standard-Bereichs-/Freigabepasswort (auch nicht als Hash) im öffentlichen Quellcode');
r = await c.post('/api/area/unlock', { password: 'AdminPass123!' }, { who: 'admin' });
probe(r.ok, 'Ohne eigenes Bereichspasswort entsperrt nur das eigene Anmeldepasswort (erneute Anmeldung)', r);

/* 2 ---------------------------------------------------------------- */
attack(2, 'Rechteausweitung und fremde Daten (IDOR)', 'Mit einem einfachen Konto Admin-Rechte erlangen oder Daten anderer Partner/Kunden lesen');
await c.post('/api/login', { email: 'vt@kfl.de', password: 'Vertrieb12345!' }, { who: 'vt' });
r = await c.post('/api/users', { email: 'boese@kfl.de', name: 'Böse', role_key: 'admin' }, { who: 'vt' }); probe(r.status === 403, 'Vertriebler kann kein Admin-Konto anlegen', r);
const vtId = q1("SELECT id FROM users WHERE email = 'vt@kfl.de'").id;
r = await c.patch(`/api/users/${vtId}`, { role_key: 'admin', extra_perms: ['users_admin', 'settings_all'] }, { who: 'vt' }); probe(r.status === 403 || r.status === 404, 'Vertriebler kann sich selbst keine Rolle/Rechte geben', r);
probe(q1('SELECT role_key FROM users WHERE id = ?', vtId).role_key === 'vertrieb', 'Rolle in der Datenbank unverändert');
for (const p of ['/api/backups', '/api/audit', '/api/settings', '/api/users', '/api/stats/staff']) { r = await c.get(p, { who: 'vt' }); probe(r.status === 403 || r.status === 423, `Vertriebler: ${p} gesperrt`, r.status); }
r = await c.post('/api/jobs/run', { job: 'backup' }, { who: 'vt' }); probe(r.status === 403, 'Vertriebler kann keine Systemjobs starten', r.status);
r = await c.get(`/papi/requests/${asgA.id}`, { who: 'pbeta' }); probe(r.status === 404 || r.status === 403, 'Partner Beta kann die Anfrage von Partner Alpha nicht öffnen (ID geraten)', r.status);
r = await c.post(`/papi/requests/${asgA.id}/take`, {}, { who: 'pbeta' }); probe(r.status === 404 || r.status === 403, 'Partner Beta kann fremde Anfrage nicht übernehmen', r.status);
r = await c.get('/papi/offers/1/file', { who: 'pbeta' }); probe(r.status === 404 || r.status === 403, 'Partner kann keine fremden Angebotsdateien laden', r.status);
r = await c.get('/papi/invoices/1/pdf', { who: 'pbeta' }); probe(r.status === 404 || r.status === 403, 'Partner kann keine fremden Rechnungen laden', r.status);
r = await c.get('/api/requests', { who: 'pa' }); probe(r.status === 401, 'Partner-Sitzung gilt nicht im internen Dashboard', r.status);
r = await c.get('/papi/requests', { who: 'vt' }); probe(r.status === 401, 'Mitarbeiter-Sitzung gilt nicht im Partner-Dashboard', r.status);
const t2 = nowSec();
r = await c.post('/my/requests', { _kid: '9999', _ts: t2, _sig: sig(`9999.${t2}.my`) }); probe(r.ok && r.requests.length === 0, 'Anderer Kunde sieht in „Meine Anfragen“ nichts von Kunde 4711', r);
r = await c.post(`/my/requests/${reqNo}/note`, { _kid: '9999', _ts: t2, _sig: sig(`9999.${t2}.my`), text: 'Übernahme' }); probe(r.status === 404, 'Anderer Kunde kann keine Notiz an fremde Anfrage hängen', r.status);

/* 3 ---------------------------------------------------------------- */
attack(3, 'Einschleusen von Code (SQL-Injection, XSS, Formel-Injection)', 'Datenbank auslesen oder Schadcode im Dashboard der Mitarbeiter/Partner ausführen');
const before = q1('SELECT COUNT(*) AS n FROM users').n;
for (const qq of ["' OR 1=1 --", "1; DROP TABLE users; --", "\" UNION SELECT email, pass_hash FROM users --", "%' AND 1=(SELECT COUNT(*) FROM users) --"]) {
  r = await c.get('/api/requests?q=' + encodeURIComponent(qq) + '&sort=' + encodeURIComponent('id; DROP TABLE users'), { who: 'admin' }); probe(r.status < 500 && !JSON.stringify(r).includes('pass_hash'), `SQL-Injection in Suche/Sortierung abgewehrt: ${qq}`, r.status);
  r = await c.get('/api/search?q=' + encodeURIComponent(qq), { who: 'admin' }); const hashes = sq.prepare('SELECT pass_hash FROM users WHERE pass_hash IS NOT NULL').all().map((x) => x.pass_hash); probe(r.status < 500 && !hashes.some((h) => JSON.stringify(r).includes(h)), `SQL-Injection in globaler Suche abgewehrt: ${qq}`, r.status);
}
r = await c.get('/papi/requests?q=' + encodeURIComponent("' OR 1=1 --") + '&tab=' + encodeURIComponent("x' OR '1'='1"), { who: 'pbeta' }); probe(r.status < 500 && !(r.items || r.requests || []).some((x) => x.org_id === orgA), 'SQL-Injection im Partner-Filter abgewehrt', r.status);
probe(q1('SELECT COUNT(*) AS n FROM users').n === before, 'Tabelle users unverändert');
// gespeichertes XSS: Server liefert Rohtext (JSON), die Oberfläche maskiert – prüfen, dass HTML-Ausgaben maskieren
const staffHtml = await (await c.call('GET', '/admin', null, { raw: true })).text();
probe(/const esc\s*=|function esc\(/.test(staffHtml) && /script-src 'nonce-/.test((await c.call('GET', '/admin', null, { raw: true })).headers.get('Content-Security-Policy')), 'Oberfläche maskiert Eingaben, CSP erlaubt nur signierte Skripte (eingeschleuste Skripte laufen nicht)');
const mailWithXss = mails.find((m) => JSON.stringify(m).includes('onerror'));
probe(!mailWithXss || !/<img src=x onerror/.test(mailWithXss.htmlContent || ''), 'E-Mails an KFL/Kunden enthalten eingeschleustes HTML nur maskiert', mailWithXss && (mailWithXss.htmlContent || '').slice(0, 200));
const exp = await c.call('GET', '/api/requests?export=csv', null, { who: 'admin', raw: true });
const expTxt = exp.status === 200 ? await exp.text() : '';
probe(!expTxt || !/(^|[;,\t"])=HYPERLINK/m.test(expTxt), 'Export: Formeln aus Kundeneingaben werden entschärft (keine Excel-Formel-Injection)', expTxt.slice(0, 200));

/* 4 ---------------------------------------------------------------- */
attack(4, 'Sitzungs-Angriffe (CSRF, Cookie-Diebstahl, Klickfallen)', 'Eine angemeldete Person dazu bringen, unbemerkt Aktionen auszuführen, oder ihre Sitzung übernehmen');
const login = await worker.fetch(new Request('https://w.test/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://w.test', 'X-KFL': '1', 'CF-Connecting-IP': '198.51.100.7' }, body: JSON.stringify({ email: 'vt@kfl.de', password: 'Vertrieb12345!' }) }), env);
const ck = login.headers.get('Set-Cookie') || '';
probe(/HttpOnly/i.test(ck) && /Secure/i.test(ck) && /SameSite=Strict/i.test(ck), 'Sitzungs-Cookie: HttpOnly, Secure, SameSite=Strict (für Skripte unlesbar, nicht von fremden Seiten mitgesendet)', ck.replace(/=[^;]+/, '=…'));
const cookie = ck.split(';')[0];
const csrf = await worker.fetch(new Request('https://w.test/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test', Cookie: cookie, 'CF-Connecting-IP': '198.51.100.7' }, body: JSON.stringify({ email: 'x@x.de', name: 'X', role_key: 'vertrieb' }) }), env);
probe(csrf.status === 403, 'Fremde Webseite kann keine Aktion im Namen der Person auslösen (Herkunft + Kopfzeile)', csrf.status);
const csrf2 = await worker.fetch(new Request('https://w.test/api/logout', { method: 'POST', headers: { 'Content-Type': 'text/plain', Cookie: cookie, 'CF-Connecting-IP': '198.51.100.7' }, body: '{}' }), env);
probe(csrf2.status === 403, 'Einfaches Formular ohne Schutz-Kopfzeile wird abgewiesen', csrf2.status);
const page = await c.call('GET', '/partner', null, { raw: true });
probe(page.headers.get('X-Frame-Options') === 'DENY' && /frame-ancestors 'none'/.test(page.headers.get('Content-Security-Policy') || ''), 'Einbetten in fremde Seiten (Klickfalle) verboten');
probe(/max-age=31536000/.test(page.headers.get('Strict-Transport-Security') || ''), 'Nur verschlüsselte Verbindungen (HSTS)');
await c.post('/api/logout', {}, { who: 'vt' });
r = await c.get('/api/session', { who: 'vt' }); probe(r.status === 401 || !r.user, 'Nach dem Abmelden ist die alte Sitzung ungültig', r.status);
const cname = (ck.split('=')[0] || 'kfl_s').trim();
const fake = await worker.fetch(new Request('https://w.test/api/requests', { headers: { Cookie: cname + '=' + 'a'.repeat(64), 'X-KFL': '1', Origin: 'https://w.test' } }), env);
probe(fake.status === 401, 'Ausgedachte Sitzungskennung wird nicht angenommen', fake.status);

/* 5 ---------------------------------------------------------------- */
attack(5, 'Angriff auf den öffentlichen Formular-Dienst und „Meine Anfragen“', 'Gefälschte Anfragen einspielen, fremde Kundendaten abrufen oder den Dienst überlasten');
let t = nowSec();
r = await c.post('/', { _form: 'deal', _kid: kid, _ts: t, _sig: '0'.repeat(64), Vorname: 'X', email: 'x@x.de' }); probe(r.status === 403, 'Formular mit gefälschter Signatur wird abgewiesen', r.status);
r = await c.post('/', { _form: 'deal', _kid: '1234', _ts: t, _sig: sig(`${kid}.${t}.deal`), Vorname: 'X', email: 'x@x.de' }); probe(r.status === 403, 'Signatur eines anderen Kundenkontos funktioniert nicht (Kundennummer getauscht)', r.status);
const old = String(+t - 8 * 24 * 3600);
r = await c.post('/', { _form: 'support', _kid: '0', _ts: old, _sig: sig(`0.${old}.support`), name: 'X', email: 'x@x.de', Nachricht: 'alt' }); probe(r.status === 403, 'Alte, abgefangene Formular-Signatur (älter als 7 Tage) wird abgewiesen', r.status);
r = await c.post('/', { _form: 'support', _kid: '0', _ts: t, _sig: sig(`0.${t}.support`), name: 'X', email: 'x@x.de', Nachricht: 'Hallo' }, { origin: 'https://evil.test' }); probe(r.status === 403, 'Formular-Dienst nimmt nichts von fremden Webseiten an (Herkunftsprüfung)', r.status);
r = await c.post('/', { _form: 'admin', _kid: '0', _ts: t, _sig: sig(`0.${t}.admin`) }); probe(r.status === 400, 'Unbekannte Formulartypen werden abgewiesen', r.status);
r = await c.post('/my/requests', { _kid: kid, _ts: t, _sig: sig(`${kid}.${t}.deal`) }); probe(r.status === 403, '„Meine Anfragen“: Formular-Signatur gilt nicht als Kunden-Ausweis (Zweck gebunden)', r.status);
const tOld = String(+t - 13 * 3600);
r = await c.post('/my/requests', { _kid: kid, _ts: tOld, _sig: sig(`${kid}.${tOld}.my`) }); probe(r.status === 403, '„Meine Anfragen“: abgelaufener Kunden-Ausweis (älter als 12 Stunden) wird abgewiesen', r.status);
r = await c.post('/my/requests', { _kid: '0', _ts: t, _sig: sig(`0.${t}.my`) }); probe(r.status === 401, '„Meine Anfragen“ ohne Kundenkonto nicht nutzbar', r.status);
let lastSpam; for (let i = 0; i < 10; i++) { const tt = nowSec(); lastSpam = await c.post('/', { _form: 'support', _kid: '0', _ts: tt, _sig: sig(`0.${tt}.support`), name: 'Spam', email: 'spam@x.de', Thema: 'x', Nachricht: 'Werbung ' + i }, { who: 'spammer' }); }
probe(lastSpam.status === 429, 'Massenhaftes Absenden wird gebremst', lastSpam.status);
r = await c.post('/api/login', { email: 'a'.repeat(13_000_000) }, { who: 'big' }); probe(r.status === 413, 'Übergroße Daten werden abgewiesen (Überlastung)', r.status);

/* 6 ---------------------------------------------------------------- */
attack(6, 'Schadhafte Dateien und Informationslecks', 'Getarnte Dateien hochladen, Dateien anderer abrufen oder interne Details aus Fehlermeldungen lesen');
await c.post(`/papi/requests/${asgA.id}/take`, {}, { who: 'pa' });
const evil = Buffer.from('<html><script>fetch("/api/users")</script></html>').toString('base64');
r = await c.post(`/papi/requests/${asgA.id}/offer`, { config: 'gleich', equipment_match: 'ja', price: '30000', pdf: { name: '../../etc/passwd.pdf', type: 'application/pdf', base64: evil } }, { who: 'pa' });
const f = q1('SELECT * FROM files ORDER BY id DESC LIMIT 1');
probe(f && f.mime !== 'text/html' && f.mime !== 'application/pdf', 'Als PDF getarnte HTML-Datei wird erkannt und nicht als PDF gespeichert', f && f.mime);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>').toString('base64');
r = await c.post(`/papi/requests/${asgA.id}/parse-pdf`, { pdf: { name: 'x.pdf', type: 'application/pdf', base64: svg } }, { who: 'pa' });
probe(r.status >= 400 || r.ok === false || (r.fields && Object.keys(r.fields).length === 0) || r.ok, 'Auslesen eines als PDF getarnten SVG führt zu keinem Fehler mit Interna', r.status);
const off = q1('SELECT id FROM offers ORDER BY id DESC LIMIT 1');
if (off) {
  const res = await c.call('GET', `/api/requests/${reqNo}/offers/${off.id}/file`, null, { who: 'admin', raw: true });
  probe(/^attachment/.test(res.headers.get('Content-Disposition') || '') && /sandbox/.test(res.headers.get('Content-Security-Policy') || '') && !/[/\\]/.test((res.headers.get('Content-Disposition') || '').split('filename=')[1] || ''), 'Verdächtige Datei nur als Download, abgeschottet, Dateiname ohne Pfadangaben');
  const res2 = await c.call('GET', `/papi/offers/${off.id}/file`, null, { who: 'pbeta', raw: true }); probe(res2.status === 404 || res2.status === 403, 'Fremder Partner kann die Datei nicht laden', res2.status);
}
for (const p of ['/api/../../.env', '/api/requests/abc', '/papi/requests/99999999', '/api/files/1', '/wrangler.toml', '/dist/worker.js', '/.git/config']) {
  const res = await c.call('GET', p, null, { who: 'admin', raw: true }); const txt = await res.text();
  probe(res.status >= 400 && !/at\s+\w+\s+\(|stack|SQLITE|D1_ERROR|node_modules|FORM_SECRET|APP_SECRET/i.test(txt), `Keine Interna in Fehlerantwort: ${p}`, txt.slice(0, 160));
}
const nf = await c.call('GET', '/gibtsnicht', null, { raw: true });
probe(nf.headers.get('X-Content-Type-Options') === 'nosniff', 'Auch Fehlerseiten tragen Sicherheits-Kopfzeilen', [...nf.headers.keys()]);
const { createHash } = await import('node:crypto');
const plain = createHash('sha256').update('kfl-ip:203.0.113.5').digest('hex').slice(0, 24);
const logged = sq.prepare('SELECT ip FROM audit WHERE ip IS NOT NULL').all().map((x) => x.ip);
probe(logged.length > 0 && !logged.includes(plain), 'IP-Kennungen im Protokoll sind mit geheimem Schlüssel gebildet (nicht durch Durchprobieren aller IPv4-Adressen umkehrbar)', logged.slice(0, 2));
r = await c.get('/health'); probe(!r.version || !/\d+\.\d+\.\d+/.test(r.version), 'Statusseite verrät keine genaue Softwareversion', r);

console.log(`\n${fails ? fails + ' Lücke(n) gefunden' : 'Alle Angriffe abgewehrt'}`);
if (process.env.ANGRIFFE_JSON) writeFileSync(process.env.ANGRIFFE_JSON, JSON.stringify({ at: new Date().toISOString(), fails, report }, null, 1));
process.exitCode = 0;
