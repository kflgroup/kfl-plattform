/* ============================================================
   Datenbank (Cloudflare D1 / SQLite): Schema, Migration, Helfer
   Tabellen werden beim ersten Aufruf automatisch angelegt bzw. erweitert.
   Bestehende Daten des alten Dashboards bleiben erhalten.
   ============================================================ */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'eingang', priority TEXT NOT NULL DEFAULT 'normal',
    assignee_id INTEGER, customer_name TEXT, email TEXT, phone TEXT, brand TEXT, model TEXT, vehicle TEXT, summary TEXT,
    customer_account TEXT, page TEXT, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, user_id INTEGER, text TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER, user_id INTEGER, action TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS roles (key TEXT PRIMARY KEY, name TEXT NOT NULL, perms TEXT NOT NULL, builtin INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role_key TEXT NOT NULL,
    pass_hash TEXT, pass_salt TEXT, active INTEGER NOT NULL DEFAULT 1, invite_hash TEXT, invite_expires TEXT,
    failed_logins INTEGER NOT NULL DEFAULT 0, locked_until TEXT, created_at TEXT NOT NULL, last_login TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT, updated_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor_type TEXT, actor_id INTEGER, actor_name TEXT,
    action TEXT NOT NULL, entity TEXT, entity_id TEXT, detail TEXT, ip TEXT)`,

  // Geschäftspartner
  `CREATE TABLE IF NOT EXISTS orgs (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL DEFAULT 'organisation', name TEXT NOT NULL,
    street TEXT, zip TEXT, city TEXT, country TEXT DEFAULT 'Deutschland', lat REAL, lon REAL, phone TEXT, email TEXT, website TEXT,
    billing_name TEXT, billing_street TEXT, billing_zip TEXT, billing_city TEXT, billing_email TEXT, vat_id TEXT, tax_no TEXT,
    brands TEXT NOT NULL DEFAULT '[]', accepts TEXT NOT NULL DEFAULT '["deal","sell"]', max_radius_km INTEGER,
    billing_mode TEXT NOT NULL DEFAULT 'einzel', payment_terms_days INTEGER, dunning_fee REAL, lead_price REAL,
    opening TEXT, contacts TEXT NOT NULL DEFAULT '[]', training_done INTEGER NOT NULL DEFAULT 0, training_at TEXT,
    active INTEGER NOT NULL DEFAULT 1, deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS org_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id INTEGER NOT NULL, user_id INTEGER, text TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_users (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id INTEGER NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'vt', phone TEXT, pass_hash TEXT, pass_salt TEXT, must_change_pw INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1, invite_hash TEXT, invite_expires TEXT, failed_logins INTEGER NOT NULL DEFAULT 0, locked_until TEXT,
    agb_at TEXT, privacy_at TEXT, last_login TEXT, prev_login TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, day TEXT, text TEXT NOT NULL, created_at TEXT NOT NULL)`,

  // Zuordnung Anfrage ↔ Partner und Angebote
  `CREATE TABLE IF NOT EXISTS assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, org_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'neu', source TEXT NOT NULL DEFAULT 'auto', target_user_id INTEGER, distance_km REAL,
    taken_by INTEGER, taken_at TEXT, lock_until TEXT, deadline_at TEXT, sent_at TEXT, offer_id INTEGER, mailed_at TEXT,
    reminded_at TEXT, reminders INTEGER NOT NULL DEFAULT 0, closed_reason TEXT, won_at TEXT, contact_due_at TEXT, contact_at TEXT,
    seen_at TEXT, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(request_id, org_id))`,
  `CREATE TABLE IF NOT EXISTS offers (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, assignment_id INTEGER NOT NULL, org_id INTEGER NOT NULL,
    user_id INTEGER, kind TEXT, data TEXT NOT NULL, compare_value REAL, score REAL, rank INTEGER,
    status TEXT NOT NULL DEFAULT 'eingereicht', pdf_file_id INTEGER, expose_file_id INTEGER, public_file_id INTEGER, public_expose_id INTEGER,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_events (id INTEGER PRIMARY KEY AUTOINCREMENT, assignment_id INTEGER, request_id INTEGER, org_id INTEGER,
    actor_type TEXT, actor_id INTEGER, actor_name TEXT, action TEXT NOT NULL, text TEXT, confidential INTEGER NOT NULL DEFAULT 0,
    visible_partner INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,

  // Dateien (R2 oder Datenbank)
  `CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mime TEXT, size INTEGER, storage TEXT, key TEXT,
    owner_type TEXT, owner_id INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS file_chunks (file_id INTEGER NOT NULL, idx INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (file_id, idx))`,

  // News, Benachrichtigungen, Chat
  `CREATE TABLE IF NOT EXISTS news_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER, author_name TEXT, scope TEXT NOT NULL DEFAULT 'staff',
    audience TEXT NOT NULL DEFAULT '{}', title TEXT NOT NULL, body TEXT, important INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS news_reads (post_id INTEGER NOT NULL, reader_type TEXT NOT NULL, reader_id INTEGER NOT NULL, read_at TEXT NOT NULL, PRIMARY KEY (post_id, reader_type, reader_id))`,
  `CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient_type TEXT NOT NULL, recipient_id INTEGER NOT NULL,
    kind TEXT, title TEXT NOT NULL, body TEXT, link TEXT, read_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, title TEXT, created_by INTEGER, created_at TEXT NOT NULL, last_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS chat_members (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, last_read_at TEXT, PRIMARY KEY (chat_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS absences (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, from_date TEXT NOT NULL, to_date TEXT NOT NULL,
    substitute_id INTEGER, status TEXT NOT NULL DEFAULT 'angefragt', note TEXT, created_at TEXT NOT NULL, decided_at TEXT)`,

  // Support
  `CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, tag TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'ticket', category TEXT,
    subject TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'neu', requester_type TEXT, requester_id INTEGER,
    requester_name TEXT, requester_email TEXT, org_id INTEGER, request_id INTEGER, assignee_id INTEGER, payload TEXT,
    escalated_at TEXT, done_at TEXT, archived_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ticket_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, author_type TEXT NOT NULL,
    author_id INTEGER, author_name TEXT, text TEXT NOT NULL, internal INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sys_issues (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, details TEXT, status TEXT NOT NULL DEFAULT 'offen',
    created_by INTEGER, created_at TEXT NOT NULL, done_at TEXT, notes TEXT NOT NULL DEFAULT '[]')`,
  `CREATE TABLE IF NOT EXISTS archive (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ref_id INTEGER, title TEXT, data TEXT NOT NULL,
    archived_at TEXT NOT NULL, expires_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'auto', size INTEGER,
    sha256 TEXT, file_id INTEGER, report TEXT, uploaded TEXT)`,

  // Buchhaltung
  `CREATE TABLE IF NOT EXISTS billing_items (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id INTEGER NOT NULL, request_id INTEGER, assignment_id INTEGER,
    description TEXT NOT NULL, amount_net REAL NOT NULL, status TEXT NOT NULL DEFAULT 'offen', invoice_id INTEGER, note TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  // Notizen der Buchhaltung zu Rechnungen und Abrechnungsfällen
  `CREATE TABLE IF NOT EXISTS acc_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER, item_id INTEGER, text TEXT NOT NULL,
    user_id INTEGER, author_name TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT UNIQUE, org_id INTEGER, kind TEXT NOT NULL DEFAULT 'einzel',
    status TEXT NOT NULL DEFAULT 'offen', issue_date TEXT, service_from TEXT, service_to TEXT, due_date TEXT, net REAL NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 19, vat REAL NOT NULL DEFAULT 0, gross REAL NOT NULL DEFAULT 0, paid REAL NOT NULL DEFAULT 0, fees REAL NOT NULL DEFAULT 0,
    dunning_level INTEGER NOT NULL DEFAULT 0, last_dunning_at TEXT, recipient TEXT NOT NULL DEFAULT '{}', lines TEXT NOT NULL DEFAULT '[]',
    file_id INTEGER, sent_at TEXT, sent_to TEXT, note TEXT, created_by INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS dunnings (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, level INTEGER NOT NULL, fee REAL NOT NULL DEFAULT 0,
    due_date TEXT, file_id INTEGER, sent_at TEXT, sent_to TEXT, created_by INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL,
    method TEXT, note TEXT, created_by INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, street TEXT, zip TEXT, city TEXT, country TEXT,
    email TEXT, phone TEXT, iban TEXT, bic TEXT, vat_id TEXT, customer_no TEXT, note TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS purchase_invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, number TEXT, date TEXT, due_date TEXT,
    net REAL NOT NULL DEFAULT 0, vat REAL NOT NULL DEFAULT 0, gross REAL NOT NULL DEFAULT 0, category TEXT, status TEXT NOT NULL DEFAULT 'offen',
    pay_date TEXT, file_id INTEGER, note TEXT, paid_at TEXT, created_by INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS payruns (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'offen', total REAL NOT NULL DEFAULT 0,
    items TEXT NOT NULL DEFAULT '[]', closed_at TEXT, released_by INTEGER, released_at TEXT, file_id INTEGER, created_at TEXT NOT NULL)`,

  // Sonstiges
  `CREATE TABLE IF NOT EXISTS mail_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, sender TEXT, recipient TEXT, subject TEXT, html TEXT,
    status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS geo_cache (zip TEXT PRIMARY KEY, lat REAL, lon REAL, city TEXT, source TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS surveys (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, org_id INTEGER, kind TEXT NOT NULL,
    answer TEXT, rating INTEGER, sent_at TEXT, answered_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS jobs (key TEXT PRIMARY KEY, last_run TEXT, last_result TEXT)`
];

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_req_type ON requests(type, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_req_status ON requests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_req_account ON requests(customer_account)`,
  `CREATE INDEX IF NOT EXISTS idx_events_req ON events(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_at ON audit(at)`,
  `CREATE INDEX IF NOT EXISTS idx_asg_req ON assignments(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_asg_org ON assignments(org_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_offers_req ON offers(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pu_org ON partner_users(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notif ON notifications(recipient_type, recipient_id, read_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets ON tickets(status, priority)`,
  `CREATE INDEX IF NOT EXISTS idx_tmsg ON ticket_messages(ticket_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bill ON billing_items(org_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_accnotes ON acc_notes(invoice_id, item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_org ON invoices(org_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_chatmsg ON chat_messages(chat_id, id)`,
  `CREATE INDEX IF NOT EXISTS idx_pev ON partner_events(request_id)`
];

// Zusätzliche Spalten bestehender Tabellen (Migration vom alten Dashboard)
const EXTRA_COLUMNS = {
  requests: {
    plz: 'TEXT', city: 'TEXT', radius_km: 'INTEGER', lat: 'REAL', lon: 'REAL', zustand: 'TEXT', pay_kind: 'TEXT', budget: 'TEXT', source: 'TEXT',
    deadline_at: 'TEXT', dispatched_at: 'TEXT', evaluated_at: 'TEXT', presented_at: 'TEXT', decided_at: 'TEXT', won_assignment_id: 'INTEGER',
    spam_state: 'TEXT', spam_by: 'INTEGER', spam_reason: 'TEXT', deleted: "INTEGER NOT NULL DEFAULT 0", billed: "INTEGER NOT NULL DEFAULT 0",
    feedback_state: 'TEXT', customer_note_at: 'TEXT', customer_note_unread: "INTEGER NOT NULL DEFAULT 0", first_action_at: 'TEXT', status_note: 'TEXT'
  },
  notes: { visibility: "TEXT NOT NULL DEFAULT 'intern'", org_id: 'INTEGER', author_type: "TEXT NOT NULL DEFAULT 'staff'", acc_relevant: 'INTEGER NOT NULL DEFAULT 0', acc_marked_by: 'TEXT', acc_marked_at: 'TEXT' },
  users: { extra_perms: "TEXT NOT NULL DEFAULT '[]'", revoked_perms: "TEXT NOT NULL DEFAULT '[]'", department: 'TEXT', phone: 'TEXT',
    must_change_pw: "INTEGER NOT NULL DEFAULT 0", created_by: 'INTEGER', prev_login: 'TEXT' },
  sessions: { area_until: 'TEXT' },
  mail_outbox: { server_reply: 'TEXT' },
  orgs: { reminder_due_days: 'INTEGER', dunning_fee_1: 'REAL', dunning_fee_2: 'REAL', dunning_due_days: 'INTEGER', dunning_due_days_2: 'INTEGER' },
  invoices: { mail_status: 'TEXT', mail_error: 'TEXT', intro: 'TEXT' },
  billing_items: { cancel_reason: 'TEXT', cancelled_at: 'TEXT', cancelled_by: 'TEXT', prev_status: 'TEXT' }
};

const OLD_STATUS_MAP = { neu: 'eingang', in_bearbeitung: 'in_bearbeitung', angebot_gesendet: 'angebot_beim_kunden', abgeschlossen: 'kontaktdaten_versendet', abgelehnt: 'angebot_abgelehnt' };
const OLD_ROLE_MAP = { admin: 'admin', bearbeiter: 'teamleitung', team_angebote: 'vertrieb', team_ankauf: 'vertrieb' };

// Rechte, die nach dem Start hinzukamen: welche festen Rollen sie automatisch bekommen
const NEW_ROLE_PERMS = { acc_cancel: ['gf', 'buchhaltung'] };

let migrated = false;
async function migrate(db) {
  if (migrated) return;
  for (const sql of SCHEMA) await db.prepare(sql).run();
  for (const [table, cols] of Object.entries(EXTRA_COLUMNS)) {
    const have = new Set(((await db.prepare(`PRAGMA table_info(${table})`).all()).results || []).map((c) => c.name));
    for (const [col, type] of Object.entries(cols)) if (!have.has(col)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`).run();
  }
  for (const sql of INDEXES) await db.prepare(sql).run();
  // Rollen (feste Rollen, Rechte durch Admin anpassbar)
  for (const [key, r] of Object.entries(STAFF_ROLES)) {
    await db.prepare('INSERT OR IGNORE INTO roles (key, name, perms, builtin) VALUES (?, ?, ?, 1)').bind(key, r.label, JSON.stringify(ROLE_PERMS[key])).run();
  }
  // Neue Rechte einmalig den vorgesehenen festen Rollen ergänzen (vom Admin später änderbar)
  for (const [perm, roles] of Object.entries(NEW_ROLE_PERMS)) {
    const flag = '_perm_' + perm;
    if (await db.prepare('SELECT value FROM settings WHERE key = ?').bind(flag).first()) continue;
    for (const key of roles) {
      const row = await db.prepare('SELECT perms FROM roles WHERE key = ?').bind(key).first();
      if (!row) continue;
      const perms = jparse(row.perms, []); if (!perms.includes(perm)) { perms.push(perm); await db.prepare('UPDATE roles SET perms = ? WHERE key = ?').bind(JSON.stringify(perms), key).run(); }
    }
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, '1', ?, 'system')").bind(flag, nowIso()).run();
  }
  // Einmalig: Rechnungen, die als versendet markiert sind, obwohl keine E-Mail rausging, korrigieren
  if (!(await db.prepare("SELECT value FROM settings WHERE key = '_fix_invoice_sent'").first())) {
    await db.prepare(`UPDATE invoices SET mail_status = 'nicht_konfiguriert', mail_error = 'E-Mail-Versand war nicht eingerichtet', sent_at = NULL
      WHERE sent_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mail_outbox m WHERE m.category = 'invoice' AND m.status = 'gesendet' AND instr(m.subject, invoices.number) > 0)`).run();
    await db.prepare("UPDATE invoices SET mail_status = 'gesendet' WHERE sent_at IS NOT NULL AND mail_status IS NULL").run();
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_fix_invoice_sent', '1', ?, 'system')").bind(nowIso()).run();
  }
  // Einmalig: Standard-Konditionen (Zahlungsziel, Mahnfristen, Mahngebühren) bei allen Geschäftspartnern hinterlegen
  if (!(await db.prepare("SELECT value FROM settings WHERE key = '_org_terms_v2'").first())) {
    const val = async (k) => { const r = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(k).first(); const v = r ? jparse(r.value, null) : null; return v === null || v === '' ? DEFAULT_SETTINGS[k] : v; };
    for (const [col, key] of Object.entries(ORG_TERMS)) await db.prepare(`UPDATE orgs SET ${col} = ? WHERE ${col} IS NULL`).bind(await val(key)).run();
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_org_terms_v2', '1', ?, 'system')").bind(nowIso()).run();
  }
  // Einmalig: bisherige Einzel-Notiz der Abrechnungsfälle in die neue Notizliste übernehmen
  if (!(await db.prepare("SELECT value FROM settings WHERE key = '_acc_notes_v1'").first())) {
    await db.prepare("INSERT INTO acc_notes (item_id, text, author_name, created_at) SELECT id, note, 'Buchhaltung', updated_at FROM billing_items WHERE note IS NOT NULL AND trim(note) != ''").run();
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_acc_notes_v1', '1', ?, 'system')").bind(nowIso()).run();
  }
  // Admin hat immer alle Rechte (auch neu hinzugekommene)
  await db.prepare("UPDATE roles SET perms = ?, name = 'Admin', builtin = 1 WHERE key = 'admin'").bind(JSON.stringify(PERM_KEYS)).run();
  // Alte Rollen und Status übernehmen (einmalig)
  const done = await db.prepare("SELECT value FROM settings WHERE key = '_migrated_v2'").first();
  if (!done) {
    for (const [o, n] of Object.entries(OLD_ROLE_MAP)) if (o !== n) await db.prepare('UPDATE users SET role_key = ? WHERE role_key = ?').bind(n, o).run();
    for (const [o, n] of Object.entries(OLD_STATUS_MAP)) if (o !== n) await db.prepare("UPDATE requests SET status = ? WHERE status = ? AND type IN ('deal','sell')").bind(n, o).run();
    await db.prepare("DELETE FROM roles WHERE key IN ('bearbeiter','team_angebote','team_ankauf') AND key NOT IN (SELECT role_key FROM users)").run();
    await migrateOldTickets(db);
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_migrated_v2', '1', ?, 'system')").bind(nowIso()).run();
  }
  migrated = true;
}
// Alte Support-/Widerruf-/Partner-Einträge aus der Anfragetabelle werden Support-Tickets
async function migrateOldTickets(db) {
  const rows = (await db.prepare("SELECT * FROM requests WHERE type NOT IN ('deal','sell')").all()).results || [];
  for (const r of rows) {
    const def = TICKET_FORMS[r.type] || { tag: 'Intern', category: r.type, priority: 'normal' };
    const d = jparse(r.data, {});
    const body = Object.entries(d).filter(([k]) => !/^_/.test(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
    const t = await db.prepare(`INSERT INTO tickets (tag, kind, category, subject, priority, status, requester_type, requester_name, requester_email, created_at, updated_at)
      VALUES (?, 'ticket', ?, ?, ?, ?, 'web', ?, ?, ?, ?) RETURNING id`).bind(def.tag, def.category, r.summary || def.category, def.priority,
      ['abgeschlossen', 'abgelehnt'].includes(r.status) ? 'erledigt' : 'neu', r.customer_name || '', r.email || '', r.created_at, r.updated_at).first();
    await db.prepare("INSERT INTO ticket_messages (ticket_id, author_type, author_name, text, created_at) VALUES (?, 'requester', ?, ?, ?)").bind(t.id, r.customer_name || '', body || '(ohne Text)', r.created_at).run();
    await db.prepare('UPDATE requests SET deleted = 1, status = ? WHERE id = ?').bind('spam', r.id).run();
    await db.prepare("INSERT INTO events (request_id, action, detail, created_at) VALUES (?, 'migriert', ?, ?)").bind(r.id, 'Als Support-Ticket #' + t.id + ' übernommen', nowIso()).run();
  }
}
function resetMigrationFlag() { migrated = false; }

/* ---------- Abfrage-Helfer ---------- */
const DB = {
  async all(db, sql, ...args) { return (await db.prepare(sql).bind(...args).all()).results || []; },
  async one(db, sql, ...args) { return (await db.prepare(sql).bind(...args).first()) || null; },
  async run(db, sql, ...args) { return db.prepare(sql).bind(...args).run(); },
  async val(db, sql, ...args) { const r = await db.prepare(sql).bind(...args).first(); return r ? Object.values(r)[0] : null; },
  async insert(db, table, obj) {
    const keys = Object.keys(obj);
    const r = await db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) RETURNING id`).bind(...keys.map((k) => norm(obj[k]))).first();
    return r ? r.id : null;
  },
  async update(db, table, id, obj, idCol = 'id') {
    const keys = Object.keys(obj); if (!keys.length) return;
    await db.prepare(`UPDATE ${table} SET ${keys.map((k) => k + ' = ?').join(', ')} WHERE ${idCol} = ?`).bind(...keys.map((k) => norm(obj[k])), id).run();
  }
};
const norm = (v) => (v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : (typeof v === 'boolean' ? (v ? 1 : 0) : v));
const inList = (arr) => arr.map(() => '?').join(',');
