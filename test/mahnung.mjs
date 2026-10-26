// Zahlungsziel und Mahnwesen: Standard-Konditionen je Geschäftspartner, Rechte, automatischer Ablauf
import { makeD1, makeR2, installFetch, SECRET, setNow, advance, client, check, cron } from './harness.mjs';
installFetch();
setNow('2026-11-02T09:00:00Z'); // Montag

console.log('Konditionen bei bestehenden Partnern nachtragen (Live-Datenbank)');
{
  const old = makeD1();
  old._sq.exec("CREATE TABLE orgs (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL DEFAULT 'organisation', name TEXT NOT NULL, street TEXT, zip TEXT, city TEXT, country TEXT DEFAULT 'Deutschland', lat REAL, lon REAL, phone TEXT, email TEXT, website TEXT, billing_name TEXT, billing_street TEXT, billing_zip TEXT, billing_city TEXT, billing_email TEXT, vat_id TEXT, tax_no TEXT, brands TEXT NOT NULL DEFAULT '[]', accepts TEXT NOT NULL DEFAULT '[\"deal\",\"sell\"]', max_radius_km INTEGER, billing_mode TEXT NOT NULL DEFAULT 'einzel', payment_terms_days INTEGER, dunning_fee REAL, lead_price REAL, opening TEXT, contacts TEXT NOT NULL DEFAULT '[]', training_done INTEGER NOT NULL DEFAULT 0, training_at TEXT, active INTEGER NOT NULL DEFAULT 1, deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
  old._sq.prepare("INSERT INTO orgs (name, created_at, updated_at) VALUES ('Alt GmbH', 'x', 'x')").run();
  old._sq.prepare("INSERT INTO orgs (name, payment_terms_days, created_at, updated_at) VALUES ('Sonderfall GmbH', 30, 'x', 'x')").run();
  const w0 = (await import('./wk.mjs?terms')).default;
  await client(w0, { DB: old, FILES: makeR2(), FORM_SECRET: SECRET }).get('/api/session');
  const a = old._sq.prepare('SELECT * FROM orgs WHERE id = 1').get(), b = old._sq.prepare('SELECT * FROM orgs WHERE id = 2').get();
  check(a.payment_terms_days === 14 && a.reminder_due_days === 5 && a.dunning_fee_1 === 4.9 && a.dunning_fee_2 === 79.8 && a.dunning_due_days === 10 && a.dunning_due_days_2 === 7, 'Bestehender Partner: 14 Tage, Erinnerung 5 Tage, 4,90 € / 79,80 €', a);
  check(b.payment_terms_days === 30 && b.dunning_fee_1 === 4.9, 'Individuell gesetztes Zahlungsziel bleibt erhalten');
}

const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
for (const [key, role] of [['gf', 'gf'], ['bh', 'buchhaltung'], ['tl', 'teamleitung']]) {
  const r = await c.post('/api/users', { email: key + '@kfl.de', name: key.toUpperCase(), role_key: role }, { who: 'admin' });
  await c.post('/api/invite/accept', { token: r.invite.split('/').pop(), password: 'Passwort1234' }, { who: key });
}
console.log('Neuer Geschäftspartner');
const org = (await c.post('/api/orgs', { name: 'Neu GmbH', kind: 'einzel', zip: '49451', email: 'info@neu.de', brands: ['Audi'] }, { who: 'gf' })).id;
let o = q1('SELECT * FROM orgs WHERE id = ?', org);
check(o.payment_terms_days === 14 && o.reminder_due_days === 5 && o.dunning_fee_1 === 4.9 && o.dunning_fee_2 === 79.8, 'Standard-Konditionen beim Anlegen fest hinterlegt', o);
let r = await c.patch(`/api/orgs/${org}`, { dunning_fee_2: '59,90' }, { who: 'bh' });
check(r.status === 403, 'Buchhaltung darf Konditionen des Partners nicht ändern');
r = await c.patch(`/api/orgs/${org}`, { dunning_fee_2: '59,90', payment_terms_days: '21' }, { who: 'gf' });
o = q1('SELECT * FROM orgs WHERE id = ?', org);
check(r.ok && o.dunning_fee_2 === 59.9 && o.payment_terms_days === 21, 'Geschäftsführung ändert Gebühr Stufe 2 und Zahlungsziel', r);
r = await c.patch(`/api/orgs/${org}`, { dunning_fee_2: '79,80', payment_terms_days: '14' }, { who: 'admin' });
check(r.ok && q1('SELECT dunning_fee_2 FROM orgs WHERE id = ?', org).dunning_fee_2 === 79.8, 'Admin setzt die Werte zurück');
check(q1("SELECT COUNT(*) AS n FROM org_notes WHERE org_id = ? AND text LIKE 'Mahngebühr 2. Mahnung geändert%'", org).n === 2, 'Änderungen werden beim Partner protokolliert');

console.log('Automatischer Ablauf: Zahlungsziel → Erinnerung → 1. Mahnung → 2. Mahnung');
await c.patch('/api/settings', { dunning_auto: true }, { who: 'admin' });
sq.prepare("INSERT INTO billing_items (org_id, description, amount_net, status, created_at, updated_at) VALUES (?, 'Vermittlung Test', 49, 'offen', '2026-11-02T09:00:00Z', '2026-11-02T09:00:00Z')").run(org);
r = await c.post('/api/acc/items/1/bill', {}, { who: 'bh' });
const id = r.invoiceId; let inv = q1('SELECT * FROM invoices WHERE id = ?', id);
check(inv.due_date === '2026-11-16' && inv.gross === 58.31, 'Rechnung fällig nach 14 Tagen (16.11.)', inv.due_date);
const day = async (iso) => { setNow(iso); await cron(worker, env); return q1('SELECT * FROM invoices WHERE id = ?', id); };
inv = await day('2026-11-16T10:00:00Z'); check(inv.dunning_level === 0, 'Am Fälligkeitstag noch keine Erinnerung');
inv = await day('2026-11-17T10:00:00Z');
let d = q1('SELECT * FROM dunnings WHERE invoice_id = ? ORDER BY id DESC', id);
check(inv.dunning_level === 1 && d.fee === 0 && d.due_date === '2026-11-22', 'Tag nach Fälligkeit: kostenlose Zahlungserinnerung, neue Frist 5 Tage (22.11.)', d);
inv = await day('2026-11-22T10:00:00Z'); check(inv.dunning_level === 1, 'Innerhalb der Erinnerungsfrist keine Mahnung');
inv = await day('2026-11-23T10:00:00Z');
d = q1('SELECT * FROM dunnings WHERE invoice_id = ? ORDER BY id DESC', id);
check(inv.dunning_level === 2 && d.fee === 4.9 && d.due_date === '2026-12-03' && inv.fees === 4.9, '1. Mahnung: 4,90 € Gebühr, Frist 10 Tage (03.12.)', d);
inv = await day('2026-12-04T10:00:00Z');
d = q1('SELECT * FROM dunnings WHERE invoice_id = ? ORDER BY id DESC', id);
check(inv.dunning_level === 3 && d.fee === 79.8 && d.due_date === '2026-12-11' && Math.round(inv.fees * 100) === 8470, '2. Mahnung: 79,80 € Gebühr, Frist 7 Tage (11.12.)', d);
inv = await day('2026-12-20T10:00:00Z'); check(inv.dunning_level === 3, 'Keine weitere Mahnstufe nach der 2. Mahnung');
await c.post('/api/login', { email: 'bh@kfl.de', password: 'Passwort1234' }, { who: 'bh' });
r = await c.post(`/api/acc/invoices/${id}/dunning`, {}, { who: 'bh' }); check(r.status === 409 && /Inkasso/.test(r.error), 'Manuell: Hinweis auf Inkasso / gerichtliches Mahnverfahren');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nMAHNWESEN-TEST BESTANDEN');
