// Angebotsauswahl: 7 Faktoren mit Gewichtung, die 3 besten Angebote, geschützter Admin-Bereich
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check } from './harness.mjs';
installFetch();
setNow('2026-11-03T09:00:00Z');
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo', SCORING_PASSWORD: 'Test-Auswahl-2026' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
const r0 = await c.post('/api/users', { email: 'gf@kfl.de', name: 'GF', role_key: 'gf' }, { who: 'admin' });
await c.post('/api/invite/accept', { token: r0.invite.split('/').pop(), password: 'Passwort1234' }, { who: 'gf' });
const orgs = []; for (const n of ['A', 'B', 'C', 'D']) orgs.push((await c.post('/api/orgs', { name: 'Partner ' + n, kind: 'einzel', zip: '49451', email: `p${n}@test.de`, brands: ['Audi'] }, { who: 'admin' })).id);
// Anfrage mit 4 Angeboten anlegen: [Entfernung km, Rate €, Ausstattung, Konfiguration, Laufzeit, Servicepaket, Antwort nach Std.]
function seed(rows) {
  const data = { Formular: 'TRAUMWAGEN-DEAL', Marke: 'Audi', Modell: 'A4', Bezahlart: 'leasen', Laufzeit: '3 Jahre (36 Monate)', 'Kilometer pro Jahr': '15.000 km', 'Servicepaket Wartung & Inspektion': 'Ja', Vorname: 'Kim' };
  const rid = Number(sq.prepare("INSERT INTO requests (type, status, customer_name, email, brand, model, vehicle, data, radius_km, created_at, updated_at) VALUES ('deal', 'versendet', 'Kim Kunde', 'kim@kunde.de', 'Audi', 'A4', 'Audi A4', ?, 100, '2026-11-03T08:00:00Z', '2026-11-03T08:00:00Z')").run(JSON.stringify(data)).lastInsertRowid);
  rows.forEach(([km, rate, eq, cfg, term, svc, h], i) => {
    const aid = Number(sq.prepare("INSERT INTO assignments (request_id, org_id, status, distance_km, created_at, updated_at) VALUES (?, ?, 'versendet', ?, '2026-11-03T08:00:00Z', '2026-11-03T08:00:00Z')").run(rid, orgs[i], km).lastInsertRowid);
    const at = new Date(Date.parse('2026-11-03T08:00:00Z') + h * 3600e3).toISOString();
    const d = { config: cfg, equipment_match: eq, monthly_rate: rate, term_months: term, km_per_year: 15000, ...(svc ? { service_cost: 29 } : {}) };
    sq.prepare("INSERT INTO offers (request_id, assignment_id, org_id, kind, data, compare_value, status, created_at, updated_at) VALUES (?, ?, ?, 'leasing', ?, ?, 'eingereicht', ?, ?)").run(rid, aid, orgs[i], JSON.stringify(d), rate, at, at);
  });
  return rid;
}
const rows = [[80, 300, 'nein', 'alternativ', 48, false, 20], [5, 380, 'ja', 'gleich', 36, true, 1], [40, 340, 'ja', 'gleich', 36, true, 6], [60, 420, 'ja', 'gleich', 36, false, 22]];

console.log('Standard-Gewichtung: die 3 besten von 4 Angeboten');
let rid = seed(rows);
let r = await c.post(`/api/requests/${1000 + rid}/evaluate`, {}, { who: 'admin' });
let res = qa('SELECT org_id, status, rank, score, score_detail FROM offers WHERE request_id = ? ORDER BY rank', rid);
check(r.ok && res.filter((x) => x.status === 'vorgestellt').length === 3 && res[3].status === 'nicht_ausgewaehlt', '4 Angebote → 3 vorgestellt, 1 nicht ausgewählt', res.map((x) => [x.org_id, x.status, x.score]));
check(res[0].org_id === orgs[2] || res[0].org_id === orgs[1], 'Platz 1: passendes, nahes Angebot mit Wunsch-Laufzeit und Servicepaket', res.map((x) => x.org_id));
const det = JSON.parse(res.find((x) => x.org_id === orgs[0]).score_detail);
check(det.points.price === 100 && det.points.equipment === 0 && det.points.model === 0 && det.points.term < 100 && det.points.addons === 0, 'Punkte je Faktor plausibel (günstigster Preis, aber Alternative ohne Servicepaket)', det.points);
check(q1('SELECT status FROM requests WHERE id = ?', rid).status === 'angebot_beim_kunden', 'Anfrage: Angebote beim Kunden');

console.log('Admin-Bereich mit Freigabepasswort');
r = await c.get('/api/scoring', { who: 'gf' }); check(r.status === 403, 'Geschäftsführung hat keinen Zugriff');
r = await c.get('/api/scoring', { who: 'admin' });
check(r.factors.length === 7 && Object.values(r.weights).reduce((a, b) => a + b, 0) === 100 && r.presented_count === 3, '7 Faktoren, Summe 100 %, 3 Angebote', r.weights);
const w = { distance: 0, response: 0, equipment: 0, price: 100, model: 0, term: 0, addons: 0 };
r = await c.post('/api/scoring', { weights: w, presented_count: 3, password: 'falsch' }, { who: 'admin' }); check(r.status === 403, 'Falsches Freigabepasswort → nicht gespeichert');
r = await c.post('/api/scoring', { weights: { ...w, price: 90 }, presented_count: 3, password: 'Test-Auswahl-2026' }, { who: 'admin' }); check(r.status === 400 && /100 %/.test(r.error), 'Summe ≠ 100 % wird abgelehnt', r.error);
r = await c.patch('/api/settings', { score_w_price: 100, presented_count: 1 }, { who: 'admin' });
check(q1("SELECT COUNT(*) AS n FROM settings WHERE key IN ('score_w_price','presented_count')").n === 0, 'Über die normalen Einstellungen nicht änderbar (nur mit Passwort)');
r = await c.post('/api/scoring', { weights: w, presented_count: 2, password: 'Test-Auswahl-2026' }, { who: 'admin' }); check(r.ok, 'Mit Passwort gespeichert (100 % Preis, 2 Angebote)');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'angebotsauswahl_geaendert'").n === 1, 'Änderung im Protokoll');

console.log('Neue Gewichtung wirkt bei der nächsten Auswertung');
rid = seed(rows);
await c.post(`/api/requests/${1000 + rid}/evaluate`, {}, { who: 'admin' });
res = qa('SELECT org_id, status, rank FROM offers WHERE request_id = ? ORDER BY rank', rid);
check(res[0].org_id === orgs[0] && res[1].org_id === orgs[2] && res.filter((x) => x.status === 'vorgestellt').length === 2, 'Nur Preis zählt: günstigstes Angebot auf Platz 1, 2 Angebote vorgestellt', res);
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nAUSWAHL-TEST BESTANDEN');
