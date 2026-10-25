/* ============================================================
   Hilfsfunktionen: Zeit (Europe/Berlin), Geschäftszeit, Texte
   ============================================================ */

// Uhr – in Tests über globalThis.__KFL_NOW steuerbar
const nowMs = () => (typeof globalThis.__KFL_NOW === 'number' ? globalThis.__KFL_NOW : Date.now());
const nowIso = () => new Date(nowMs()).toISOString();
const isoOf = (ms) => new Date(ms).toISOString();
const msOf = (iso) => (iso ? Date.parse(iso) : NaN);

const TZ = 'Europe/Berlin';
const _dtf = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
const WD_MAP = { Mon: 'mo', Tue: 'di', Wed: 'mi', Thu: 'do', Fri: 'fr', Sat: 'sa', Sun: 'so' };

// Datumsteile in Berliner Zeit
function berlinParts(ms) {
  const o = {};
  for (const p of _dtf.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, wd: WD_MAP[o.weekday] };
}
function tzOffsetMs(ms) {
  const p = berlinParts(ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}
// Berliner Ortszeit → UTC-Millisekunden (Tag/Monat dürfen überlaufen)
function berlinToUtc(y, m, d, h = 0, mi = 0) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - tzOffsetMs(guess);
  const off2 = tzOffsetMs(t);
  t = guess - off2;
  return t;
}
const berlinDate = (ms) => { const p = berlinParts(ms); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
const berlinTime = (ms) => { const p = berlinParts(ms); return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; };
function fmtDE(ms, withTime = true) {
  if (!ms && ms !== 0) return '';
  if (typeof ms === 'string') ms = msOf(ms);
  if (isNaN(ms)) return '';
  const p = berlinParts(ms);
  const d = `${String(p.d).padStart(2, '0')}.${String(p.m).padStart(2, '0')}.${p.y}`;
  return withTime ? `${d}, ${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')} Uhr` : d;
}
const fmtDateDE = (iso) => fmtDE(iso, false);
// ISO-Kalenderwoche
function isoWeek(ms) {
  const p = berlinParts(ms);
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((d - y0) / 86400000 + 1) / 7), year: d.getUTCFullYear() };
}
function lastDayOfMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function addDaysIso(iso, days) { const t = new Date(msOf(iso)); t.setUTCDate(t.getUTCDate() + days); return t.toISOString(); }
function addDaysDate(dateStr, days) { const t = new Date(dateStr + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + days); return t.toISOString().slice(0, 10); }

/* ---------- Geschäftszeit ----------
   Gezählt werden nur ganze Kalendertage Montag bis Freitag (0:00–24:00 Berliner Zeit),
   Samstag nur, wenn der Partner samstags geöffnet hat. Sonntag zählt nie. */
function countsDay(wd, opts) { if (wd === 'so') return false; if (wd === 'sa') return !!(opts && opts.saturday); return true; }
function addBusinessHours(startMs, hours, opts = {}) {
  let remaining = Math.max(0, hours) * 3600 * 1000;
  let t = startMs;
  for (let guard = 0; guard < 400; guard++) {
    const p = berlinParts(t);
    const next = berlinToUtc(p.y, p.m, p.d + 1, 0, 0);
    if (!countsDay(p.wd, opts)) { t = next; continue; }
    const avail = next - t;
    if (avail >= remaining) return t + remaining;
    remaining -= avail; t = next;
  }
  return t;
}
// verbleibende Geschäftszeit in ms bis zu einem Zeitpunkt
function businessMsBetween(fromMs, toMs, opts = {}) {
  if (toMs <= fromMs) return 0;
  let t = fromMs, sum = 0;
  for (let guard = 0; guard < 400 && t < toMs; guard++) {
    const p = berlinParts(t);
    const next = Math.min(berlinToUtc(p.y, p.m, p.d + 1, 0, 0), toMs);
    if (countsDay(p.wd, opts)) sum += next - t;
    t = next;
  }
  return sum;
}
const saturdayOpen = (opening) => { try { const o = typeof opening === 'string' ? JSON.parse(opening) : opening; return !!(o && o.sa && o.sa[0]); } catch (e) { return false; } };

/* ---------- Texte / Werte ---------- */
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const clean = (v) => String(v ?? '').trim().slice(0, 4000);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''));
const plzOk = (p) => /^[0-9]{5}$/.test(String(p || '').trim());
const toInt = (v, d = 0) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
const toNum = (v, d = null) => {
  if (v === null || v === undefined || v === '') return d;
  if (typeof v === 'number') return isFinite(v) ? v : d;
  let s = String(v).trim().replace(/[€\s]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : d;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const jparse = (s, d = null) => { if (s === null || s === undefined || s === '') return d; if (typeof s !== 'string') return s; try { return JSON.parse(s); } catch (e) { return d; } };
const toNumber = (id) => id + NUMBER_OFFSET;
const fromNumber = (n) => parseInt(String(n).replace(/[^0-9]/g, ''), 10) - NUMBER_OFFSET;
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const uniq = (a) => [...new Set(a)];
const statusLabel = (list, k) => (list.find((s) => s.key === k) || {}).label || k;
const normBrand = (b) => String(b || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/* ---------- HTTP ---------- */
const SEC_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
function out(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...extra } });
}
const fail = (status, error, extra) => out({ ok: false, error, ...(extra || {}) }, status);
async function readJson(request, maxBytes = 2_000_000) {
  const len = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (len > maxBytes) throw new HttpError(413, 'Die Daten sind zu groß.');
  try { const b = await request.json(); return b && typeof b === 'object' ? b : {}; } catch (e) { return {}; }
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const need = (cond, status, msg) => { if (!cond) throw new HttpError(status, msg); };
const clientIp = (request) => request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
