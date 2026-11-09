// Traumwagen-DEAL mit Inzahlungnahme: getrennte Ankauf-Anfrage, Verknüpfung, Doppel-Geschäft für Partner
import { makeD1, makeR2, installFetch, mails, SECRET, sig, nowSec, setNow, client, check, cron } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-03T09:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
const lastMailTo = (email) => [...mails].reverse().find((m) => m.to.some((t) => t.email === email));
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
const org = {}, pu = {};
for (const [k, o] of [['A', { name: 'Autohaus Alpha', kind: 'einzel', zip: '49074', email: 'a@a.de', brands: ['Audi'], accepts: ['deal'] }], ['O', { name: 'Opel Ankauf Nord', kind: 'einzel', zip: '49451', email: 'o@o.de', brands: ['Opel'], accepts: ['sell'] }]]) {
  org[k] = (await c.post('/api/orgs', o, { who: 'admin' })).id;
  await c.patch(`/api/orgs/${org[k]}`, { accepts: o.accepts }, { who: 'admin' });
  const u = await c.post(`/api/orgs/${org[k]}/users`, { email: k.toLowerCase() + '@partner.de', name: 'Partner ' + k, role: 'gf' }, { who: 'admin' }); pu[k] = u.id;
  const inv = await c.post(`/api/orgs/${org[k]}/users/${u.id}/invite`, {}, { who: 'admin' });
  await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345!', agb: true, privacy: true }, { who: k });
}
const kid = '11134009573715';
const deal = (extra = {}) => { const ts = nowSec(); return { _form: 'deal', _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.deal`), _page: 'https://kfl-group.com/pages/traumwagen-deal', Formular: 'TRAUMWAGEN-DEAL', Kundennummer: kid,
  Zustand: 'Neuwagen', Marke: 'Audi', Modell: 'A4', Bezahlart: 'kaufen', Kundenart: 'Privat', Umkreis: '100 km', Vorname: 'Max', name: 'Mustermann', email: 'max@kunde.de', phone: '0171 1234567', 'Straße': 'Am Markt 5', PLZ: '49451', Ort: 'Holdorf', Kontaktweg: 'Telefon',
  'AGB akzeptiert': 'Ja', 'Datenschutz akzeptiert': 'Ja', 'Weitergabe an Partner und Kontaktaufnahme': 'Ja', ...extra }; };
const trade = { Inzahlungnahme: 'Ja', 'Altwagen Marke': 'Opel', 'Altwagen Modell': 'Astra', 'Altwagen Modellvariante': 'Sports Tourer 1.4', 'Altwagen Erstzulassung': '2018-05', 'Altwagen Laufleistung km': '98.500',
  'Altwagen Kraftstoff': 'Benzin', 'Altwagen Getriebe': 'Schaltgetriebe', 'Altwagen Unfallfrei': 'Ja', 'Altwagen Vorbesitzer': '1', 'Altwagen Preisvorstellung': '9.000', 'Altwagen Anmerkungen': 'TÜV neu, Winterräder dabei' };

console.log('Traumwagen-DEAL mit Inzahlungnahme');
let r = await c.post('/', deal(trade));
check(r.ok && r.number === 1001 && r.sellNumber === 1002, 'Zwei getrennte Anfragen: #1001 Kauf, #1002 Verkauf', r);
const d = q1('SELECT * FROM requests WHERE id = 1'), s = q1('SELECT * FROM requests WHERE id = 2');
const dd = JSON.parse(d.data), sd = JSON.parse(s.data);
check(d.type === 'deal' && d.brand === 'Audi' && d.linked_request_id === 2 && s.type === 'sell' && s.brand === 'Opel' && s.model === 'Astra' && s.linked_request_id === 1, 'Kauf (Audi) und Verkauf (Opel) erkannt und verknüpft', { d: [d.type, d.brand], s: [s.type, s.brand, s.model] });
check(dd['Altwagen Marke'] === 'Opel' && dd['Altwagen Laufleistung km'] === '98.500' && dd['Ankauf-Anfrage zum Altwagen'] === '#1002', 'Altwagen-Angaben liegen auch in der Kauf-Anfrage', dd);
check(sd.Marke === 'Opel' && sd.Erstzulassung === '2018-05' && sd.body === 'TÜV neu, Winterräder dabei' && sd['Inzahlungnahme zu'] === 'Traumwagen-DEAL #1001' && sd.email === 'max@kunde.de' && sd.PLZ === '49451' && !sd.Bezahlart && sd.Halter === 'Privat', 'Ankauf-Anfrage mit Fahrzeug- und Kontaktdaten, ohne Kaufangaben', sd);
check(s.customer_account === kid && s.radius_km === 100, 'Ankauf im Kundenkonto, gleicher Umkreis');
check(qa('SELECT * FROM assignments WHERE request_id = 1').length === 1 && !qa('SELECT * FROM assignments WHERE request_id = 2').length && s.dispatch_pending === 1, 'Kauf sofort an Alpha verteilt, Ankauf vorgemerkt');
check(/Ankauf-Anfrage <strong>#1002<\/strong>/.test(lastMailTo('max@kunde.de').htmlContent), 'Eingangsbestätigung nennt beide Anfragen');
check(/mit Inzahlungnahme/.test(lastMailTo('a@partner.de').subject + lastMailTo('a@partner.de').htmlContent), 'Partner-Mail zum Traumwagen: „mit Inzahlungnahme“');
await cron(worker, env);
const so = qa('SELECT * FROM assignments WHERE request_id = 2');
check(so.length === 1 && so[0].org_id === org.O && q1('SELECT dispatch_pending FROM requests WHERE id = 2').dispatch_pending === 0, 'Ankauf im nächsten Durchlauf an den Opel-Ankaufpartner verteilt (nicht an Alpha)', so);

console.log('Partner: Doppel-Geschäft');
const aidA = q1('SELECT id FROM assignments WHERE request_id = 1 AND org_id = ?', org.A).id;
r = await c.get('/papi/requests?tab=neu', { who: 'A' });
check(r.items[0].request.tradeIn === true && !r.items[0].request.fields, 'Vor der Übernahme: Hinweis „Inzahlungnahme“, keine Details');
r = await c.post(`/papi/requests/${aidA}/linked`, {}, { who: 'A' }); check(r.status === 403, 'Ankauf erst nach Übernahme des Traumwagens');
await c.post(`/papi/requests/${aidA}/take`, {}, { who: 'A' });
r = await c.get(`/papi/requests/${aidA}`, { who: 'A' });
check(r.item.request.fields['Altwagen Modell'] === 'Astra' && !JSON.stringify(r.item.request.fields).includes('Mustermann') && r.item.linked && r.item.linked.number === 1002 && r.item.linked.canJoin && !r.item.linked.aid, 'Nach Übernahme: Altwagen-Daten, Vermerk zur Ankauf-Anfrage #1002, „Ankauf zusätzlich übernehmen“', r.item.linked);
r = await c.post(`/papi/requests/${aidA}/linked`, {}, { who: 'A' });
const aj = q1('SELECT * FROM assignments WHERE id = ?', r.id);
check(r.ok && aj.request_id === 2 && aj.org_id === org.A && aj.source === 'verknuepft' && aj.taken_by === pu.A && aj.status === 'in_bearbeitung', 'Alpha übernimmt den Ankauf zusätzlich – direkt reserviert', aj);
r = await c.get(`/papi/requests/${aidA}`, { who: 'A' });
check(r.item.linked.aid === aj.id && r.item.linked.mine && !r.item.linked.canJoin, 'Traumwagen-Anfrage verlinkt jetzt direkt zum eigenen Ankauf');
r = await c.get(`/papi/requests/${aj.id}`, { who: 'A' });
check(r.item.request.type === 'sell' && r.item.request.fields.Marke === 'Opel' && r.item.linked && r.item.linked.number === 1001 && r.item.linked.aid === aidA, 'Ankauf-Anfrage zeigt den zugehörigen Traumwagen-DEAL');
r = await c.post(`/papi/requests/${aidA}/linked`, {}, { who: 'A' }); check(r.ok && r.existing && r.id === aj.id, 'Erneuter Klick: keine doppelte Zuordnung');
r = await c.get('/api/requests/1001', { who: 'admin' });
check(r.request.linked && r.request.linked.number === 1002 && r.request.linked.type === 'sell', 'Internes Dashboard: Verknüpfung sichtbar');

console.log('Ohne Inzahlungnahme');
r = await c.post('/', deal({ Inzahlungnahme: 'Nein', 'Altwagen Unfalldetails': 'Rest aus dem Formular' }));
const d3 = q1('SELECT * FROM requests WHERE id = ?', r.number - 1000);
check(r.ok && !r.sellNumber && !d3.linked_request_id && !JSON.parse(d3.data)['Altwagen Unfalldetails'], 'Nur eine Anfrage, Altwagen-Reste werden verworfen', r);
r = await c.post('/', deal({ Inzahlungnahme: 'Ja' }));
check(r.ok && !r.sellNumber, 'Inzahlungnahme ohne Fahrzeugangaben: keine leere Ankauf-Anfrage');

console.log('Inzahlungnahme über zwei getrennte Formulare');
const kid2 = '22200000000001';
const deal2 = (extra = {}) => { const ts = nowSec(); return { ...deal(), _kid: kid2, _ts: ts, _sig: sig(`${kid2}.${ts}.deal`), Kundennummer: kid2, Vorname: 'Eva', name: 'Beispiel', email: 'eva@kunde.de', Inzahlungnahme: 'Ja', ...extra }; };
const sell2 = (extra = {}) => { const ts = nowSec(); return { _form: 'sell', _kid: kid2, _ts: ts, _sig: sig(`${kid2}.${ts}.sell`), _page: 'https://kfl-group.com/pages/auto-verkaufen', Formular: 'MEIN AUTO VERKAUFEN', Kundennummer: kid2,
  Marke: 'Opel', Modell: 'Corsa', Erstzulassung: '2021', 'Laufleistung km': '40.000', Unfallfrei: 'Ja', Preisvorstellung: '12.000', Vorname: 'Eva', name: 'Beispiel', email: 'eva@kunde.de', phone: '', 'Straße': 'Weg 1', PLZ: '49451', Ort: 'Holdorf',
  Umkreis: '100 km', Kontaktweg: 'E-Mail', 'AGB akzeptiert': 'Ja', 'Datenschutz akzeptiert': 'Ja', 'Weitergabe an Partner und Kontaktaufnahme': 'Ja', ...extra }; };
r = await c.post('/', deal2());
const nD = r.number, idD = nD - 1000;
check(r.ok && !r.sellNumber && !q1('SELECT linked_request_id FROM requests WHERE id = ?', idD).linked_request_id, 'DEAL mit „Inzahlungnahme: Ja“ ohne Fahrzeugdaten: zunächst keine Ankauf-Anfrage');
const aidD = q1('SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', idD, org.A).id;
check(q1("SELECT COUNT(*) AS n FROM notifications WHERE recipient_type = 'partner' AND recipient_id = ? AND link = ? AND read_at IS NULL", pu.A, `#/anfragen/${aidD}`).n === 1, 'Partner hat ungelesene News „Neue Anfrage“');
await c.post(`/papi/requests/${aidD}/take`, {}, { who: 'A' });
check(q1("SELECT COUNT(*) AS n FROM notifications WHERE recipient_type = 'partner' AND recipient_id = ? AND link = ? AND read_at IS NULL", pu.A, `#/anfragen/${aidD}`).n === 0, 'Nach dem Übernehmen: News zur Anfrage automatisch gelesen (Zähler sinkt)');
r = await c.post('/', sell2());
const idS = r.number - 1000;
const lD = q1('SELECT * FROM requests WHERE id = ?', idD), lS = q1('SELECT * FROM requests WHERE id = ?', idS);
check(r.ok && lD.linked_request_id === idS && lS.linked_request_id === idD && JSON.parse(lS.data)['Inzahlungnahme zu'] === `Traumwagen-DEAL #${nD}`, 'Separates „Auto verkaufen“ desselben Kunden automatisch als Inzahlungnahme verknüpft');
const note = q1("SELECT * FROM notifications WHERE recipient_type = 'partner' AND recipient_id = ? AND title LIKE 'Inzahlungnahme zu%' ORDER BY id DESC", pu.A);
check(note && note.link === `#/anfragen/${aidD}` && !note.read_at, 'Partner, der den Traumwagen bearbeitet, bekommt einen Hinweis auf den Ankauf');
let unread = (await c.get('/papi/start', { who: 'A' })).news.notifications.filter((n) => !n.read).length;
r = await c.get(`/papi/requests/${aidD}`, { who: 'A' });
check(r.item.linked && r.item.linked.number === idS + 1000 && r.item.linked.canJoin, 'Traumwagen-Anfrage zeigt „Ankauf zusätzlich übernehmen“');
check((await c.get('/papi/start', { who: 'A' })).news.notifications.filter((n) => !n.read).length === unread - 1, 'Öffnen der Anfrage markiert den Hinweis als gelesen');
r = await c.post(`/papi/requests/${aidD}/linked`, {}, { who: 'A' });
const aS = q1('SELECT * FROM assignments WHERE id = ?', r.id);
check(r.ok && aS.request_id === idS && aS.taken_by === pu.A && aS.status === 'in_bearbeitung', 'Partner übernimmt den Ankauf im selben Zug');

console.log('Abgelaufene Ankauf-Zuordnung wird für die Inzahlungnahme wieder geöffnet');
const kid3 = '33300000000001';
const ts3 = nowSec();
r = await c.post('/', { ...sell2(), _kid: kid3, _ts: ts3, _sig: sig(`${kid3}.${ts3}.sell`), Kundennummer: kid3, email: 'tom@kunde.de', Vorname: 'Tom' });
const idS3 = r.number - 1000;
// Alpha hatte den Ankauf schon einmal, aber die Frist ist ohne Bearbeitung abgelaufen
sq.prepare("INSERT INTO assignments (request_id, org_id, status, source, archived, reminders, created_at, updated_at, deadline_at) VALUES (?, ?, 'verloren', 'manuell', 0, 0, ?, ?, ?)").run(idS3, org.A, '2026-11-01T09:00:00Z', '2026-11-02T09:00:00Z', '2026-11-02T09:00:00Z');
const ts4 = nowSec();
r = await c.post('/', { ...deal2(), _kid: kid3, _ts: ts4, _sig: sig(`${kid3}.${ts4}.deal`), Kundennummer: kid3, email: 'tom@kunde.de', Vorname: 'Tom' });
const idD3 = r.number - 1000;
check(q1('SELECT linked_request_id FROM requests WHERE id = ?', idD3).linked_request_id === idS3, 'Auch umgekehrt: erst Verkauf, dann DEAL mit Inzahlungnahme → verknüpft');
const aidD3 = q1('SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', idD3, org.A).id;
await c.post(`/papi/requests/${aidD3}/take`, {}, { who: 'A' });
r = await c.get(`/papi/requests/${aidD3}`, { who: 'A' });
check(r.item.linked && r.item.linked.canJoin, 'Verfallene eigene Ankauf-Zuordnung: Übernahme trotzdem angeboten');
r = await c.post(`/papi/requests/${aidD3}/linked`, {}, { who: 'A' });
const a3 = q1('SELECT * FROM assignments WHERE request_id = ? AND org_id = ?', idS3, org.A);
check(r.ok && r.id === a3.id && a3.status === 'in_bearbeitung' && a3.taken_by === pu.A && a3.deadline_at > '2026-11-03T09:00:00.000Z', 'Ankauf wieder geöffnet, mit neuer Frist übernommen', a3);
r = await c.get(`/papi/requests/${a3.id}`, { who: 'A' });
check(r.ok && r.item.request.type === 'sell', 'Partner kann den Ankauf bearbeiten');

console.log('Vorbesitzer ist für Partner ausgeblendet');
r = await c.get(`/papi/requests/${aidA}`, { who: 'A' });
const fieldsD = JSON.stringify(r.item.request.fields || {});
check(/Altwagen Marke/.test(fieldsD) && !/Vorbesitzer/.test(fieldsD) && q1('SELECT data FROM requests WHERE id = 1').data.includes('Altwagen Vorbesitzer'), 'Altwagen: „Vorbesitzer“ nicht beim Partner, intern weiter gespeichert');
const sellAid = q1('SELECT id FROM assignments WHERE request_id = 2 AND org_id = ?', org.A);
if (sellAid) { r = await c.get(`/papi/requests/${sellAid.id}`, { who: 'A' }); check(!/Vorbesitzer/.test(JSON.stringify(r.item.request.fields || {})) && q1('SELECT data FROM requests WHERE id = 2').data.includes('Vorbesitzer'), 'Ankauf-Anfrage: „Vorbesitzer“ ebenfalls ausgeblendet'); }

console.log('Inzahlungnahme ohne Fahrzeugdaten: Ankauf trotzdem übernehmen');
const kid5 = '55500000000001', ts5 = nowSec();
r = await c.post('/', { ...deal(), Inzahlungnahme: 'Ja', _kid: kid5, _ts: ts5, _sig: sig(`${kid5}.${ts5}.deal`), Kundennummer: kid5, email: 'eva@kunde.de', Vorname: 'Eva' });
const idD5 = r.number - 1000;
check(!q1('SELECT linked_request_id FROM requests WHERE id = ?', idD5).linked_request_id, 'Ohne Fahrzeugdaten zunächst keine Ankauf-Anfrage');
const aidD5 = q1('SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', idD5, org.A).id;
await c.post(`/papi/requests/${aidD5}/take`, {}, { who: 'A' });
r = await c.get(`/papi/requests/${aidD5}`, { who: 'A' });
check(r.item.linked && r.item.linked.canJoin && r.item.linked.pending && r.item.request.tradeIn, 'Partner sieht „Ankauf zusätzlich übernehmen“');
r = await c.post(`/papi/requests/${aidD5}/linked`, {}, { who: 'A' });
const s5 = q1('SELECT * FROM requests WHERE linked_request_id = ?', idD5);
const a5 = q1('SELECT * FROM assignments WHERE id = ?', r.id);
check(r.ok && s5 && s5.type === 'sell' && q1('SELECT linked_request_id FROM requests WHERE id = ?', idD5).linked_request_id === s5.id && a5.request_id === s5.id && a5.taken_by === pu.A, 'Ankauf-Anfrage angelegt, verknüpft und dem Partner zugeordnet');
check(/Fahrzeugdaten liegen noch nicht vor/.test(s5.data) && JSON.parse(s5.data).email === 'eva@kunde.de' && q1('SELECT COUNT(*) AS n FROM assignments WHERE request_id = ?', s5.id).n === 1, 'Mit Kontaktdaten und Hinweis, nur für diesen Partner');

console.log('Selbstheilung: nicht verknüpfte und nicht verteilte Inzahlungnahme');
const kid6 = '66600000000001', ts6 = nowSec();
r = await c.post('/', { ...deal(trade), _kid: kid6, _ts: ts6, _sig: sig(`${kid6}.${ts6}.deal`), Kundennummer: kid6, email: 'udo@kunde.de', Vorname: 'Udo' });
const idD6 = r.number - 1000, idS6 = r.sellNumber - 1000;
check(q1('SELECT linked_request_id FROM requests WHERE id = ?', idS6).linked_request_id === idD6 && q1('SELECT dispatch_pending FROM requests WHERE id = ?', idS6).dispatch_pending === 1, 'Ankauf wird direkt verknüpft und zur Verteilung vorgemerkt angelegt');
// Abbruch simulieren: Verknüpfung und Vormerkung fehlen
sq.prepare("UPDATE requests SET linked_request_id = NULL, dispatch_pending = 0, created_at = ? WHERE id IN (?, ?)").run('2026-11-03T08:00:00.000Z', idD6, idS6);
await cron(worker, env);
check(q1('SELECT linked_request_id FROM requests WHERE id = ?', idS6).linked_request_id === idD6 && q1('SELECT linked_request_id FROM requests WHERE id = ?', idD6).linked_request_id === idS6, 'Cron verknüpft beide wieder');
await cron(worker, env);
check(q1('SELECT COUNT(*) AS n FROM assignments WHERE request_id = ?', idS6).n > 0, 'Ankauf wird nachträglich verteilt');
console.log('Keine doppelte Ankauf-Anfrage');
const kid7 = '77700000000001', ts7 = nowSec();
r = await c.post('/', { ...deal(trade), _kid: kid7, _ts: ts7, _sig: sig(`${kid7}.${ts7}.deal`), Kundennummer: kid7, email: 'ina@kunde.de', Vorname: 'Ina' });
const idD7 = r.number - 1000, idS7 = r.sellNumber - 1000;
sq.prepare("UPDATE requests SET linked_request_id = NULL, dispatch_pending = 0 WHERE id IN (?, ?)").run(idD7, idS7);
const aidD7 = q1('SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', idD7, org.A).id;
await c.post(`/papi/requests/${aidD7}/take`, {}, { who: 'A' });
r = await c.post(`/papi/requests/${aidD7}/linked`, {}, { who: 'A' });
check(r.ok && q1('SELECT request_id FROM assignments WHERE id = ?', r.id).request_id === idS7 && q1("SELECT COUNT(*) AS n FROM requests WHERE type = 'sell' AND data LIKE ?", `%Traumwagen-DEAL #${idD7 + 1000}%`).n === 1, 'Partner übernimmt die vorhandene Ankauf-Anfrage, keine zweite angelegt');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nINZAHLUNGNAHME-TEST BESTANDEN');
