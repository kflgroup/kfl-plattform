// Traumwagen-DEAL mit Inzahlungnahme: getrennte Ankauf-Anfrage, Verknüpfung, Doppel-Geschäft für Partner
import { makeD1, makeR2, installFetch, mails, SECRET, sig, nowSec, setNow, client, check, cron } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-03T09:00:00Z');
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
const lastMailTo = (email) => [...mails].reverse().find((m) => m.to.some((t) => t.email === email));
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
const org = {}, pu = {};
for (const [k, o] of [['A', { name: 'Autohaus Alpha', kind: 'einzel', zip: '49074', email: 'a@a.de', brands: ['Audi'], accepts: ['deal'] }], ['O', { name: 'Opel Ankauf Nord', kind: 'einzel', zip: '49451', email: 'o@o.de', brands: ['Opel'], accepts: ['sell'] }]]) {
  org[k] = (await c.post('/api/orgs', o, { who: 'admin' })).id;
  await c.patch(`/api/orgs/${org[k]}`, { accepts: o.accepts }, { who: 'admin' });
  const u = await c.post(`/api/orgs/${org[k]}/users`, { email: k.toLowerCase() + '@partner.de', name: 'Partner ' + k, role: 'gf' }, { who: 'admin' }); pu[k] = u.id;
  const inv = await c.post(`/api/orgs/${org[k]}/users/${u.id}/invite`, {}, { who: 'admin' });
  await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345', agb: true, privacy: true }, { who: k });
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
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nINZAHLUNGNAHME-TEST BESTANDEN');
