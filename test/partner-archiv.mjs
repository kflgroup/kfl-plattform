// Support-Tickets der Partner: erledigt → 30 Tage im Partner-Archiv → danach nur noch im internen Backup-Archiv
import { makeD1, makeR2, installFetch, SECRET, setNow, advance, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-09T10:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);

await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
const org = (await c.post('/api/orgs', { name: 'Autohaus Alpha', kind: 'organisation', zip: '49074', city: 'Osnabrück', email: 'info@alpha.de', brands: ['Audi'] }, { who: 'admin' })).id;
const pu = await c.post(`/api/orgs/${org}/users`, { email: 'max@alpha.de', name: 'Max Alpha', role: 'gf' }, { who: 'admin' });
const inv = await c.post(`/api/orgs/${org}/users/${pu.id}/invite`, {}, { who: 'admin' });
await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345!', agb: true, privacy: true }, { who: 'p' });

const relog = async () => { await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123!' }, { who: 'admin' }); await c.post('/papi/login', { email: 'max@alpha.de', password: 'Partner12345!' }, { who: 'p' }); };
console.log('Partner-Archiv für erledigte Support-Tickets');
const t1 = (await c.post('/papi/tickets', { subject: 'Frage zur Rechnung', category: 'Rechnung', text: 'Hallo KFL' }, { who: 'p' })).id;
const t2 = (await c.post('/papi/tickets', { subject: 'Zugang für neuen Kollegen', category: 'Konto und Zugang', text: 'Bitte anlegen' }, { who: 'p' })).id;
await c.post(`/api/tickets/${t1}/reply`, { text: 'Erledigt, danke!' }, { who: 'admin' });
let r = await c.patch('/api/tickets/' + t1, { status: 'erledigt' }, { who: 'admin' });
check(r.ok, 'Ticket intern erledigt', r);
r = await c.get('/papi/tickets', { who: 'p' });
const a1 = r.tickets.find((t) => t.id === t1);
check(r.archive_days === 30 && a1 && a1.status === 'erledigt' && a1.archive_until && r.tickets.find((t) => t.id === t2 && !t.archive_until), 'Erledigtes Ticket liegt im Partner-Archiv (mit Frist), offenes Ticket bleibt aktuell', r);
check(Math.round((Date.parse(a1.archive_until) - Date.parse('2026-11-09T10:00:00Z')) / 864e5) === 30, 'Archivfrist 30 Tage');
r = await c.get('/papi/tickets/' + t1, { who: 'p' }); check(r.ok && r.messages.length >= 2 && r.ticket.archive_until, 'Archiviertes Ticket bleibt lesbar');
r = await c.post(`/papi/tickets/${t1}/reply`, { text: 'Noch was' }, { who: 'p' }); check(r.status === 409 && /Archiv/.test(r.error), 'Im Archiv keine Antwort mehr möglich', r);

advance(24 * 12);
await relog(); await c.post('/api/jobs/run', { job: 'support' }, { who: 'admin' });
check(q1("SELECT COUNT(*) AS n FROM archive WHERE kind = 'ticket' AND ref_id = ?", t1).n === 1, 'Nach 10 Tagen: Kopie im internen Backup-Archiv');
r = await c.get('/papi/tickets', { who: 'p' }); check(r.tickets.some((t) => t.id === t1), 'Partner sieht es nach 12 Tagen weiterhin im Archiv');

advance(24 * 19);
await relog(); await c.post('/api/jobs/run', { job: 'support' }, { who: 'admin' });
const tk = q1('SELECT * FROM tickets WHERE id = ?', t1);
check(tk.partner_hidden_at && tk.archived_at, 'Nach 30 Tagen beim Partner entfernt');
r = await c.get('/papi/tickets', { who: 'p' }); check(!r.tickets.some((t) => t.id === t1) && r.tickets.some((t) => t.id === t2), 'Partner-Liste ohne das alte Ticket, offenes bleibt');
r = await c.get('/papi/tickets/' + t1, { who: 'p' }); check(r.status === 404, 'Detail für den Partner nicht mehr abrufbar');
const arch = q1("SELECT * FROM archive WHERE kind = 'ticket' AND ref_id = ?", t1), data = JSON.parse(arch.data);
check(q1("SELECT COUNT(*) AS n FROM archive WHERE kind = 'ticket' AND ref_id = ?", t1).n === 1 && data.messages.length >= 2 && data.ticket.partner_hidden_at && arch.expires_at && Math.abs((Date.parse(arch.expires_at) - globalThis.__KFL_NOW) / 86400e3 / 365 - 3) < 0.2, 'Intern im Backup-Archiv mit vollem Verlauf (Löschung nach 3 Jahren, Verjährungsfrist)', arch.expires_at);

// Ticket, das nie ins interne Archiv lief (z. B. längere interne Frist) → wird spätestens jetzt gesichert
await c.patch('/api/settings', { support_archive_days: 60 }, { who: 'admin' });
await c.patch('/api/tickets/' + t2, { status: 'erledigt' }, { who: 'admin' });
advance(24 * 31);
await relog(); await c.post('/api/jobs/run', { job: 'support' }, { who: 'admin' });
check(q1('SELECT partner_hidden_at FROM tickets WHERE id = ?', t2).partner_hidden_at && q1("SELECT COUNT(*) AS n FROM archive WHERE kind = 'ticket' AND ref_id = ?", t2).n === 1, 'Auch bei längerer interner Frist: Backup-Kopie beim Entfernen');
// Wiedereröffnen durch KFL macht es für den Partner wieder sichtbar
await c.patch('/api/tickets/' + t2, { status: 'in_bearbeitung' }, { who: 'admin' });
r = await c.get('/papi/tickets', { who: 'p' }); check(r.tickets.some((t) => t.id === t2), 'Von KFL wieder geöffnetes Ticket ist für den Partner wieder da');
console.log('fertig');
