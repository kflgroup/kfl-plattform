// Rechnungs-Postfach: IMAP-Abruf (nur lesen), PDF auslesen (Workers AI / Textmuster), Lieferant zuordnen, prüfen, buchen, verwerfen
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check, cron, QMAX } from './harness.mjs';
installFetch();
setNow('2026-11-08T18:30:00Z');
const b64 = (s) => Buffer.from(s, 'latin1').toString('base64').replace(/(.{76})/g, '$1\r\n');
const pdf = (text) => `%PDF-1.4\n1 0 obj << >> stream\nTEXT:${text}\nendstream endobj\n%%EOF`;
const mime = ({ from, subject, parts }) => [`From: ${from}`, 'To: rechnung@kfl-group.com', `Subject: ${subject}`, 'Message-ID: <x@y>', 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="B1"', '', 'Vorspann',
  ...parts.flatMap((p) => ['--B1', ...p]), '--B1--', ''].join('\r\n');
const textPart = (t) => ['Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit', '', t, ''];
const pdfPart = (name, body, ct = 'application/pdf') => [`Content-Type: ${ct}; name="x.pdf"`, `Content-Disposition: attachment; filename*=utf-8''${encodeURIComponent(name)}`, 'Content-Transfer-Encoding: base64', '', b64(body), ''];
const PDF_A = pdf('KI|Werbeagentur Nord GmbH|WN-2026-118|2026-11-03|2026-11-17|500.00|95.00|595.00|19');
const PDF_B = pdf('Druckerei Süd\nRechnung Nr.: DS-4711\nRechnungsdatum: 04.11.2026\nZahlbar bis: 18.11.2026\nNetto 100,00 €\n19 % MwSt 19,00 €\nGesamtbetrag 119,00 €\nIBAN DE89 3704 0044 0532 0130 00');
const fwd = ['From: Tobias Krusch <tobias@kfl-group.com>', 'Subject: WG: Rechnung', 'Content-Type: multipart/mixed; boundary="B2"', '', '--B2', ...textPart('Weitergeleitet'), '--B2', ...pdfPart('Rechnung DS-4711.pdf', PDF_B, 'application/octet-stream'), '--B2--', ''].join('\r\n');
const BOX = {
  10: mime({ from: '"Werbeagentur Nord" <Buchhaltung@werbeagentur-nord.de>', subject: '=?UTF-8?B?' + Buffer.from('Ihre Rechnung Oktober – Übersicht').toString('base64') + '?=', parts: [textPart('Anbei die Rechnung.'), pdfPart('Rechnung Oktober.pdf', PDF_A)] }),
  11: mime({ from: 'Tobias Krusch <tobias@kfl-group.com>', subject: 'WG: Rechnung', parts: [textPart('siehe Anhang'), ['Content-Type: message/rfc822', '', fwd, '']] }),
  12: mime({ from: 'newsletter@shop.test', subject: 'Angebote der Woche', parts: [textPart('Kein Anhang')] }),
  13: mime({ from: '"Werbeagentur Nord" <buchhaltung@werbeagentur-nord.de>', subject: 'Rechnung nochmal', parts: [pdfPart('Rechnung Oktober.pdf', PDF_A)] })
};
const IMAP = { user: 'rechnung@kfl-group.com', pass: 'pw-rechnung', log: [], fail: false };
globalThis.__kflConnect = ({ hostname, port }, opts) => {
  IMAP.log.push(`CONNECT ${hostname}:${port} ${opts && opts.secureTransport}`);
  const enc = new TextEncoder(), dec = new TextDecoder();
  let push; const readable = new ReadableStream({ start(c) { push = (s) => c.enqueue(typeof s === 'string' ? enc.encode(s) : s); push('* OK [CAPABILITY IMAP4rev1] IONOS IMAP ready\r\n'); } });
  let buf = '';
  const uids = () => Object.keys(BOX).map(Number).sort((a, b) => a - b);
  const handle = () => {
    let i; while ((i = buf.indexOf('\r\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      const [tag, ...rest] = line.split(' '); const c = rest.join(' ');
      IMAP.log.push(c.startsWith('LOGIN') ? 'LOGIN' : c);
      if (c.startsWith('LOGIN')) { const m = c.match(/^LOGIN "(.*)" "(.*)"$/); push(m && m[1] === IMAP.user && m[2] === IMAP.pass ? `${tag} OK LOGIN completed\r\n` : `${tag} NO [AUTHENTICATIONFAILED] Authentication failed\r\n`); }
      else if (c === 'SELECT INBOX') push(`* ${uids().length} EXISTS\r\n* OK [UIDVALIDITY 777] UIDs valid\r\n${tag} OK [READ-WRITE] SELECT completed\r\n`);
      else if (/^UID SEARCH SINCE/.test(c)) push(`* SEARCH ${uids().join(' ')}\r\n${tag} OK SEARCH completed\r\n`);
      else if (/^UID SEARCH UID (\d+):\*/.test(c)) { const n = +c.match(/(\d+):\*/)[1]; const l = uids().filter((u) => u >= n); push(`* SEARCH ${(l.length ? l : [uids().pop()]).join(' ')}\r\n${tag} OK SEARCH completed\r\n`); }
      else if (/^UID FETCH (\d+) \(RFC822\.SIZE\)/.test(c)) { const u = +c.match(/FETCH (\d+)/)[1]; push(`* 1 FETCH (UID ${u} RFC822.SIZE ${Buffer.byteLength(BOX[u], 'latin1')})\r\n${tag} OK FETCH completed\r\n`); }
      else if (/^UID FETCH (\d+) \(BODY\.PEEK\[\]\)/.test(c)) { const u = +c.match(/FETCH (\d+)/)[1]; const raw = Buffer.from(BOX[u], 'latin1'); push(`* 1 FETCH (UID ${u} BODY[] {${raw.length}}\r\n`); push(new Uint8Array(raw)); push(`)\r\n${tag} OK FETCH completed\r\n`); }
      else if (c === 'LOGOUT') push(`* BYE\r\n${tag} OK LOGOUT completed\r\n`);
      else push(`${tag} BAD unknown\r\n`);
    }
  };
  const writable = new WritableStream({ write(chunk) { buf += dec.decode(chunk); handle(); } });
  return { readable, writable, close() {} };
};
// Workers AI: Markdown-Umwandlung liefert den Text aus der PDF; das Sprachmodell versteht nur Rechnungen mit „KI|…“
const AI = { runs: 0, conv: 0 };
const ai = {
  async toMarkdown(doc, opt) { AI.conv++; const s = Buffer.from(await doc.blob.arrayBuffer()).toString('latin1'); const t = (s.match(/TEXT:([\s\S]*?)\nendstream/) || [])[1]; return { name: doc.name, format: t ? (opt && opt.conversionOptions && opt.conversionOptions.output.format) : 'error', data: t || 'kaputt' }; },
  async run(model, inp) {
    AI.runs++; AI.model = model; const t = inp.messages[1].content;
    if (!t.startsWith('KI|')) throw new Error('JSON Mode couldn\'t be met');
    const [, name, nr, date, due, net, vat, gross, rate] = t.split('|');
    return { response: { supplier_name: name, invoice_number: nr, invoice_date: date, due_date: due, net: +net, vat: +vat, gross: +gross, vat_rate: +rate, description: 'Social-Media-Kampagne Oktober' } };
  }
};
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo', AI: ai };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
for (const [key, role, name] of [['bh', 'buchhaltung', 'Berta BH'], ['vt', 'vertrieb', 'Vera VT'], ['gf', 'gf', 'Greta GF']]) {
  const r = await c.post('/api/users', { email: key + '@kfl.de', name, role_key: role }, { who: 'admin' });
  await c.post('/api/invite/accept', { token: r.invite.split('/').pop(), password: 'Passwort1234' }, { who: key });
}
await c.post('/api/acc/suppliers', { name: 'Werbeagentur Nord GmbH', email: 'buchhaltung@werbeagentur-nord.de' }, { who: 'bh' });
await c.post('/api/acc/suppliers', { name: 'Druckerei Süd', iban: 'DE89 3704 0044 0532 0130 00' }, { who: 'bh' });
const pi = (sql = '1=1', ...a) => qa(`SELECT * FROM purchase_invoices WHERE ${sql} ORDER BY id`, ...a);

console.log('Ohne Passwort');
let r = await c.post('/api/acc/inbox/run', {}, { who: 'bh' });
check(r.ok && /Passwort fehlt/.test(r.result) && /SMTP_PASS_RECHNUNG/.test(r.result), 'Meldet die fehlende Cloudflare-Variable SMTP_PASS_RECHNUNG', r.result);
r = await c.get('/api/acc/purchase', { who: 'bh' });
check(r.inbox && r.inbox.address === 'rechnung@kfl-group.com' && r.inbox.password === false && r.inbox.ai === true, 'Eingangsrechnungen zeigen den Postfach-Status');
r = await c.post('/api/acc/inbox/run', {}, { who: 'vt' }); check(r.status === 403, 'Vertrieb darf das Postfach nicht abrufen');

console.log('Abruf und Auslesen per KI');
env.SMTP_PASS_RECHNUNG = 'pw-rechnung';
r = await c.post('/api/acc/inbox/run', {}, { who: 'bh' });
check(r.ok && /^1 importiert/.test(r.result), 'Erste E-Mail übernommen', r.result);
check(IMAP.log.includes('CONNECT imap.ionos.de:993 on') && IMAP.log.some((l) => /^UID SEARCH SINCE 25-Oct-2026/.test(l)), 'IONOS-IMAP über TLS, erster Abruf ab 14 Tagen');
let a = pi()[0];
check(a && a.status === 'pruefen' && a.source === 'postfach' && a.number === 'WN-2026-118' && a.date === '2026-11-03' && a.due_date === '2026-11-17' && a.gross === 595 && a.net === 500 && a.vat === 95 && a.vat_rate === 19, 'Rechnungsdaten ausgelesen: Nummer, Datum, Fälligkeit, Netto, USt, Brutto', a);
check(q1('SELECT name FROM suppliers WHERE id = ?', a.supplier_id).name === 'Werbeagentur Nord GmbH' && qa('SELECT id FROM suppliers').length === 2, 'Lieferant über die Absenderadresse erkannt (Groß-/Kleinschreibung egal), nicht doppelt angelegt');
check(a.file_id && q1('SELECT name, mime FROM files WHERE id = ?', a.file_id).name === 'Rechnung Oktober.pdf' && /Übersicht/.test(a.note) && a.text === 'Social-Media-Kampagne Oktober', 'PDF mit Dateinamen gespeichert, Betreff (codiert) und Buchungstext übernommen');
check(JSON.parse(a.extract).method === 'ki' && AI.model === '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Auslesen mit Workers AI');
const newsTo = (title) => qa("SELECT u.role_key AS r FROM notifications n JOIN users u ON u.id = n.recipient_id WHERE n.recipient_type = 'staff' AND n.title = ?", title).map((x) => x.r).sort().join(',');
check(newsTo('Neue Eingangsrechnung zu prüfen') === 'admin,buchhaltung,gf', 'News an Buchhaltung, Geschäftsführung und Admin, nicht an den Vertrieb', newsTo('Neue Eingangsrechnung zu prüfen'));
r = await c.get('/api/news', { who: 'bh' }); check(r.notifications.some((x) => x.title === 'Neue Eingangsrechnung zu prüfen' && x.link === '#/buchhaltung/eingang?status=pruefen'), 'Erscheint unter News der Buchhaltung mit Link zu den zu prüfenden Rechnungen');
check(QMAX.n <= 50, 'Innerhalb der Abfragegrenze je Aufruf', QMAX);

console.log('Weitergeleitete E-Mail, Auslesen per Textmuster');
r = await c.post('/api/acc/inbox/run', {}, { who: 'bh' });
const b = pi()[1];
check(/^1 importiert/.test(r.result) && b && b.number === 'DS-4711' && b.date === '2026-11-04' && b.due_date === '2026-11-18' && b.gross === 119 && b.vat_rate === 19 && b.net === 100, 'PDF aus weitergeleiteter E-Mail (octet-stream) per Textmuster gelesen', b);
check(q1('SELECT name FROM suppliers WHERE id = ?', b.supplier_id).name === 'Druckerei Süd' && JSON.parse(b.extract).method === 'text', 'Lieferant über die IBAN erkannt (nicht der Weiterleitende)');

console.log('Ohne Anhang, doppelte PDF, nur lesen');
r = await c.post('/api/acc/inbox/run', {}, { who: 'bh' }); check(/^0 importiert, 1 übersprungen/.test(r.result), 'E-Mail ohne PDF übersprungen', r.result);
r = await c.post('/api/acc/inbox/run', {}, { who: 'bh' }); check(/^0 importiert, 1 übersprungen/.test(r.result) && pi().length === 2, 'Gleiche PDF nicht doppelt angelegt', r.result);
r = await c.post('/api/acc/inbox/run', {}, { who: 'bh' }); check(r.result === '0 importiert', 'Keine neuen E-Mails', r.result);
check(!IMAP.log.some((l) => /STORE|EXPUNGE|COPY|MOVE|DELETE/.test(l)) && IMAP.log.filter((l) => /FETCH \d+ \(BODY\.PEEK/.test(l)).length === 4, 'Postfach wird nur gelesen (BODY.PEEK, kein Verschieben oder Löschen)');
BOX[14] = mime({ from: 'info@neu-lieferant.test', subject: 'Rechnung', parts: [pdfPart('R.pdf', pdf('KI|Neu GmbH|N-1|2026-11-05|2026-11-19|10.00|1.90|11.90|19'))] });
await cron(worker, env);
check(pi().length === 2, 'Cron wartet 10 Minuten seit dem letzten Abruf');
setNow('2026-11-08T18:41:00Z'); for (let i = 0; i < 6; i++) await cron(worker, env);
const n = pi()[2];
check(n && n.number === 'N-1' && q1('SELECT name, email, note FROM suppliers WHERE id = ?', n.supplier_id).name === 'Neu GmbH' && JSON.parse(n.extract).supplier_created, 'Cron holt neue E-Mail, unbekannter Lieferant wird angelegt und markiert');

console.log('Prüfen, übernehmen und buchen');
r = await c.post(`/api/acc/purchase/${a.id}/paid`, {}, { who: 'bh' }); check(r.status === 409, 'Ungeprüfte Rechnung kann nicht bezahlt werden');
r = await c.post(`/api/acc/purchase/${a.id}/schedule`, {}, { who: 'bh' }); check(r.status === 409, 'Ungeprüfte Rechnung kann nicht zur Zahlung vorgemerkt werden');
const acc = q1("SELECT id FROM fibu_accounts WHERE number = '4600'") || q1("SELECT id FROM fibu_accounts WHERE type = 'aufwand' ORDER BY number LIMIT 1");
r = await c.patch('/api/acc/purchase/' + a.id, { number: 'WN-2026-118', gross: '595,00', vat_rate: '19', net: '', vat: '', text: 'Kampagne Oktober' }, { who: 'bh' }); check(r.ok, 'Werte korrigierbar');
r = await c.post(`/api/acc/purchase/${a.id}/confirm`, { account_id: acc.id }, { who: 'bh' });
a = pi('id = ?', a.id)[0];
check(r.ok && r.booking && a.status === 'offen' && a.entry_id && a.net === 500 && a.vat === 95, 'Übernommen und auf Konto gebucht (Aufwand + Vorsteuer an Verbindlichkeiten)', r);
r = await c.post(`/api/acc/purchase/${a.id}/confirm`, {}, { who: 'bh' }); check(r.status === 409, 'Nicht zweimal übernehmen');
sq.prepare("UPDATE purchase_invoices SET number = NULL WHERE id = ?").run(n.id);
r = await c.post(`/api/acc/purchase/${n.id}/confirm`, {}, { who: 'bh' }); check(r.status === 400, 'Ohne Rechnungsnummer keine Übernahme');
sq.prepare("UPDATE purchase_invoices SET number = 'WN-2026-118', supplier_id = ? WHERE id = ?").run(a.supplier_id, n.id);
r = await c.post(`/api/acc/purchase/${n.id}/confirm`, {}, { who: 'bh' }); check(r.status === 409 && /doppelt/.test(r.error), 'Doppelte Rechnungsnummer beim Lieferanten wird erkannt');

console.log('Verwerfen');
r = await c.post(`/api/acc/purchase/${n.id}/discard`, { reason: '' }, { who: 'bh' }); check(r.status === 400, 'Grund ist Pflicht');
r = await c.post(`/api/acc/purchase/${n.id}/discard`, { reason: 'doppelt' }, { who: 'bh' });
check(r.ok && pi('id = ?', n.id)[0].status === 'verworfen' && /Verworfen von Berta BH: doppelt/.test(pi('id = ?', n.id)[0].note), 'Verworfen mit Grund, nicht gelöscht');
r = await c.get('/api/acc/purchase', { who: 'bh' });
check(!r.invoices.some((x) => x.id === n.id) && r.invoices[0].status === 'pruefen', 'Verworfene ausgeblendet, zu prüfende stehen oben');
r = await c.get('/api/acc/purchase?status=verworfen', { who: 'bh' }); check(r.invoices.length === 1, 'Verworfene über den Filter sichtbar');
r = await c.post(`/api/acc/purchase/${a.id}/discard`, { reason: 'test' }, { who: 'bh' }); check(r.status === 409, 'Geprüfte Rechnung kann nicht verworfen werden');

console.log('News werden nach der Prüfung als gelesen markiert');
check(q1("SELECT COUNT(*) AS n FROM notifications WHERE link = '#/buchhaltung/eingang?status=pruefen' AND read_at IS NULL").n > 0, 'Solange Rechnungen offen sind, bleiben die News ungelesen');
r = await c.post(`/api/acc/purchase/${b.id}/confirm`, {}, { who: 'bh' });
check(r.ok && q1("SELECT COUNT(*) AS n FROM notifications WHERE link = '#/buchhaltung/eingang?status=pruefen' AND read_at IS NULL").n === 0, 'Letzte Rechnung geprüft → News für alle gelesen');

console.log('Störung');
IMAP.pass = 'neu'; setNow('2026-11-08T19:00:00Z');
r = await c.post('/api/acc/inbox/run', {}, { who: 'bh' });
check(/^Fehler: Anmeldung am Rechnungs-Postfach fehlgeschlagen/.test(r.result) && r.inbox.ok === false, 'Falsches Passwort wird verständlich gemeldet', r.result);
check(newsTo('Rechnungs-Postfach nicht erreichbar') === 'admin,buchhaltung,gf', 'Störungsmeldung an Buchhaltung, Geschäftsführung und Admin');
r = await c.patch('/api/settings', { invoice_inbox: 'kein-mail' }, { who: 'admin' }); check(r.status === 400, 'Ungültige Postfach-Adresse abgelehnt');
