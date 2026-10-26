/* ============================================================
   KFL Plattform 2.0 (Cloudflare Worker)
   POST /            Formular-Eingang der Webseite
   /admin            Internes Dashboard          /api/…   Schnittstelle intern
   /partner          Partner-Dashboard           /papi/…  Schnittstelle Partner
   POST /my/…        Kundenbereich „Meine Anfragen“ (signiert vom Shopify-Theme)
   /c/…              Kunden-Links aus E-Mails (Rückfrage, Bewertung)
   Cron alle 5 Min.  Fristen, Auswertung, Support, Backup, Mahnungen, Abschlüsse
   ============================================================ */

function pageResponse(html) {
  const nonce = randomHex(16);
  return new Response(html.replace(/__NONCE__/g, nonce), { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
    'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', ...SEC_HEADERS } });
}

async function jobDue(db, key, period) {
  const row = await DB.one(db, 'SELECT last_run FROM jobs WHERE key = ?', key);
  return !row || row.last_run !== period;
}
async function jobDone(db, key, period, result) { await DB.run(db, 'INSERT OR REPLACE INTO jobs (key, last_run, last_result) VALUES (?, ?, ?)', key, period, JSON.stringify(result ?? null).slice(0, 2000)); }

async function runJobs(ctx, { force } = {}) {
  const s = await settingsOf(ctx);
  ctx.actor = ctx.actor || { type: 'system', id: null, name: 'System' };
  const res = {};
  const safe = async (name, fn) => { try { res[name] = await fn(); } catch (e) { res[name] = 'Fehler: ' + e.message; console.log('Job ' + name, e.stack || e.message); } };
  await safe('anfragen', () => runRequestJobs(ctx));
  await safe('archiv', async () => { const r = await ctx.db.prepare("UPDATE assignments SET archived = 1 WHERE archived = 0 AND status IN ('geschlossen','verloren','gescheitert') AND updated_at < ?").bind(isoOf(nowMs() - 24 * 3600e3)).run(); return r.meta ? r.meta.changes : 0; });
  await safe('support', () => runSupportJobs(ctx));
  const p = berlinParts(nowMs()), day = berlinDate(nowMs()), hm = p.h * 60 + p.mi;
  // Höchstens ein großer Tagesjob je Durchlauf (alle 5 Minuten) – jeder Aufruf hat bei Cloudflare ein eigenes Abfragebudget
  let heavy = false; const slot = () => force || !heavy;
  // Backup täglich ab 0:01 (Berliner Zeit)
  if (force === 'backup' || (slot() && hm >= (s.backup_hour * 60 + s.backup_minute) && await jobDue(ctx.db, 'backup', day))) {
    await safe('backup', () => createBackup(ctx, { kind: force === 'backup' ? 'manuell' : 'auto' }));
    await safe('aufbewahrung', () => retentionJobs(ctx));
    await jobDone(ctx.db, 'backup', day, res.backup); heavy = true;
  }
  // Automatische Mahnungen täglich ab 8:00
  if (force === 'mahnung' || (slot() && hm >= 8 * 60 && await jobDue(ctx.db, 'mahnung', day))) { await safe('mahnung', () => runDunningJobs(ctx)); await jobDone(ctx.db, 'mahnung', day, res.mahnung); heavy = true; }
  // Tagesabschluss zur eingestellten Uhrzeit
  const [ch, cm] = String(s.day_close_time || '18:00').split(':').map((x) => toInt(x, 0));
  if (force === 'tagesabschluss' || (slot() && hm >= ch * 60 + cm && await jobDue(ctx.db, 'tagesabschluss', day))) { await safe('tagesabschluss', () => runDayClose(ctx)); await jobDone(ctx.db, 'tagesabschluss', day, res.tagesabschluss); heavy = true; }
  // Finanzbuchhaltung: Monatsabschluss am 1. (ab 1:00 Uhr) für den Vormonat, Jahresabschluss am 1. Januar
  if (force === 'fibu' || (slot() && hm >= 60 && await jobDue(ctx.db, 'fibu', day))) { await safe('fibu', () => runFibuJobs(ctx, { force: force === 'fibu' })); const f = res.fibu; if (f && typeof f === 'object') res.fibu = f.result; if (!(f && f.pending)) await jobDone(ctx.db, 'fibu', day, res.fibu); heavy = true; }
  // Sammelrechnungen am letzten Tag des Monats
  const month = day.slice(0, 7);
  const isLast = p.d === lastDayOfMonth(p.y, p.m);
  // je Durchlauf ein Partner; nicht fertig gewordene Läufe werden am 1. des Folgemonats bis 12 Uhr für den Vormonat fortgesetzt
  const target = isLast && p.h >= toInt(s.monthly_run_hour, 23) ? month : (p.d === 1 && p.h < 12 ? prevPeriod(month) : null);
  if (force === 'monat' || (slot() && target && await jobDue(ctx.db, 'monatsrechnung', target))) {
    const tm = target || month; let pending = false, count = 0;
    await safe('monatsrechnung', async () => { const r = await runMonthlyInvoices(ctx, { month: tm, max: force === 'monat' ? 50 : 1 }); pending = r.pending; count = r.count; return count; });
    if (!pending) await jobDone(ctx.db, 'monatsrechnung', tm, count);
  }
  return res;
}

// Einmalige Übernahme aus der Datenbank des alten Dashboards (Binding OLD_DB)
async function importOldDatabase(ctx) {
  const old = ctx.env.OLD_DB;
  need(old, 400, 'Keine alte Datenbank verbunden (Binding OLD_DB).');
  const have = await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests');
  need(!have, 409, 'Im neuen System sind bereits Anfragen vorhanden – Import nur in eine leere Datenbank möglich.');
  const counts = {};
  for (const [tbl, cols] of [['requests', ['id', 'type', 'status', 'priority', 'assignee_id', 'customer_name', 'email', 'phone', 'brand', 'model', 'vehicle', 'summary', 'customer_account', 'page', 'data', 'created_at', 'updated_at']],
    ['notes', ['id', 'request_id', 'user_id', 'text', 'created_at']], ['events', ['id', 'request_id', 'user_id', 'action', 'detail', 'created_at']],
    ['users', ['id', 'email', 'name', 'role_key', 'pass_hash', 'pass_salt', 'active', 'invite_hash', 'invite_expires', 'failed_logins', 'locked_until', 'created_at', 'last_login']]]) {
    const rows = (await old.prepare(`SELECT ${cols.join(', ')} FROM ${tbl}`).all()).results || [];
    for (const r of rows) await ctx.db.prepare(`INSERT OR REPLACE INTO ${tbl} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map((c) => r[c] ?? null)).run();
    counts[tbl] = rows.length;
  }
  for (const [o, n] of Object.entries(OLD_ROLE_MAP)) if (o !== n) await DB.run(ctx.db, 'UPDATE users SET role_key = ? WHERE role_key = ?', n, o);
  for (const [o, n] of Object.entries(OLD_STATUS_MAP)) if (o !== n) await DB.run(ctx.db, "UPDATE requests SET status = ? WHERE status = ? AND type IN ('deal','sell')", n, o);
  await DB.run(ctx.db, 'UPDATE requests SET deleted = 0, billed = 0 WHERE deleted IS NULL');
  for (const r of await DB.all(ctx.db, "SELECT id, type, data FROM requests WHERE type IN ('deal','sell')")) {
    const c = requestColumns(r.type, jparse(r.data, {}));
    await DB.update(ctx.db, 'requests', r.id, { brand: c.brand, model: c.model, vehicle: c.vehicle, plz: c.plz, city: c.city, zustand: c.zustand, pay_kind: c.pay_kind, budget: c.budget, radius_km: 0 });
  }
  await migrateOldTickets(ctx.db);
  const maxId = await DB.val(ctx.db, 'SELECT MAX(id) FROM requests');
  if (maxId) await DB.run(ctx.db, "INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('requests', ?)", maxId);
  return counts;
}

// Einmalige automatische Übernahme der Altdaten beim ersten Start mit leerer Datenbank (Binding OLD_DB)
let autoImportDone = false;
async function autoImport(ctx) {
  if (autoImportDone || !ctx.env.OLD_DB) return;
  if (await rawSetting(ctx.db, '_old_import')) { autoImportDone = true; return; }
  const have = (await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests')) + (await DB.val(ctx.db, 'SELECT COUNT(*) FROM users'));
  let result = { uebersprungen: 'Datenbank war nicht leer' };
  if (!have) {
    const actor = ctx.actor; ctx.actor = { type: 'system', id: null, name: 'System' };
    try { result = await importOldDatabase(ctx); } catch (e) { result = { fehler: e.message }; console.log('Altdaten-Import', e.stack || e.message); }
    await audit(ctx, 'altdaten_importiert', 'system', null, result);
    ctx.actor = actor;
  }
  await setRawSetting(ctx.db, '_old_import', JSON.stringify({ at: nowIso(), result }));
  autoImportDone = true;
}

async function makeCtx(request, env, url) {
  const ip = request ? clientIp(request) : '';
  let origin = url ? url.origin : (env.PUBLIC_ORIGIN || '');
  if (!url && !origin) origin = (await rawSetting(env.DB, '_origin')) || '';
  if (url && !(await rawSetting(env.DB, '_origin'))) await setRawSetting(env.DB, '_origin', url.origin);
  return { env, db: env.DB, request, origin, ipHash: ip ? (await sha256Hex('kfl-ip:' + ip)).slice(0, 24) : null, actor: null };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (!env.DB) return new Response('KFL Plattform: D1-Datenbank (Binding "DB") fehlt.', { status: 503 });
      await migrate(env.DB);
      const ctx = await makeCtx(request, env, url);
      await autoImport(ctx);
      const p = url.pathname;
      if (p === '/' && (request.method === 'POST' || request.method === 'OPTIONS')) return await handleForm(ctx);
      if (p.startsWith('/my/')) return await handleMy(ctx, url);
      if (p.startsWith('/c/')) return await handleCustomerLinks(ctx, url);
      if (p === '/admin' || p === '/admin/') return pageResponse(STAFF_HTML);
      if (p === '/partner' || p === '/partner/') return pageResponse(PARTNER_HTML);
      if (p.startsWith('/api/')) return await handleStaffApi(ctx, url);
      if (p.startsWith('/papi/')) return await handlePartnerApi(ctx, url);
      if (p === '/health') return out({ ok: true, version: APP_VERSION });
      if (p === '/') return Response.redirect(url.origin + '/partner', 302);
      return new Response('Nicht gefunden', { status: 404 });
    } catch (e) {
      if (e instanceof HttpError) {
        const origin = request.headers.get('Origin') || '';
        const extra = (url.pathname === '/' || url.pathname.startsWith('/my/')) ? formCors(origin) : {};
        return out({ ok: false, error: e.message }, e.status, extra);
      }
      console.log('Fehler', e && e.stack || e);
      return out({ ok: false, error: 'Interner Fehler' }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    await migrate(env.DB);
    const c = await makeCtx(null, env, null);
    c.actor = { type: 'system', id: null, name: 'System' };
    await autoImport(c);
    ctx.waitUntil(runJobs(c));
  }
};
