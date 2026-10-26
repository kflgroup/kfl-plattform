// Finanzbuchhaltung: Konten, Buchungen, Belegarchiv, automatische Buchungen, Abschlüsse, Anfangsbestände, Import
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check, cron, ticks } from './harness.mjs';
import fs from 'node:fs';
installFetch();
setNow('2026-10-05T09:00:00Z');
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
const pdfB64 = (txt) => Buffer.from(`%PDF-1.4\n1 0 obj << >> stream\nBT /F1 10 Tf 50 700 Td (${txt}) Tj ET\nendstream endobj\n%%EOF`).toString('base64');
const pdf = (name, txt = 'Beleg') => ({ name, type: 'application/pdf', base64: pdfB64(txt) });
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
for (const [key, role, name] of [['gf', 'gf', 'Greta GF'], ['bh', 'buchhaltung', 'Berta BH'], ['vt', 'vertrieb', 'Vera VT']]) {
  const r = await c.post('/api/users', { email: key + '@kfl.de', name, role_key: role }, { who: 'admin' });
  await c.post('/api/invite/accept', { token: r.invite.split('/').pop(), password: 'Passwort1234' }, { who: key });
}
const relogin = async () => { await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123' }, { who: 'admin' }); for (const k of ['gf', 'bh', 'vt']) await c.post('/api/login', { email: k + '@kfl.de', password: 'Passwort1234' }, { who: k }); };
const acc = (number) => q1('SELECT * FROM fibu_accounts WHERE number = ?', number);
const saldo = async (number, who = 'bh') => (await c.get('/api/fibu/accounts', { who })).accounts.find((a) => a.number === number).saldo;

console.log('Rechte und Kontenrahmen');
let r = await c.get('/api/fibu/accounts', { who: 'vt' }); check(r.status === 403, 'Vertrieb hat keinen Zugriff');
r = await c.get('/api/fibu/accounts', { who: 'bh' });
check(r.accounts.length >= 20 && r.accounts.some((a) => a.number === '1200' && a.sys === 'bank') && r.accounts.some((a) => a.number === '1776'), 'Standard-Kontenrahmen angelegt (Bank, Forderungen, USt, Vorsteuer …)');
r = await c.post('/api/fibu/accounts', { number: '4980', name: 'Betriebsbedarf', type: 'aufwand' }, { who: 'bh' }); check(r.ok, 'Buchhaltung legt Konto an');
r = await c.post('/api/fibu/accounts', { number: '4980', name: 'Doppelt' }, { who: 'bh' }); check(r.status === 409, 'Doppelte Kontonummer abgelehnt');

console.log('Anfangsbestände (Geschäftsführung)');
r = await c.post('/api/fibu/opening', { date: '2026-10-01', rows: [{ account_id: acc('1200').id, amount: '10.000,00' }] }, { who: 'bh' }); check(r.status === 403, 'Buchhaltung darf keine Anfangsbestände festlegen');
r = await c.post('/api/fibu/opening', { date: '2026-10-01', rows: [{ account_id: acc('1200').id, amount: '10.000,00' }, { account_id: acc('1000').id, amount: '250' }, { account_id: acc('0880').id, amount: '10250' }] }, { who: 'gf' });
check(r.ok && r.created === 3 && (await saldo('1200')) === 10000 && (await saldo('1000')) === 250, 'GF bucht Anfangsbestände (Bank 10.000 €, Kasse 250 €)', r);
r = await c.post('/api/fibu/opening', { date: '2026-10-01', rows: [{ account_id: acc('8400').id, amount: '5' }] }, { who: 'gf' }); check(r.status === 400, 'Keine Anfangsbestände auf Erfolgskonten');

console.log('Manuelle Buchung mit Umsatzsteuer und Beleg');
r = await c.post('/api/fibu/entries', { date: '2026-10-05', text: 'Druckerpapier', debit: acc('4930').id, credit: acc('1000').id, amount: '23,80', vat_rate: 19, file: pdf('Quittung-Papier.pdf'), doc_kind: 'quittung' }, { who: 'bh' });
check(r.ok && /^BU-2026-\d{5}$/.test(r.number) && /^BE-2026-00001$/.test(r.doc), 'Buchung BU-… mit Beleg BE-2026-00001', r);
const e1 = await c.get('/api/fibu/entries/' + r.id, { who: 'bh' });
check(e1.entry.lines.length === 3 && e1.entry.lines.find((l) => l.number === '4930').debit === 20 && e1.entry.lines.find((l) => l.number === '1576').debit === 3.8 && e1.entry.lines.find((l) => l.number === '1000').credit === 23.8, 'Aufteilung: 20,00 Aufwand + 3,80 Vorsteuer an 23,80 Kasse');
const doc1 = q1('SELECT * FROM fibu_docs WHERE number = ?', 'BE-2026-00001');
check(doc1.sha256 && doc1.sha256.length === 64 && doc1.kind === 'quittung', 'Beleg im Archiv mit Prüfsumme (SHA-256)');
r = await c.post('/api/fibu/entries', { date: '2026-10-05', text: 'Falsch', debit: acc('4930').id, credit: acc('4930').id, amount: '10' }, { who: 'bh' }); check(r.status === 400, 'Gleiches Soll- und Habenkonto abgelehnt');
r = await c.post(`/api/fibu/entries/${e1.entry.id}/reverse`, { reason: 'Falscher Betrag' }, { who: 'bh' });
check(r.ok && (await saldo('1000')) === 250 && q1('SELECT reversed_by FROM fibu_entries WHERE id = ?', e1.entry.id).reversed_by === r.id, 'Storno per Gegenbuchung, Kasse wieder 250 €, Original bleibt erhalten');
r = await c.post(`/api/fibu/entries/${e1.entry.id}/reverse`, { reason: 'nochmal' }, { who: 'bh' }); check(r.status === 409, 'Doppeltes Storno verhindert');

console.log('Eingangsrechnung auf Konto buchen');
const sup = await c.post('/api/acc/suppliers', { name: 'Werbeagentur Nord', iban: 'DE89 3704 0044 0532 0130 00' }, { who: 'bh' });
r = await c.post('/api/acc/purchase', { supplier_id: sup.id, number: 'WA-77', date: '2026-10-06', due_date: '2026-10-20', gross: '1.190,00', vat_rate: 19, account_id: acc('4600').id, text: 'Social-Media-Kampagne', file: pdf('WA-77.pdf', 'Rechnung WA-77') }, { who: 'bh' });
check(r.ok && r.booking && r.doc, 'Eingangsrechnung erfasst, gebucht und Beleg archiviert', r);
check((await saldo('4600')) === 1000 && (await saldo('1576')) === 190 && (await saldo('1600')) === 1190, 'Werbekosten 1.000 €, Vorsteuer 190 €, Verbindlichkeit 1.190 €');
const piId = r.id;
r = await c.patch(`/api/acc/purchase/${piId}`, { gross: '999' }, { who: 'bh' }); check(r.status === 409, 'Gebuchte Eingangsrechnung: Betrag nicht mehr änderbar');
r = await c.post(`/api/acc/purchase/${piId}/paid`, { date: '2026-10-10' }, { who: 'bh' });
check(r.ok && (await saldo('1600')) === 0 && (await saldo('1200')) === 8810, 'Bezahlt: Verbindlichkeit 0 €, Bank 8.810 €');
r = await c.post('/api/acc/purchase', { supplier_id: sup.id, number: 'WA-78', date: '2026-10-07', gross: '119' }, { who: 'bh' });
check(r.ok && !r.booking, 'Ohne Konto: erfasst, aber noch nicht gebucht');
r = await c.post(`/api/acc/purchase/${r.id}/book`, { account_id: acc('4964').id }, { who: 'bh' }); check(r.ok && r.booking, 'Nachträglich auf Konto gebucht');

console.log('Automatische Buchungen aus Ausgangsrechnungen und Zahlungen');
const org = (await c.post('/api/orgs', { name: 'Autohaus Fibu', kind: 'einzel', zip: '49451', email: 'info@fibu.de', brands: ['Audi'] }, { who: 'admin' })).id;
sq.prepare("INSERT INTO billing_items (org_id, description, amount_net, status, created_at, updated_at) VALUES (?, 'Vermittlung Anfrage #1001', 100, 'offen', '2026-10-05T09:00:00Z', '2026-10-05T09:00:00Z')").run(org);
r = await c.post('/api/acc/items/1/bill', {}, { who: 'bh' }); const invId = r.invoiceId;
check((await saldo('1400')) === 119 && (await saldo('8400')) === 100 && (await saldo('1776')) === 19, 'Rechnung: Forderung 119 € an Erlöse 100 € + USt 19 €');
check(q1("SELECT COUNT(*) AS n FROM fibu_docs WHERE kind = 'ausgangsrechnung'").n === 1, 'Rechnungs-PDF automatisch im Belegarchiv');
await c.post(`/api/acc/invoices/${invId}/payment`, { amount: '119', date: '2026-10-12' }, { who: 'bh' });
check((await saldo('1400')) === 0 && (await saldo('1200')) === 8929, 'Zahlungseingang: Bank an Forderungen');
sq.prepare("INSERT INTO billing_items (org_id, description, amount_net, status, created_at, updated_at) VALUES (?, 'Vermittlung Anfrage #1002', 50, 'offen', '2026-10-05T09:00:00Z', '2026-10-05T09:00:00Z')").run(org);
r = await c.post('/api/acc/items/2/bill', {}, { who: 'bh' });
await c.post(`/api/acc/invoices/${r.invoiceId}/cancel`, { reason: 'Kulanz' }, { who: 'bh' });
check((await saldo('1400')) === 0 && (await saldo('8400')) === 100, 'Stornorechnung bucht die Forderung automatisch zurück');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'fibu_fehler'").n === 0, 'Keine Fehler bei automatischen Buchungen');

console.log('Konten schließen');
r = await c.post(`/api/fibu/accounts/${acc('4980').id}/close`, { reason: 'nicht benötigt' }, { who: 'bh' }); check(r.status === 403, 'Buchhaltung darf keine Konten schließen');
r = await c.post(`/api/fibu/accounts/${acc('1200').id}/close`, {}, { who: 'gf' }); check(r.status === 409, 'Systemkonto Bank kann nicht geschlossen werden');
r = await c.post(`/api/fibu/accounts/${acc('4600').id}/close`, {}, { who: 'gf' }); check(r.status === 409 && /Saldo/.test(r.error), 'Konto mit Saldo kann nicht geschlossen werden');
r = await c.post(`/api/fibu/accounts/${acc('4980').id}/close`, { reason: 'nicht benötigt' }, { who: 'gf' }); check(r.ok && acc('4980').status === 'geschlossen', 'GF schließt leeres Konto');
r = await c.post('/api/fibu/entries', { date: '2026-10-08', text: 'Test', debit: acc('4980').id, credit: acc('1000').id, amount: '5' }, { who: 'bh' }); check(r.status === 409, 'Auf geschlossene Konten kann nicht gebucht werden');
r = await c.post(`/api/fibu/accounts/${acc('4980').id}/reopen`, {}, { who: 'gf' }); check(r.status === 403, 'Wieder öffnen nur durch Admin');
r = await c.post(`/api/fibu/accounts/${acc('4980').id}/reopen`, {}, { who: 'admin' }); check(r.ok && acc('4980').status === 'offen', 'Admin öffnet das Konto wieder');

console.log('Monatsabschluss automatisch am 1. des Folgemonats');
setNow('2026-10-31T23:30:00Z'); await relogin(); await ticks(worker, env); // 0:30 Uhr Berliner Zeit
check(!q1("SELECT id FROM fibu_periods WHERE period = '2026-10'"), 'Vor 1:00 Uhr noch kein Abschluss');
setNow('2026-11-01T00:30:00Z'); await ticks(worker, env); // 1:30 Uhr Berliner Zeit
const per = q1("SELECT * FROM fibu_periods WHERE period = '2026-10'");
const rep = JSON.parse(per.report);
check(per && per.status === 'abgeschlossen' && per.closed_by === 'System (automatisch)', 'Oktober 2026 automatisch abgeschlossen');
check(rep.income === 100 && rep.expense === 1100 && rep.result === -1000 && rep.accounts.some((a) => a.number === '1200' && a.saldo === 8929), 'Bericht: Erträge 100 €, Aufwand 1.100 €, Ergebnis −1.000 €, Bank 8.929 €', { i: rep.income, e: rep.expense, r: rep.result });
check(q1("SELECT COUNT(*) AS n FROM fibu_docs WHERE kind = 'abschluss'").n === 1, 'Abschluss-PDF im Belegarchiv');
await relogin();
r = await c.get('/api/news', { who: 'gf' }); check(r.notifications.some((n) => /Monatsabschluss Oktober 2026 liegt vor/.test(n.title)), 'Geschäftsführung bekommt den Abschluss als neue Nachricht');
r = await c.get('/api/news', { who: 'bh' }); check(!r.notifications.some((n) => /Monatsabschluss/.test(n.title)), 'Buchhaltung bekommt keine Abschluss-Nachricht');
r = await c.post('/api/fibu/entries', { date: '2026-10-20', text: 'Nachtrag', debit: acc('4930').id, credit: acc('1000').id, amount: '10' }, { who: 'bh' }); check(r.status === 409 && /abgeschlossen/.test(r.error), 'Buchungen im abgeschlossenen Monat gesperrt');
r = await c.get('/api/fibu/periods/2026-10/pdf', { who: 'gf', raw: true });
r = await c.post('/api/fibu/periods/2026-10/reopen', {}, { who: 'gf' }); check(r.status === 403, 'Wieder öffnen nur durch Admin');
r = await c.post('/api/fibu/periods/2026-10/reopen', {}, { who: 'admin' }); check(r.ok, 'Admin öffnet Oktober wieder');
r = await c.post('/api/fibu/entries', { date: '2026-10-20', text: 'Nachtrag', debit: acc('4930').id, credit: acc('1000').id, amount: '10' }, { who: 'bh' }); check(r.ok, 'Nachbuchung im wieder geöffneten Monat');
r = await c.post('/api/fibu/periods/2026-10/close', {}, { who: 'bh' }); check(r.status === 403, 'Buchhaltung darf keine Abschlüsse erstellen');
r = await c.post('/api/fibu/periods/2026-10/close', {}, { who: 'gf' }); check(r.ok && r.result === -1010, 'GF schließt Oktober erneut ab (Ergebnis −1.010 €)', r);
r = await c.post('/api/fibu/periods/2026-11/close', {}, { who: 'gf' }); check(r.status === 409, 'Laufender Monat kann noch nicht abgeschlossen werden');

console.log('Jahresabschluss am 1. Januar');
setNow('2027-01-01T02:00:00Z'); await relogin(); await ticks(worker, env);
check(q1("SELECT status FROM fibu_periods WHERE period = '2026'").status === 'abgeschlossen' && q1("SELECT status FROM fibu_periods WHERE period = '2026-12'").status === 'abgeschlossen', 'Dezember und Jahr 2026 automatisch abgeschlossen');
r = await c.get('/api/news', { who: 'gf' }); check(r.notifications.some((n) => /Jahresabschluss 2026 liegt vor/.test(n.title)), 'Jahresabschluss als neue Nachricht an die GF');
r = await c.get('/api/fibu/periods', { who: 'gf' }); check(r.years.find((y) => y.period === '2026').status === 'abgeschlossen' && r.months.find((x) => x.period === '2026-11').status === 'abgeschlossen', 'Übersicht der Abschlüsse');

console.log('Import alter Buchführung');
const csv = 'Datum;Beleg;Buchungstext;Soll;Haben;Betrag\n02.01.2027;R-100;Miete Januar;4210;1200;800,00\n03.01.2027;R-101;Büromaterial;4930;1000;12,50\nKonto;Name;Saldo';
r = await c.post('/api/fibu/import/parse', { file: { name: 'journal.csv', type: 'text/csv', base64: Buffer.from(csv).toString('base64') } }, { who: 'gf' });
check(r.ok && r.rows.length === 2 && r.rows[0].kind === 'buchung' && r.rows[0].debit === '4210' && r.rows[0].amount === 800, 'CSV-Journal erkannt (2 Buchungen)', r.rows);
await c.post('/api/fibu/docs', { kind: 'eingangsrechnung', file: pdf('R-100.pdf') }, { who: 'bh' });
r = await c.post('/api/fibu/import/commit', { mode: 'buchungen', rows: r.rows }, { who: 'gf' });
check(r.ok && r.created === 2 && (await saldo('4210', 'gf')) === 800, 'Buchungen übernommen');
check(q1("SELECT d.ref FROM fibu_entries e JOIN fibu_docs d ON d.id = e.doc_id WHERE e.text LIKE 'Miete Januar%'").ref === 'R-100', 'Beleg R-100 automatisch der Buchung zugeordnet');
// PDF mit Saldenliste (mit dem eigenen PDF-Generator erzeugt)
const fsrc = fs.readFileSync(new URL('./wk.mjs', import.meta.url), 'utf8').replace(/^const SMTP_CONNECT[^\n]*\n/, '').replace(/export default[\s\S]*$/, '');
const { renderReportPdf } = new Function(fsrc + '\nreturn { renderReportPdf };')();
const sl = renderReportPdf({ company_name: 'Alt' }, 'Summen- und Saldenliste', 'Stand 31.12.2025', [{ title: 'Konten', columns: ['Konto', 'Bezeichnung', 'Saldo', 'S/H'], widths: [60, 220, 100, 40], rows: [['1200', 'Sparkasse', '5.432,10', 'S'], ['1600', 'Verbindlichkeiten LuL', '1.234,00', 'H'], ['0880', 'Kapital', '4.198,10', 'H']] }]);
r = await c.post('/api/fibu/import/parse', { file: { name: 'saldenliste-2025.pdf', type: 'application/pdf', base64: Buffer.from(sl).toString('base64') } }, { who: 'gf' });
const sal = r.rows.filter((x) => x.kind === 'saldo');
check(r.ok && r.docId && sal.length === 3 && sal[0].number === '1200' && sal[0].amount === 5432.1 && sal[1].side === 'H', 'PDF-Saldenliste ausgelesen (3 Konten) und als Beleg archiviert', r.rows);
check(q1("SELECT COUNT(*) AS n FROM fibu_docs WHERE kind = 'import'").n === 1, 'Import-PDF im Belegarchiv');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nFIBU-TEST BESTANDEN');
