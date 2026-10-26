// Testumgebung: echte SQLite-Datenbank (node:sqlite) als D1-Ersatz, abgefangene Netzaufrufe, steuerbare Uhr
import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';

// Wie Cloudflare Workers: PBKDF2 mit mehr als 100.000 Runden wird abgelehnt
for (const fn of ['deriveKey', 'deriveBits']) {
  const orig = crypto.subtle[fn].bind(crypto.subtle);
  crypto.subtle[fn] = (alg, ...rest) => { if (alg && alg.name === 'PBKDF2' && alg.iterations > 100000) return Promise.reject(new Error(`Pbkdf2 failed: iteration counts above 100000 are not supported (requested ${alg.iterations}).`)); return orig(alg, ...rest); };
}
export function makeD1() {
  const sq = new DatabaseSync(':memory:');
  // Zählt Abfragen wie Cloudflare D1 (db.batch = eine Abfrage), um das Limit je Aufruf zu prüfen
  const D = { _q: 0 };
  const stmt = (sql) => { let args = []; const st = {
    bind(...a) { args = a.map((x) => (x === undefined ? null : typeof x === 'boolean' ? (x ? 1 : 0) : x)); return st; },
    _all() { return { results: sq.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
    async run() { D._q++; const r = sq.prepare(sql).run(...args); return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
    async first() { D._q++; const r = sq.prepare(sql).get(...args); return r ? { ...r } : null; },
    async all() { D._q++; return { results: sq.prepare(sql).all(...args).map((r) => ({ ...r })) }; } }; return st; };
  return Object.assign(D, { prepare: stmt, batch: async (list) => { D._q++; sq.exec('BEGIN'); try { const out = list.map((s) => s._all()); sq.exec('COMMIT'); return out; } catch (e) { sq.exec('ROLLBACK'); throw e; } }, _sq: sq });
}
export function makeR2() { const m = new Map(); return { async put(k, v) { m.set(k, new Uint8Array(v)); }, async get(k) { const v = m.get(k); return v ? { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) } : null; }, async delete(k) { m.delete(k); }, _m: m }; }

export const GEO = { '49451': [52.5833, 8.1167, 'Holdorf'], '49074': [52.2726, 8.0498, 'Osnabrück'], '28195': [53.0793, 8.8017, 'Bremen'], '80331': [48.1374, 11.5755, 'München'], '49377': [52.7303, 8.2840, 'Vechta'] };
export const mails = [];
export function installFetch() {
  const real = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('https://api.brevo.com/')) { const b = JSON.parse(init.body); mails.push(b); return new Response('{"messageId":"x"}', { status: 201 }); }
    if (url.startsWith('https://api.zippopotam.us/de/')) { const z = url.split('/').pop(); const g = GEO[z]; if (!g) return new Response('{}', { status: 404 }); return new Response(JSON.stringify({ places: [{ 'place name': g[2], latitude: String(g[0]), longitude: String(g[1]) }] }), { status: 200 }); }
    if (url.startsWith('https://backup.test/')) return new Response('', { status: 200 });
    if (url.startsWith('http://w.test') || url.startsWith('https://w.test')) throw new Error('unexpected self fetch');
    return real(input, init);
  };
}
export const SECRET = 'test-secret';
export const sig = (m) => createHmac('sha256', SECRET).update(m).digest('hex');
export const nowSec = () => String(Math.floor((globalThis.__KFL_NOW ?? Date.now()) / 1000));
export function setNow(isoOrMs) { globalThis.__KFL_NOW = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs); }
export function advance(hours) { globalThis.__KFL_NOW += hours * 3600e3; }

export const QMAX = { n: 0, path: '' };
export const QOVER = new Map();
export function client(worker, env) {
  const jar = {};
  const call = async (method, path, body, { who, origin, raw } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    const isPublic = path === '/' || path.startsWith('/my/');
    headers.Origin = origin || (isPublic ? 'https://kfl-group.com' : 'https://w.test');
    if (!isPublic) headers['X-KFL'] = '1';
    if (who && jar[who]) headers.Cookie = jar[who];
    headers['CF-Connecting-IP'] = '203.0.113.' + (who ? who.length : 1);
    if (env.DB) env.DB._q = 0;
    const res = await worker.fetch(new Request('https://w.test' + path, { method, headers, body: method === 'GET' ? undefined : JSON.stringify(body || {}) }), env);
    if (env.DB && env.DB._q > (QMAX.n || 0)) Object.assign(QMAX, { n: env.DB._q, path: method + ' ' + path });
    if (env.DB && env.DB._q > 50) { const k = method + ' ' + path.replace(/\d+/g, ':n').split('?')[0]; QOVER.set(k, Math.max(QOVER.get(k) || 0, env.DB._q)); }
    const sc = res.headers.get('Set-Cookie'); if (sc && who) jar[who] = sc.split(';')[0];
    if (raw) return res;
    let j = null; const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('json')) j = await res.json(); else j = { _text: await res.text() };
    return { status: res.status, ...j };
  };
  return { call, jar, get: (p, o) => call('GET', p, null, o), post: (p, b, o) => call('POST', p, b, o), patch: (p, b, o) => call('PATCH', p, b, o), del: (p, b, o) => call('DELETE', p, b, o) };
}
export function check(cond, msg, extra) { if (cond) { console.log('  ✓ ' + msg); return true; } console.log('  ✗ ' + msg + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 600) : '')); process.exitCode = 1; check.fails = (check.fails || 0) + 1; return false; }
export async function cron(worker, env) { const p = []; if (env.DB) env.DB._q = 0; await worker.scheduled({}, env, { waitUntil: (x) => p.push(x) }); await Promise.all(p); if (process.env.QDEBUG && env.DB._q > +(process.env.QMIN||50)) console.log('    [cron', new Date(globalThis.__KFL_NOW).toISOString(), env.DB._q, 'Abfragen]'); if (env.DB && env.DB._q > (QMAX.n || 0)) Object.assign(QMAX, { n: env.DB._q, path: 'cron' }); }
// Mehrere aufeinanderfolgende Cron-Durchläufe (alle 5 Minuten; je Durchlauf höchstens ein großer Tagesjob)
export async function ticks(worker, env, n = 6) { for (let i = 0; i < n; i++) await cron(worker, env); }
process.on('exit', () => { if (process.env.QDEBUG) for (const [k, n] of QOVER) console.log(`    >50: ${n} ${k}`); if (QMAX.n) console.log(`  · max. D1-Abfragen je Aufruf: ${QMAX.n} (${QMAX.path})`); });
