// Storno von Abrechnungsfällen (Buchhaltung): Rechte, offene Fälle, Sammelablage, Einzel- und Sammelrechnung
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check } from './harness.mjs';
installFetch();
setNow('2026-11-03T09:00:00Z');

console.log('Storno: Rechte-Ergänzung für bestehende Rollen (Live-Datenbank)');
{
  const old = makeD1();
  old._sq.exec("CREATE TABLE roles (key TEXT PRIMARY KEY, name TEXT NOT NULL, perms TEXT NOT NULL, builtin INTEGER NOT NULL DEFAULT 0)");
  for (const [k, p] of [['gf', ['acc_view', 'acc_manage']], ['buchhaltung', ['acc_view', 'acc_manage']], ['teamleitung', ['req_view']], ['vertrieb', ['req_view']]]) old._sq.prepare('INSERT INTO roles VALUES (?, ?, ?, 1)').run(k, k, JSON.stringify(p));
  const w0 = (await import('./wk.mjs?alt')).default;
  await client(w0, { DB: old, FILES: makeR2(), FORM_SECRET: SECRET }).get('/api/session');
  const perms = (k) => JSON.parse(old._sq.prepare('SELECT perms FROM roles WHERE key = ?').get(k).perms);
  check(perms('gf').includes('acc_cancel') && perms('buchhaltung').includes('acc_cancel'), 'Geschäftsführung und Buchhaltung erhalten „stornieren“');
  check(!perms('teamleitung').includes('acc_cancel') && !perms('vertrieb').includes('acc_cancel'), 'Teamleitung und Vertrieb nicht');
  check(perms('admin').includes('acc_cancel'), 'Admin hat alle Rechte');
  old._sq.prepare('UPDATE roles SET perms = ? WHERE key = ?').run(JSON.stringify(['acc_view']), 'buchhaltung');
}

const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env);
const q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
for (const [key, role] of [['gf', 'gf'], ['tl', 'teamleitung'], ['bh', 'buchhaltung']]) {
  const r = await c.post('/api/users', { email: key + '@kfl.de', name: key.toUpperCase() + ' Mitarbeiter', role_key: role }, { who: 'admin' });
  await c.post('/api/invite/accept', { token: r.invite.split('/').pop(), password: 'Passwort1234' }, { who: key });
}
const perms = async (who) => (await c.get('/api/session', { who })).user.perms;
console.log('Storno: wer darf?');
check((await perms('admin')).includes('acc_cancel') && (await perms('gf')).includes('acc_cancel') && (await perms('bh')).includes('acc_cancel'), 'Admin, Geschäftsführung, Buchhaltung haben das Recht');
check(!(await perms('tl')).includes('acc_cancel'), 'Teamleitung hat es nicht');

const org = (await c.post('/api/orgs', { name: 'Autohaus Storno GmbH', kind: 'organisation', zip: '49451', email: 'info@storno.de', billing_email: 'rechnung@storno.de', brands: ['Audi'] }, { who: 'admin' })).id;
const orgM = (await c.post('/api/orgs', { name: 'Monatszahler GmbH', kind: 'organisation', zip: '49451', email: 'info@monat.de', billing_email: 'rechnung@monat.de', brands: ['Audi'], billing_mode: 'monatlich' }, { who: 'admin' })).id;
sq.prepare("UPDATE orgs SET billing_mode = 'monatlich' WHERE id = ?").run(orgM);
const item = (o, n, amount = 49) => Number(sq.prepare("INSERT INTO billing_items (org_id, description, amount_net, status, created_at, updated_at) VALUES (?, ?, ?, 'offen', '2026-11-02T10:00:00Z', '2026-11-02T10:00:00Z')").run(o, 'Vermittlung Test ' + n, amount).lastInsertRowid);

console.log('Storno: offener Fall');
const i1 = item(org, 1);
let r = await c.post(`/api/acc/items/${i1}/cancel`, { reason: 'Kunde hat nicht gekauft' }, { who: 'tl' });
check(r.status === 403, 'Teamleitung darf nicht stornieren', r.status);
r = await c.post(`/api/acc/items/${i1}/cancel`, { reason: '' }, { who: 'bh' });
check(r.status === 400, 'Ohne Grund kein Storno');
r = await c.post(`/api/acc/items/${i1}/cancel`, { reason: 'Kunde hat nicht gekauft' }, { who: 'bh' });
let it = q1('SELECT * FROM billing_items WHERE id = ?', i1);
check(r.ok && it.status === 'storniert' && it.cancel_reason === 'Kunde hat nicht gekauft' && it.cancelled_by === 'BH Mitarbeiter', 'Buchhaltung storniert offenen Fall mit Grund', it);
r = await c.post(`/api/acc/items/${i1}/bill`, {}, { who: 'bh' });
check(r.status === 409, 'Stornierter Fall kann nicht abgerechnet werden');
r = await c.get('/api/acc/items', { status: 'storniert' }, { who: 'bh' });
r = await c.get('/api/acc/items?status=storniert', { who: 'bh' });
check(r.items.length === 1 && r.items[0].id === i1, 'Liste „Storniert“ zeigt den Fall');
r = await c.get('/api/acc/overview', { who: 'bh' });
check(r.cases.open === 0 && r.cases.cancelled === 1, 'Übersicht: nicht mehr offen, 1 storniert', r.cases);
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'fall_storniert'").n === 1, 'Storno im Protokoll');
r = await c.post(`/api/acc/items/${i1}/reopen`, {}, { who: 'gf' });
check(r.ok && q1('SELECT status FROM billing_items WHERE id = ?', i1).status === 'offen', 'Geschäftsführung hebt das Storno auf → wieder offen');

console.log('Storno: Fall in der Sammelablage');
const m1 = item(orgM, 'M1');
await c.post(`/api/acc/items/${m1}/bill`, {}, { who: 'bh' });
r = await c.post(`/api/acc/items/${m1}/cancel`, { reason: 'Doppelt erfasst' }, { who: 'admin' });
check(r.ok && q1('SELECT status FROM billing_items WHERE id = ?', m1).status === 'storniert', 'Admin storniert Fall aus der Sammelablage');
await c.post(`/api/acc/items/${m1}/reopen`, {}, { who: 'bh' });
check(q1('SELECT status FROM billing_items WHERE id = ?', m1).status === 'gesammelt', 'Aufheben → zurück in die Sammelablage');

console.log('Storno: abgerechneter Fall (Einzelrechnung)');
r = await c.post(`/api/acc/items/${i1}/bill`, {}, { who: 'bh' });
const inv1 = q1('SELECT * FROM invoices WHERE id = ?', r.invoiceId);
check(inv1 && inv1.status === 'offen', 'Einzelrechnung erstellt', inv1);
r = await c.post(`/api/acc/items/${i1}/cancel`, { reason: 'Kulanz' }, { who: 'bh' });
const sto = q1('SELECT * FROM invoices WHERE id = ?', r.stornoInvoiceId);
check(r.ok && r.stornoNumber && sto.kind === 'storno' && sto.gross === -inv1.gross, 'Stornorechnung mit Minusbetrag erstellt', { r, sto });
check(q1('SELECT status FROM invoices WHERE id = ?', inv1.id).status === 'storniert' && q1('SELECT status FROM billing_items WHERE id = ?', i1).status === 'storniert', 'Rechnung und Fall storniert');

console.log('Storno: ein Fall aus einer Sammelrechnung');
const m2 = item(orgM, 'M2', 59), m3 = item(orgM, 'M3', 69);
for (const id of [m2, m3]) await c.post(`/api/acc/items/${id}/bill`, {}, { who: 'bh' });
await c.post('/api/jobs/run', { job: 'monat' }, { who: 'admin' });
const sam = q1("SELECT * FROM invoices WHERE kind = 'sammel' ORDER BY id DESC LIMIT 1");
check(sam && sam.net === 177, 'Sammelrechnung über 3 Fälle (177 € netto)', sam);
r = await c.post(`/api/acc/items/${m2}/cancel`, { reason: 'Kunde vom Kauf zurückgetreten' }, { who: 'gf' });
const neu = q1('SELECT * FROM invoices WHERE id = ?', r.newInvoiceId);
check(r.ok && r.rebilled === 2 && neu.kind === 'sammel' && neu.net === 118 && /Ersetzt/.test(neu.note), 'Korrigierte Sammelrechnung über die 2 übrigen Fälle (118 € netto)', { r, neu });
check(qa('SELECT status, invoice_id FROM billing_items WHERE id IN (?, ?)', m1, m3).every((x) => x.status === 'abgerechnet' && x.invoice_id === neu.id), 'Übrige Fälle hängen an der neuen Rechnung');
check(q1('SELECT status FROM invoices WHERE id = ?', sam.id).status === 'storniert', 'Alte Sammelrechnung storniert');

console.log('Storno: bezahlte Rechnung');
await c.post(`/api/acc/invoices/${neu.id}/payment`, { amount: String(neu.gross).replace('.', ',') }, { who: 'bh' });
r = await c.post(`/api/acc/items/${m3}/cancel`, { reason: 'Test' }, { who: 'bh' });
check(r.status === 409 && /Zahlungen/.test(r.error), 'Bezahlte Rechnung: Storno abgelehnt mit Hinweis', r);
check(q1('SELECT status FROM billing_items WHERE id = ?', m3).status === 'abgerechnet', 'Fall bleibt unverändert');

console.log('Storno: Rechnung direkt stornieren');
const i4 = item(org, 4); r = await c.post(`/api/acc/items/${i4}/bill`, {}, { who: 'bh' });
const sub = { reason: 'Falscher Empfänger' };
check((await c.post(`/api/acc/invoices/${r.invoiceId}/cancel`, sub, { who: 'tl' })).status === 403, 'Teamleitung darf Rechnungen nicht stornieren');
sq.prepare('UPDATE users SET revoked_perms = ? WHERE email = ?').run(JSON.stringify(['acc_cancel']), 'bh@kfl.de');
check((await c.post(`/api/acc/invoices/${r.invoiceId}/cancel`, sub, { who: 'bh' })).status === 403, 'Ohne Recht „stornieren“ (vom Admin entzogen) kein Rechnungs-Storno');
sq.prepare("UPDATE users SET revoked_perms = '[]' WHERE email = ?").run('bh@kfl.de');
check((await c.post(`/api/acc/invoices/${r.invoiceId}/cancel`, sub, { who: 'bh' })).ok, 'Buchhaltung storniert Rechnung');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nSTORNO-TEST BESTANDEN');
