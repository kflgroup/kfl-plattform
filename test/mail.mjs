// E-Mail-Versand über SMTP (simulierter IONOS-Server): Einladung an Geschäftspartner, Absender, Fallback
import { makeD1, makeR2, installFetch, SECRET, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
const sent = []; const opts = { rejectFrom: ['rechnung@kfl-group.com'], user: 'noreplay@kfl-group.com', pass: 'Postfach-Passwort1' };
let tls = 0;
globalThis.__kflConnect = ({ hostname, port }) => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const make = (greet) => {
    let push; const readable = new ReadableStream({ start(c) { push = (s) => c.enqueue(enc.encode(s)); if (greet) push('220 smtp.ionos.de ESMTP\r\n'); } });
    let buf = '', mode = 'cmd', auth = 0, user = '', cur = null;
    const handle = () => {
      if (mode === 'data') {
        const i = buf.indexOf('\r\n.\r\n'); if (i < 0) return;
        cur.data = buf.slice(0, i).replace(/\r\n\.\./g, '\r\n.'); buf = buf.slice(i + 5); mode = 'cmd'; sent.push(cur); cur = null; push('250 Requested mail action okay, queued\r\n'); return handle();
      }
      const i = buf.indexOf('\r\n'); if (i < 0) return;
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (auth === 1) { user = Buffer.from(line, 'base64').toString(); auth = 2; push('334 UGFzc3dvcmQ6\r\n'); }
      else if (auth === 2) { auth = 0; push(user === opts.user && Buffer.from(line, 'base64').toString() === opts.pass ? '235 Authentication succeeded\r\n' : '535 Authentication credentials invalid\r\n'); }
      else if (/^EHLO/.test(line)) push('250-smtp.ionos.de\r\n250-AUTH LOGIN PLAIN\r\n250 STARTTLS\r\n');
      else if (line === 'STARTTLS') push('220 Ready to start TLS\r\n');
      else if (line === 'AUTH LOGIN') { auth = 1; push('334 VXNlcm5hbWU6\r\n'); }
      else if (/^MAIL FROM:/.test(line)) { const f = line.match(/<(.+)>/)[1]; if (f !== user && opts.rejectFrom.includes(f)) push('550 Sender address not allowed for this account\r\n'); else { cur = { host: hostname, port, user, from: f, to: [] }; push('250 OK\r\n'); } }
      else if (/^RCPT TO:/.test(line)) { cur.to.push(line.match(/<(.+)>/)[1]); push('250 OK\r\n'); }
      else if (line === 'DATA') { mode = 'data'; push('354 Start mail input\r\n'); }
      else if (line === 'QUIT') push('221 Bye\r\n');
      else push('500 unknown\r\n');
      handle();
    };
    const writable = new WritableStream({ write(chunk) { buf += dec.decode(chunk); handle(); } });
    return { readable, writable, startTls() { tls++; return make(false); }, close() {} };
  };
  return make(true);
};
const decodeHtml = (mime) => { const m = mime.match(/Content-Type: text\/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/); return m ? Buffer.from(m[1].replace(/\s+/g, ''), 'base64').toString('utf8') : ''; };
const header = (mime, name) => (mime.match(new RegExp('^' + name + ': (.*)$', 'm')) || [])[1] || '';
const decWord = (v) => v.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'));

const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', SMTP_USER: 'noreplay@kfl-group.com', SMTP_PASS: 'Postfach-Passwort1' };
const c = client(worker, env);
console.log('E-Mail über SMTP (IONOS)');
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
let r = await c.get('/api/settings', { who: 'admin' });
check(r.env.mail === 'smtp' && r.env.smtpUser === 'noreplay@kfl-group.com' && r.settings.mail_from_system === 'noreplay@kfl-group.com', 'Einstellungen: Versand über Postfach noreplay@ aktiv', r.env);
for (const [kind, name] of [['einzel', 'Einzelhändler Meyer'], ['organisation', 'Autohaus Organisation GmbH']]) {
  const o = await c.post('/api/orgs', { name, kind, zip: '49451', email: 'info@' + kind + '.de', brands: ['Audi'] }, { who: 'admin' });
  const u = await c.post(`/api/orgs/${o.id}/users`, { name: 'Pia ' + kind, email: `pia@${kind}.de`, role: 'gf' }, { who: 'admin' });
  const inv = await c.post(`/api/orgs/${o.id}/users/${u.id}/invite`, {}, { who: 'admin' });
  check(inv.mail === 'gesendet', `${kind}: Einladung per E-Mail versendet`, inv);
  const m = sent[sent.length - 1];
  check(m && m.from === 'noreplay@kfl-group.com' && m.to[0] === `pia@${kind}.de` && /noreplay@kfl-group\.com>$/.test(header(m.data, 'From')) && m.host === 'smtp.ionos.de' && m.port === 587, `${kind}: Absender noreplay@kfl-group.com über smtp.ionos.de:587`, m && { from: m.from, h: header(m.data, 'From') });
  const html = decodeHtml(m.data);
  check(html.includes(name) && html.includes('#/einladung/' + inv.link.split('/').pop()) && /Einladung zum KFL-Partner-Dashboard/.test(decWord(header(m.data, 'Subject'))), `${kind}: E-Mail enthält Einladungslink, Firmenname und Betreff`);
}
check(tls === sent.length && tls >= 2, 'Verbindung jeweils per STARTTLS verschlüsselt');
r = await c.post('/api/mail/test', { to: 'tobias@test.de', category: 'invoice' }, { who: 'admin' });
const fb = sent[sent.length - 1];
check(r.status === 'gesendet' && fb.from === 'noreplay@kfl-group.com' && /rechnung@kfl-group\.com/.test(header(fb.data, 'Reply-To')), 'Nicht erlaubter Absender (rechnung@) → über noreplay@ mit Antwortadresse rechnung@', { r, from: fb.from, rt: header(fb.data, 'Reply-To') });
opts.pass = 'falsch';
r = await c.post('/api/mail/test', { to: 'tobias@test.de' }, { who: 'admin' });
check(r.status === 'fehler' && /AUTH/.test(r.error), 'Falsches Postfach-Passwort wird klar gemeldet', r.error);
const ob = env.DB._sq.prepare("SELECT status, sender FROM mail_outbox ORDER BY id DESC LIMIT 1").get();
check(ob.status === 'fehler', 'Fehlversuch steht im Postausgang');

console.log('Rechnung ohne eingerichteten E-Mail-Versand');
{
  const w2 = (await import('./wk.mjs?nomail')).default;
  const env2 = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123' };
  const c2 = client(w2, env2);
  await c2.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
  check((await c2.get('/api/session', { who: 'admin' })).mailReady === false, 'Dashboard erkennt: E-Mail-Versand nicht eingerichtet');
  const o = await c2.post('/api/orgs', { name: 'Musterfirma GmbH', kind: 'einzel', zip: '49451', email: 'kunde@test.de', brands: ['Audi'] }, { who: 'admin' });
  env2.DB._sq.prepare("INSERT INTO billing_items (org_id, description, amount_net, status, created_at, updated_at) VALUES (?, 'Vermittlung Test', 49, 'offen', datetime('now'), datetime('now'))").run(o.id);
  let r2 = await c2.post('/api/acc/items/1/bill', {}, { who: 'admin' });
  const iv = env2.DB._sq.prepare('SELECT * FROM invoices WHERE id = ?').get(r2.invoiceId);
  check(r2.mail === 'nicht_konfiguriert' && /nicht eingerichtet/.test(r2.mailError) && !iv.sent_at && iv.mail_status === 'nicht_konfiguriert', 'Rechnung wird NICHT als versendet markiert, Grund wird gemeldet', { r2, sent: iv.sent_at });
  r2 = await c2.get('/api/news', { who: 'admin' });
  check(r2.notifications.some((n) => /nicht versendet/.test(n.title)), 'Buchhaltung bekommt eine Benachrichtigung');
  env2.SMTP_USER = 'noreplay@kfl-group.com'; env2.SMTP_PASS = 'Postfach-Passwort1'; opts.pass = 'Postfach-Passwort1';
  r2 = await c2.post(`/api/acc/invoices/${iv.id}/resend`, {}, { who: 'admin' });
  const iv2 = env2.DB._sq.prepare('SELECT * FROM invoices WHERE id = ?').get(iv.id);
  check(r2.mail === 'gesendet' && iv2.sent_at && iv2.mail_status === 'gesendet' && sent[sent.length - 1].to[0] === 'kunde@test.de', 'Nach Einrichtung: „Jetzt senden“ verschickt die Rechnung an die Rechnungsadresse', r2);
}
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nMAIL-TEST BESTANDEN');
