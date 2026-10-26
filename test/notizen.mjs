// Notizen: Buchhaltung an Rechnungen und Abrechnungsfällen, Vertrieb heftet Anfrage-Notizen für die Buchhaltung an
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check } from './harness.mjs';
installFetch();
setNow('2026-11-02T09:00:00Z');
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
for (const [key, role, name] of [['gf', 'gf', 'Greta GF'], ['bh', 'buchhaltung', 'Berta BH'], ['vt', 'vertrieb', 'Vera Vertrieb']]) {
  const r = await c.post('/api/users', { email: key + '@kfl.de', name, role_key: role }, { who: 'admin' });
  await c.post('/api/invite/accept', { token: r.invite.split('/').pop(), password: 'Passwort1234' }, { who: key });
}
const org = (await c.post('/api/orgs', { name: 'Notiz GmbH', kind: 'einzel', zip: '49451', email: 'info@notiz.de', brands: ['Audi'] }, { who: 'admin' })).id;
sq.prepare("INSERT INTO requests (type, status, customer_name, brand, model, vehicle, data, created_at, updated_at) VALUES ('deal', 'kontaktdaten_versendet', 'Kim Kunde', 'Audi', 'A3', 'Audi A3', '{}', '2026-11-01T10:00:00Z', '2026-11-01T10:00:00Z')").run();
sq.prepare("INSERT INTO billing_items (org_id, request_id, description, amount_net, status, created_at, updated_at) VALUES (?, 1, 'Vermittlung Anfrage #1001', 49, 'offen', '2026-11-02T09:00:00Z', '2026-11-02T09:00:00Z')").run(org);

console.log('Vertrieb: Notiz an der Anfrage für die Buchhaltung anheften');
let r = await c.post('/api/requests/1001/notes', { text: 'Kunde zahlt erst nach Lieferung, bitte Rechnung zurückhalten.', acc_relevant: true }, { who: 'vt' });
check(r.ok && q1('SELECT acc_relevant, acc_marked_by FROM notes WHERE id = 1').acc_relevant === 1, 'Vertrieb speichert Notiz mit „für die Buchhaltung relevant“', r);
await c.post('/api/requests/1001/notes', { text: 'Rückruf vereinbart.' }, { who: 'vt' });
r = await c.post('/api/requests/1001/notes/2/acc', { relevant: true }, { who: 'vt' });
check(r.ok && q1('SELECT acc_relevant FROM notes WHERE id = 2').acc_relevant === 1, 'Vertrieb markiert eine bestehende Notiz nachträglich');
r = await c.post('/api/requests/1001/notes/2/acc', { relevant: false }, { who: 'vt' });
check(r.status === 403, 'Vertrieb kann die Markierung nicht wieder entfernen (dauerhaft angeheftet)');
r = await c.post('/api/requests/1001/notes/2/acc', { relevant: false }, { who: 'admin' });
check(r.ok && q1('SELECT acc_relevant FROM notes WHERE id = 2').acc_relevant === 0, 'Admin kann die Markierung aufheben');

console.log('Buchhaltung: Notizen am Abrechnungsfall');
r = await c.get('/api/acc/items/1', { who: 'bh' });
check(r.notes.length === 1 && r.notes[0].kind === 'vertrieb' && /zurückhalten/.test(r.notes[0].text) && r.notes[0].author_name === 'Vera Vertrieb', 'Angeheftete Vertriebsnotiz erscheint am Fall (mit Autor)', r.notes);
r = await c.post('/api/acc/items/1/notes', { text: 'Mit Partner telefoniert, Rechnung erst im Dezember.' }, { who: 'bh' });
check(r.ok, 'Buchhaltung schreibt Notiz zum Fall');
r = await c.get('/api/acc/items', { who: 'gf' });
check(r.items[0].notes_n === 2 && r.items[0].pinned_n === 1, 'Liste zeigt 2 Notizen, davon 1 vom Vertrieb', r.items[0]);
r = await c.post('/api/acc/items/1/notes', { text: 'Test' }, { who: 'vt' });
check(r.status === 403, 'Vertrieb kann keine Notizen in der Buchhaltung schreiben');
r = await c.get('/api/acc/items/1', { who: 'vt' });
check(r.status === 403, 'Vertrieb sieht die Buchhaltung nicht');

console.log('Rechnung: Notizen und angeheftete Notizen');
r = await c.post('/api/acc/items/1/bill', {}, { who: 'bh' });
const inv = r.invoiceId;
r = await c.post(`/api/acc/invoices/${inv}/notes`, { text: 'Zahlung telefonisch zugesagt bis 15.11.' }, { who: 'gf' });
check(r.ok, 'Geschäftsführung schreibt Notiz zur Rechnung');
r = await c.post(`/api/acc/invoices/${inv}/notes`, { text: '' }, { who: 'admin' });
check(r.status === 400, 'Leere Notiz wird abgelehnt');
r = await c.get(`/api/acc/invoices/${inv}`, { who: 'bh' });
const kinds = r.notes.map((n) => n.kind);
check(kinds[0] === 'vertrieb' && kinds.includes('rechnung') && kinds.includes('fall') && r.notes.length === 3, 'Rechnung zeigt Vertriebsnotiz (oben), Rechnungsnotiz und Fallnotiz', kinds);
r = await c.get('/api/acc/invoices', { who: 'bh' });
check(r.invoices.find((x) => x.id === inv).notes_n === 3, 'Rechnungsliste zeigt Anzahl der Notizen');
r = await c.post('/api/acc/items/1/cancel', { reason: 'Kunde vom Kauf zurückgetreten' }, { who: 'bh' });
r = await c.get('/api/acc/items/1', { who: 'admin' });
check(r.notes.some((n) => n.kind === 'vertrieb'), 'Nach Storno bleibt die Vertriebsnotiz am Fall angeheftet');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action IN ('buchhaltung_notiz', 'notiz_buchhaltung')").n === 4, 'Notizen werden protokolliert');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nNOTIZEN-TEST BESTANDEN');
