// Suche über alle Bereiche (E-Mail), Geschäftspartner im Support-Ticket, „Passwort vergessen“ im Partner-Login, Passwortregel
import { makeD1, makeR2, installFetch, mails, SECRET, sig, nowSec, setNow, advance, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-09T10:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
const mailsTo = (email) => mails.filter((m) => m.to.some((t) => t.email === email));
const html = (m) => m.htmlContent || '';

console.log('Passwortregel');
let r = await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'adminpass123' }, { who: 'admin' });
check(r.status === 400 && /Großbuchstaben/.test(r.error) && /Sonderzeichen/.test(r.error), 'Fehlender Großbuchstabe und Sonderzeichen werden genannt', r.error);
r = await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass!!!' }, { who: 'admin' }); check(r.status === 400 && /eine Zahl/.test(r.error), 'Fehlende Zahl wird genannt');
r = await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'Ad1!' }, { who: 'admin' }); check(r.status === 400 && /10 Zeichen/.test(r.error), 'Zu kurz');
r = await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' }); check(r.ok, 'Passwort mit Zahl, Großbuchstabe und Sonderzeichen');
for (const [key, role, name] of [['vt', 'vertrieb', 'Vera Vertrieb'], ['bh', 'buchhaltung', 'Berta BH']]) {
  const u = await c.post('/api/users', { email: key + '@kfl.de', name, role_key: role }, { who: 'admin' });
  r = await c.post('/api/invite/accept', { token: u.invite.split('/').pop(), password: 'Passwort1234' }, { who: key }); check(r.status === 400, `${name}: Passwort ohne Sonderzeichen abgelehnt`);
  await c.post('/api/invite/accept', { token: u.invite.split('/').pop(), password: 'Passwort1234!' }, { who: key });
}
r = await c.post('/api/password', { current: 'Passwort1234!', next: 'neuespasswort1!' }, { who: 'vt' }); check(r.status === 400, 'Auch beim Ändern gilt die Regel');

// Geschäftspartner mit Konto, Rechnungs-E-Mail und Ansprechpartner
const org = (await c.post('/api/orgs', { name: 'Autohaus Alpha', kind: 'organisation', zip: '49074', city: 'Osnabrück', email: 'info@alpha.de', billing_email: 'rechnung@alpha.de', brands: ['Audi'] }, { who: 'admin' })).id;
await c.patch('/api/orgs/' + org, { contacts: [{ role: 'Werkstatt', name: 'Willi Werk', email: 'werkstatt@alpha.de', phone: '' }] }, { who: 'admin' });
const pu = await c.post(`/api/orgs/${org}/users`, { email: 'max@alpha.de', name: 'Max Alpha', role: 'gf' }, { who: 'admin' });
const inv = await c.post(`/api/orgs/${org}/users/${pu.id}/invite`, {}, { who: 'admin' });
r = await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345', agb: true, privacy: true }, { who: 'p' }); check(r.status === 400, 'Partner: schwaches Passwort abgelehnt');
await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345!', agb: true, privacy: true }, { who: 'p' });
const pu2 = await c.post(`/api/orgs/${org}/users`, { email: 'neu@alpha.de', name: 'Nina Neu', role: 'vt' }, { who: 'admin' });
await c.post('/api/acc/suppliers', { name: 'Druckerei Süd', email: 'buchhaltung@druckerei-sued.de' }, { who: 'bh' });
const ts = nowSec();
await c.post('/', { _form: 'deal', _kid: '777', _ts: ts, _sig: sig(`777.${ts}.deal`), Marke: 'Audi', Modell: 'A3', Bezahlart: 'kaufen', Vorname: 'Klara', name: 'Kunde', email: 'klara@kunde.de', phone: '0171 1', PLZ: '49451', Umkreis: '50 km', 'AGB akzeptiert': 'Ja', 'Datenschutz akzeptiert': 'Ja', 'Weitergabe an Partner und Kontaktaufnahme': 'Ja' });

console.log('Suche nach E-Mail-Adressen über alle Bereiche');
const groups = (res) => Object.fromEntries((res.groups || []).map((g) => [g.key, g.items]));
r = await c.get('/api/search?q=' + encodeURIComponent('rechnung@alpha.de'), { who: 'admin' });
check(groups(r).partner && groups(r).partner[0].href === `#/partner/${org}` && r.partner && r.partner.org_name === 'Autohaus Alpha' && r.partner.via === 'rechnung', 'Rechnungs-E-Mail findet den Geschäftspartner', r);
r = await c.get('/api/search?q=max%40alpha.de', { who: 'admin' });
check(groups(r).partnerkonten && groups(r).partnerkonten[0].title === 'Max Alpha' && r.partner.user.name === 'Max Alpha', 'Partnerkonto über E-Mail gefunden, mit Profil des Partners');
r = await c.get('/api/search?q=werkstatt%40alpha.de', { who: 'admin' }); check(r.partner && r.partner.via === 'ansprechpartner' && groups(r).partner, 'Ansprechpartner ohne Konto findet den Partner');
r = await c.get('/api/search?q=bh%40kfl.de', { who: 'admin' }); check(groups(r).mitarbeiter && groups(r).mitarbeiter[0].title === 'Berta BH', 'Mitarbeiter über E-Mail gefunden');
r = await c.get('/api/search?q=klara%40kunde.de', { who: 'admin' }); check(groups(r).anfragen && /^#1001/.test(groups(r).anfragen[0].title), 'Anfrage über Kunden-E-Mail gefunden');
r = await c.get('/api/search?q=druckerei-sued.de', { who: 'admin' }); check(groups(r).lieferanten && groups(r).lieferanten[0].title === 'Druckerei Süd', 'Lieferant über die Domain gefunden');
r = await c.get('/api/search?q=alpha.de', { who: 'admin' }); check(groups(r).partner && groups(r).partnerkonten.length === 2, 'Teil der Adresse (Domain) findet Partner und alle Konten');
console.log('Rechte in der Suche');
r = await c.get('/api/search?q=druckerei-sued.de', { who: 'vt' }); check(!groups(r).lieferanten, 'Vertrieb sieht keine Lieferanten');
r = await c.get('/api/search?q=bh%40kfl.de', { who: 'vt' }); check(!groups(r).mitarbeiter, 'Vertrieb sieht keine Mitarbeiter');
r = await c.get('/api/search?q=klara%40kunde.de', { who: 'bh' }); check(!groups(r).anfragen && !r.partner, 'Buchhaltung sieht keine Anfragen');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'suche'").n >= 10, 'Suchen stehen im Protokoll');

console.log('Support-Anfrage einer bekannten Partner-Adresse');
const tsS = nowSec();
r = await c.post('/', { _form: 'support', _kid: '0', _ts: tsS, _sig: sig(`0.${tsS}.support`), name: 'Max', email: 'Max@Alpha.de', Thema: 'Abrechnung', Nachricht: 'Frage zur Rechnung' });
let tk = q1('SELECT * FROM tickets ORDER BY id DESC LIMIT 1');
check(tk.org_id === org, 'Ticket über die Webseite automatisch dem Partner zugeordnet');
r = await c.get('/api/tickets/' + tk.id, { who: 'admin' });
check(r.partner && r.partner.org_id === org && r.partner.org_name === 'Autohaus Alpha' && r.ticket.org_name === 'Autohaus Alpha', 'Ticket zeigt den Geschäftspartner mit Link zum Profil');
sq.prepare("INSERT INTO tickets (tag, subject, status, requester_type, requester_name, requester_email, created_at, updated_at) VALUES ('Webseite', 'Alt', 'neu', 'web', 'W', 'werkstatt@alpha.de', datetime('now'), datetime('now'))").run();
tk = q1('SELECT * FROM tickets ORDER BY id DESC LIMIT 1');
r = await c.get('/api/tickets/' + tk.id, { who: 'admin' }); check(r.partner && r.partner.org_id === org && r.partner.via === 'ansprechpartner', 'Auch ältere Tickets ohne Zuordnung zeigen den Partner');
r = await c.post('/', { _form: 'support', _kid: '0', _ts: tsS, _sig: sig(`0.${tsS}.support`), name: 'Erika', email: 'erika@web.de', Thema: 'Frage', Nachricht: 'Hallo zusammen' });
tk = q1('SELECT * FROM tickets ORDER BY id DESC LIMIT 1'); r = await c.get('/api/tickets/' + tk.id, { who: 'admin' });
check(!tk.org_id && r.partner === null, 'Unbekannte Adresse: kein Partner');

console.log('Partner: Passwort vergessen');
const before = mails.length;
r = await c.post('/papi/forgot', { email: 'unbekannt@nirgends.de' }, { who: 'x' });
const msg = r.message;
check(r.ok && /Wenn diese E-Mail-Adresse bei uns hinterlegt ist/.test(msg) && mails.length === before, 'Unbekannte Adresse: gleiche Antwort, keine E-Mail');
r = await c.post('/papi/forgot', { email: 'MAX@alpha.de' }, { who: 'x' });
const m = mailsTo('max@alpha.de').pop();
const temp = (html(m).match(/monospace[^>]*>([^<]+)</) || [])[1];
check(r.ok && r.message === msg && m && /Passwort vergessen/.test(html(m)) && temp, 'Bekannte Adresse: gleiche Antwort, E-Mail mit neuem Passwort');
const he = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const tempPw = he(temp || '');
check(tempPw.length === 12 && /[0-9]/.test(tempPw) && /[A-Z]/.test(tempPw) && /[^A-Za-z0-9]/.test(tempPw), 'Vorläufiges Passwort erfüllt die Passwortregel', tempPw);
r = await c.post('/papi/forgot', { email: 'max@alpha.de' }, { who: 'x' }); check(mailsTo('max@alpha.de').length === 1 + mailsTo('max@alpha.de').filter((x) => !/Passwort vergessen/.test(html(x))).length, 'Innerhalb von 10 Minuten kein zweites Passwort');
r = await c.post('/papi/login', { email: 'max@alpha.de', password: 'Partner12345!' }, { who: 'alt' });
check(r.ok, 'Bisheriges Passwort bleibt gültig (Schutz vor Aussperren durch Fremde)');
r = await c.post('/papi/login', { email: 'max@alpha.de', password: tempPw }, { who: 'p2' });
check(r.ok, 'Anmeldung mit dem vorläufigen Passwort');
r = await c.get('/papi/session', { who: 'p2' }); check(r.user && r.user.mustChangePw, 'Danach muss ein eigenes Passwort vergeben werden');
r = await c.get('/papi/start', { who: 'p2' }); check(r.status === 428, 'Ohne neues Passwort kein Zugriff');
r = await c.post('/papi/password', { current: tempPw, next: 'schwach12345' }, { who: 'p2' }); check(r.status === 400, 'Neues Passwort muss der Regel entsprechen');
r = await c.post('/papi/password', { current: tempPw, next: 'MeinNeues#2026' }, { who: 'p2' }); check(r.ok, 'Eigenes Passwort gesetzt');
r = await c.post('/papi/login', { email: 'max@alpha.de', password: 'Partner12345!' }, { who: 'alt2' }); check(r.status === 401, 'Altes Passwort danach ungültig');
r = await c.post('/papi/login', { email: 'max@alpha.de', password: tempPw }, { who: 'alt3' }); check(r.status === 401, 'Vorläufiges Passwort nur einmal nutzbar');
r = await c.post('/papi/login', { email: 'max@alpha.de', password: 'MeinNeues#2026' }, { who: 'p3' }); check(r.ok, 'Anmeldung mit dem eigenen Passwort');

console.log('Ablauf, Sonderfälle und Missbrauchsschutz');
advance(1);
await c.post('/papi/forgot', { email: 'max@alpha.de' }, { who: 'x' });
const t2 = he((html(mailsTo('max@alpha.de').pop()).match(/monospace[^>]*>([^<]+)</) || [])[1] || '');
advance(25);
r = await c.post('/papi/login', { email: 'max@alpha.de', password: t2 }, { who: 'p4' }); check(r.status === 401, 'Vorläufiges Passwort nach 24 Stunden ungültig');
r = await c.post('/papi/forgot', { email: 'neu@alpha.de' }, { who: 'x' });
check(mailsTo('neu@alpha.de').some((x) => /einladung/.test(html(x))), 'Noch nicht aktiviertes Konto bekommt eine neue Einladung');
await c.post(`/api/orgs/${org}/users/${pu.id}/lock`, { lock: true }, { who: 'admin' });
sq.prepare("UPDATE partner_users SET locked_until = '9999-12-31T00:00:00Z', temp_pw_at = NULL WHERE id = ?").run(pu.id);
const n0 = mailsTo('max@alpha.de').length;
r = await c.post('/papi/forgot', { email: 'max@alpha.de' }, { who: 'x' }); check(r.ok && mailsTo('max@alpha.de').length === n0, 'Gesperrtes Konto bekommt kein Passwort');
for (let i = 0; i < 3; i++) await c.post('/papi/forgot', { email: `x${i}@test.de` }, { who: 'x' });
r = await c.post('/papi/forgot', { email: 'y@test.de' }, { who: 'x' }); check(r.status === 429, 'Zu viele Anfragen von derselben Adresse werden gebremst');
