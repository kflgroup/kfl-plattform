// Lokaler Testserver mit Beispieldaten: node test/serve.mjs  →  http://localhost:8787/admin und /partner
import http from 'node:http';
import { makeD1, makeR2, installFetch, sig, nowSec, client, GEO } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
Object.assign(GEO, { '10115': [52.532, 13.3849, 'Berlin'], '20095': [53.5511, 9.9937, 'Hamburg'], '26121': [53.1435, 8.2146, 'Oldenburg'], '49661': [52.8467, 8.0436, 'Cloppenburg'], '48143': [51.9607, 7.6261, 'Münster'] });
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: 'test-secret', SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'x', AREA_PASSWORD: 'Test-Bereich-2026' };
const c = client(worker, env);
const tok = (l) => l.split('/').pop();
const ok = (r, m) => { if (r.ok === false || (r.status && r.status >= 400)) { console.error('Seed-Fehler', m, r); } return r; };

if (!process.env.EMPTY) {
  ok(await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Krusch', password: 'AdminPass123' }, { who: 'admin' }), 'setup');
  const staff = {};
  for (const [k, name, role] of [['gf', 'Anna Lindner', 'gf'], ['tl', 'Jonas Becker', 'teamleitung'], ['vt', 'Mia Schröder', 'vertrieb'], ['vt2', 'Lukas Wagner', 'vertrieb'], ['bh', 'Sophie Hartmann', 'buchhaltung']]) {
    const r = ok(await c.post('/api/users', { email: k + '@kfl.de', name, role_key: role, department: role === 'buchhaltung' ? 'Finanzen' : 'Vertrieb' }, { who: 'admin' }), 'user');
    await c.post('/api/invite/accept', { token: tok(r.invite), password: 'Passwort1234' }, { who: k }); staff[k] = r.id;
  }
  await c.patch('/api/settings', { lead_price_deal: 49, lead_price_sell: 39, company_iban: 'DE02120300000000202051', company_tax_no: '64/123/45678', company_owners: 'Tobias Krusch' }, { who: 'admin' });
  const org = {};
  for (const [k, o] of [['A', { name: 'Autohaus Alpha GmbH', kind: 'organisation', street: 'Hauptstr. 1', zip: '49074', city: 'Osnabrück', email: 'info@alpha.de', billing_email: 'rechnung@alpha.de', brands: ['Audi', 'Volkswagen', 'Skoda'], billing_mode: 'monatlich', vat_id: 'DE123456789', phone: '0541 123456' }],
    ['B', { name: 'Bremer Autowelt', kind: 'einzel', street: 'Weserstr. 2', zip: '28195', city: 'Bremen', email: 'kontakt@bremer-autowelt.de', brands: ['Audi', 'BMW'], billing_mode: 'einzel', opening: { mo: ['08:00', '18:00'], di: ['08:00', '18:00'], mi: ['08:00', '18:00'], do: ['08:00', '18:00'], fr: ['08:00', '18:00'], sa: ['09:00', '14:00'], so: null } }],
    ['C', { name: 'Autozentrum Oldenburg', kind: 'organisation', street: 'Alexanderstr. 40', zip: '26121', city: 'Oldenburg', email: 'info@az-ol.de', brands: ['Mercedes-Benz', 'Volkswagen', 'Audi'] }],
    ['D', { name: 'München Motors', kind: 'organisation', street: 'Isarweg 3', zip: '80331', city: 'München', email: 'm@m-motors.de', brands: ['BMW', 'Mini'] }]]) {
    org[k] = ok(await c.post('/api/orgs', o, { who: 'admin' }), 'org').id;
  }
  for (const [k, o, role, name] of [['a_gf', 'A', 'gf', 'Markus Alpha'], ['a_vl', 'A', 'vl', 'Petra Vogel'], ['a_vt1', 'A', 'vt', 'Kevin Brandt'], ['a_vt2', 'A', 'vt', 'Laura Meyer'], ['b_gf', 'B', 'gf', 'Henrik Bremer'], ['c_vt', 'C', 'vt', 'Ole Janssen'], ['c_gf', 'C', 'gf', 'Frauke Janssen']]) {
    const r = ok(await c.post(`/api/orgs/${org[o]}/users`, { email: k + '@partner.de', name, role }, { who: 'admin' }), 'pu');
    const inv = await c.post(`/api/orgs/${org[o]}/users/${r.id}/invite`, {}, { who: 'admin' });
    if (k !== 'c_gf') await c.post('/papi/invite/accept', { token: tok(inv.link), password: 'Partner12345', agb: true, privacy: true }, { who: k });
  }
  await c.post(`/api/orgs/${org.A}/training`, { done: true }, { who: 'admin' });
  const kid = '11134009573715';
  const people = [['Max', 'Mustermann', 'max@kunde.de', '49451', 'Holdorf'], ['Julia', 'Klein', 'julia.klein@web.de', '49377', 'Vechta'], ['Thomas', 'Schulte', 't.schulte@gmx.de', '49661', 'Cloppenburg'], ['Sandra', 'Wolf', 'sandra.wolf@t-online.de', '28195', 'Bremen'], ['Deniz', 'Yilmaz', 'deniz.y@gmail.com', '26121', 'Oldenburg'], ['Katrin', 'Bauer', 'k.bauer@posteo.de', '48143', 'Münster']];
  const cars = [['Audi', 'A4', 'Avant 40 TDI', 'leasen', 'Neuwagen'], ['Volkswagen', 'ID.4', 'Pro', 'finanzieren', 'Neuwagen'], ['Audi', 'Q5', 'Sportback 45 TFSI', 'kaufen', 'Gebrauchtwagen'], ['Skoda', 'Octavia', 'Combi RS', 'leasen', 'Neuwagen'], ['BMW', 'X3', 'xDrive20d', 'leasen', 'Neuwagen'], ['Mercedes-Benz', 'C-Klasse', 'T-Modell 220 d', 'kaufen', 'Gebrauchtwagen'], ['Audi', 'e-tron GT', 'quattro', 'leasen', 'Neuwagen'], ['Volkswagen', 'Golf', 'GTI', 'kaufen', 'Neuwagen']];
  const nums = [];
  for (let i = 0; i < 10; i++) {
    const [v, n, e, plz, city] = people[i % people.length], [brand, model, variant, pay, zustand] = cars[i % cars.length];
    const ts = nowSec();
    const r = await c.post('/', { _form: 'deal', _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.deal`), _page: 'https://kfl-group.com/pages/traumwagen-deal', _src: ['Instagram', 'Google', 'Webseite', 'Facebook'][i % 4], Formular: 'TRAUMWAGEN-DEAL', Kundennummer: kid,
      Zustand: zustand, Marke: brand, Modell: model, Modellvariante: variant, Bezahlart: pay, 'Kilometer pro Jahr': '15.000 km', Laufzeit: '3 Jahre (36 Monate)', Anzahlung: i % 3 ? 'Nein' : '5.000 €', Budget: ['450 € / Monat', '35.000 €', '600 € / Monat'][i % 3], Umkreis: ['100 km', '50 km', '200 km'][i % 3],
      'Servicepaket Wartung & Inspektion': i % 2 ? 'Ja' : '', Kundenart: i % 4 === 3 ? 'Gewerblich' : 'Privat', Vorname: v, name: n, email: e, phone: '0171 ' + (1234560 + i), 'Straße': 'Am Markt ' + (i + 1), PLZ: plz, Ort: city, Kontaktweg: 'Telefon', body: i % 3 ? '' : 'Bitte gern in Schwarz oder Grau.', 'AGB akzeptiert': 'Ja' });
    nums.push(r.number);
  }
  // Angebote zu den ersten Anfragen
  const asg = (no, orgId) => env.DB._sq.prepare('SELECT id FROM assignments WHERE request_id = ? AND org_id = ?').get(no - 1000, orgId);
  const offer = async (who, no, orgId, data) => { const a = asg(no, orgId); if (!a) return; await c.post(`/papi/requests/${a.id}/take`, {}, { who }); return c.post(`/papi/requests/${a.id}/offer`, { config: 'gleich', equipment_match: 'ja', service_cost: '29', ...data }, { who }); };
  await offer('a_vt1', nums[0], org.A, { monthly_rate: '389', km_per_year: 15000, term_months: 36, transfer_cost: '990', delivery: '8 Wochen' });
  await offer('b_gf', nums[0], org.B, { monthly_rate: '429', km_per_year: 15000, term_months: 36, transfer_cost: '1100' });
  await offer('a_vt2', nums[2], org.A, { price: '41900', transfer_cost: '0', first_registration: '03/2023', mileage: '18500', accident_free: 'ja', owners: '1' });
  const a3 = asg(nums[3], org.A); if (a3) await c.post(`/papi/requests/${a3.id}/take`, {}, { who: 'a_vt1' });
  // Kunde nimmt das erste Angebot an
  const ts = nowSec(); const mine = await c.post('/my/requests', { _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.my`) });
  const first = mine.requests.find((x) => x.number === nums[0]);
  if (first && first.offers[0]) await c.post(`/my/requests/${nums[0]}/accept`, { _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.my`), offer_id: first.offers[0].id });
  await c.post(`/my/requests/${nums[4]}/note`, { _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.my`), text: 'Ich hätte gern zusätzlich ein Angebot mit 20.000 km pro Jahr.' });
  await c.patch(`/api/requests/${nums[1]}`, { assignee_id: staff.vt }, { who: 'tl' });
  await c.patch(`/api/requests/${nums[5]}`, { assignee_id: staff.vt }, { who: 'tl' });
  // Support, News, Chat
  const tsS = nowSec();
  await c.post('/', { _form: 'support', _kid: '0', _ts: tsS, _sig: sig(`0.${tsS}.support`), name: 'Erika Musterfrau', email: 'erika@web.de', Thema: 'Frage zum Ratgeber', Nachricht: 'Wo finde ich meinen Download nach dem Kauf?' });
  await c.post('/papi/tickets', { subject: 'Rechnung März', text: 'Bitte schicken Sie uns die Rechnung noch einmal an buchhaltung@alpha.de.' }, { who: 'a_gf' });
  await c.post('/papi/settings/users/request', { action: 'role', user_id: env.DB._sq.prepare("SELECT id FROM partner_users WHERE email = 'a_vt2@partner.de'").get().id, role: 'vl' }, { who: 'a_gf' });
  await c.post('/api/tickets', { subject: 'Drucker im Büro', category: 'Technisches Problem', text: 'PDF-Rechnungen lassen sich nicht drucken.' }, { who: 'bh' });
  await c.post('/api/news', { title: 'Neue Abläufe ab Montag', body: 'Ab Montag gilt: Jede Kundennotiz wird innerhalb von 2 Stunden an die Partner weitergegeben.\nDanke euch!', important: true, audience: { type: 'all' } }, { who: 'gf' });
  await c.post('/api/news', { scope: 'partner', title: 'Audi-Aktion im November', body: 'Für Audi-Leasinganfragen gibt es diesen Monat besonders viele Anfragen – jetzt schnell reagieren lohnt sich.', audience: { type: 'brands', values: ['Audi'] } }, { who: 'gf' });
  const ch = await c.post('/api/chats', { userIds: [1] }, { who: 'vt' });
  await c.post(`/api/chats/${ch.id}`, { text: 'Hi Tobias, kannst du dir #1005 anschauen? Der Kunde hat eine Notiz geschrieben.' }, { who: 'vt' });
  await c.post('/api/absences', { from: '2026-12-21', to: '2026-12-31', substitute_id: 1, note: 'Weihnachtsurlaub' }, { who: 'gf' });
  // Buchhaltung
  const sup = await c.post('/api/acc/suppliers', { name: 'Werbeagentur Nord', iban: 'DE89 3704 0044 0532 0130 00', email: 'buchhaltung@werbeagentur-nord.de', city: 'Hamburg', zip: '20095' }, { who: 'bh' });
  await c.post('/api/acc/purchase', { supplier_id: sup.id, number: 'WA-2026-77', date: '2026-10-20', net: '1000', due_date: '2026-11-03', category: 'Marketing' }, { who: 'bh' });
  await c.post('/api/acc/invoices', { org_id: org.B, lines: [{ description: 'Einrichtung Partnerkonto', qty: 1, unit: 99 }], send: true }, { who: 'bh' });
  console.log('Beispieldaten angelegt:', nums.join(', '));
}

http.createServer(async (req, res) => {
  const chunks = []; for await (const ch of req) chunks.push(ch);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  headers.set('CF-Connecting-IP', '127.0.0.1');
  const r = await worker.fetch(new Request('http://localhost:8787' + req.url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), env);
  const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log('Testserver: http://localhost:8787/admin  ·  http://localhost:8787/partner'));
