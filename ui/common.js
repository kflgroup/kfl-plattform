'use strict';
/* ===== Gemeinsame Bausteine für internes und Partner-Dashboard ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = (s) => new Raw(String(s ?? ''));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const part = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : esc(v));
const html = (s, ...v) => raw(s.reduce((a, x, i) => a + x + (i < v.length ? part(v[i]) : ''), ''));
const when = (c, a, b) => (c ? a : b || '');

/* ---------- Schnittstelle ---------- */
const App = { base: '/api', onAuth: null, config: {}, user: null };
class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const qs = (q) => { if (!q) return ''; const p = Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''); return p.length ? '?' + p.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&') : ''; };
async function api(method, path, body) {
  const opt = { method, headers: { 'X-KFL': '1' }, credentials: 'same-origin' };
  if (method !== 'GET') { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body || {}); }
  let res;
  try { res = await fetch(App.base + path, opt); } catch (e) { throw new ApiError(0, 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.'); }
  let j = null; try { j = await res.json(); } catch (e) { /* keine JSON-Antwort */ }
  if (!res.ok || (j && j.ok === false)) {
    const err = new ApiError(res.status, (j && j.error) || `Unerwarteter Fehler (${res.status}).`);
    if (res.status === 401 && App.onAuth && !path.startsWith('/session') && !path.startsWith('/login')) App.onAuth();
    if (res.status === 428 && App.onPw) App.onPw();
    throw err;
  }
  return j;
}
const GET = (p, q) => api('GET', p + qs(q));
const POST = (p, b) => api('POST', p, b);
const PATCH = (p, b) => api('PATCH', p, b);
const DEL = (p, b) => api('DELETE', p, b);
const fileUrl = (p, q) => App.base + p + qs(q);

/* ---------- Format ---------- */
const TZ = 'Europe/Berlin';
const dtf = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const dtfT = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dtfH = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dtfL = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const toDate = (v) => (v instanceof Date ? v : /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? new Date(v + 'T12:00:00Z') : new Date(v));
const fDate = (v) => (v ? dtf.format(toDate(v)) : '–');
const fDT = (v) => (v ? dtfT.format(toDate(v)) : '–');
const fTime = (v) => (v ? dtfH.format(toDate(v)) : '');
const fLong = (v) => dtfL.format(toDate(v || new Date()));
const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const fEur = (n) => (n == null || n === '' || isNaN(+n) ? '–' : eur.format(+n));
const fNum = (n, d = 0) => (n == null || isNaN(+n) ? '–' : (+n).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 }));
const fPct = (n) => (n == null ? '–' : fNum(n, 1) + ' %');
function fRel(v) {
  if (!v) return '';
  const d = (Date.now() - toDate(v).getTime()) / 1000;
  if (d < 60) return 'gerade eben';
  if (d < 3600) return `vor ${Math.floor(d / 60)} Min.`;
  if (d < 86400) return `vor ${Math.floor(d / 3600)} Std.`;
  if (d < 7 * 86400) return `vor ${Math.floor(d / 86400)} ${Math.floor(d / 86400) === 1 ? 'Tag' : 'Tagen'}`;
  return fDate(v);
}
function fLeft(v) {
  if (!v) return '';
  const d = (toDate(v).getTime() - Date.now()) / 60000;
  if (d <= 0) return 'abgelaufen';
  const h = Math.floor(d / 60), m = Math.floor(d % 60);
  if (h >= 48) return `noch ${Math.floor(h / 24)} Tage`;
  return h ? `noch ${h} Std. ${m} Min.` : `noch ${m} Min.`;
}
const todayISO = () => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function isoWeekOf(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return { week: Math.ceil(((t - y) / 86400e3 + 1) / 7), year: t.getUTCFullYear() }; }
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
const plural = (n, one, many) => `${fNum(n)} ${n === 1 ? one : many}`;
const nl2br = (s) => raw(esc(s).replace(/\n/g, '<br>'));

/* ---------- Status ---------- */
function statusOf(list, key) { return (list || []).find((s) => s.key === key) || { key, label: key || '–', tone: 'neutral' }; }
const badge = (label, tone = 'neutral') => html`<span class="badge t-${tone}">${label}</span>`;
const statusBadge = (list, key) => { const s = statusOf(list, key); return badge(s.label, s.tone || 'neutral'); };

/* ---------- Icons (Linien, 24er Raster) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  euro: '<path d="M17 6.5A7 7 0 1 0 17 17.5"/><path d="M4 10h9M4 14h9"/>',
  partner: '<path d="M3 21V8l6-4 6 4v13"/><path d="M15 11h6v10"/><path d="M7 11h4M7 15h4M3 21h18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  support: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  news: '<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3"/>',
  log: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  car: '<path d="M5 17h14M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v4a1 1 0 0 1-1 1h-1M3 13v4a1 1 0 0 0 1 1h1M3 13h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  shop: '<path d="M4 7h16l-1.5 12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
};
const icon = (n, cls = '') => raw(`<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`);
const LOGO = raw('<span class="logo" aria-label="KFL – Kaufen Finanzieren Leasen"><b>KFL</b><i></i></span>');

/* ---------- Aktionen (CSP-konform ohne Inline-Handler) ---------- */
const ACT = {}, SUBMIT = {}, CHANGE = {}, INPUT = {};
async function run(fn, btn) {
  if (btn) { if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.classList.add('is-busy'); }
  try { return await fn(); }
  catch (e) { console.error(e); toast(e.message || 'Das hat nicht geklappt.', 'err'); }
  finally { if (btn) { delete btn.dataset.busy; btn.classList.remove('is-busy'); } }
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const fn = ACT[t.dataset.act]; if (!fn) return;
  e.preventDefault(); run(() => fn(t, e), t.tagName === 'BUTTON' ? t : null);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-submit]'); if (!f) return;
  e.preventDefault();
  const fn = SUBMIT[f.dataset.submit]; if (!fn) return;
  const btn = f.querySelector('button[type=submit]') || e.submitter;
  run(() => fn(formData(f), f, e.submitter), btn);
});
document.addEventListener('change', (e) => { const t = e.target.closest('[data-change]'); if (t && CHANGE[t.dataset.change]) run(() => CHANGE[t.dataset.change](t, e)); });
let inputTimer = null;
document.addEventListener('input', (e) => { const t = e.target.closest('[data-input]'); if (!t || !INPUT[t.dataset.input]) return; clearTimeout(inputTimer); inputTimer = setTimeout(() => run(() => INPUT[t.dataset.input](t, e)), 320); });

function formData(f) {
  const o = {};
  for (const el of f.elements) {
    if (!el.name || el.disabled) continue;
    const multi = el.name.endsWith('[]'), k = multi ? el.name.slice(0, -2) : el.name;
    if (el.type === 'checkbox') { if (multi) { o[k] = o[k] || []; if (el.checked) o[k].push(el.value); } else o[k] = el.checked; continue; }
    if (el.type === 'radio') { if (el.checked) o[k] = el.value; continue; }
    if (el.type === 'file') continue;
    if (el.tagName === 'SELECT' && el.multiple) { o[k] = [...el.selectedOptions].map((x) => x.value); continue; }
    if (multi) { (o[k] = o[k] || []).push(el.value); continue; }
    o[k] = el.value;
  }
  return o;
}
const fileToB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
async function fileField(input, { max = 10 } = {}) {
  const f = input && input.files && input.files[0]; if (!f) return null;
  if (f.size > max * 1024 * 1024) throw new Error(`Die Datei ist zu groß (max. ${max} MB).`);
  return { name: f.name, type: f.type || 'application/pdf', base64: await fileToB64(f) };
}

/* ---------- Rückmeldungen ---------- */
function toast(msg, tone = 'ok') {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast t-' + tone; t.innerHTML = part(html`${icon(tone === 'err' ? 'alert' : 'check')}<span>${msg}</span>`);
  box.appendChild(t); requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, tone === 'err' ? 6000 : 3200);
}
let modalStack = [];
function modal({ title, body, foot, wide, onClose, cls = '' }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = part(html`<div class="modal ${wide ? 'is-wide' : ''} ${cls}" role="dialog" aria-modal="true" aria-label="${title || 'Dialog'}">
    <header class="modal-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="Schließen">${icon('x')}</button></header>
    <div class="modal-body">${body}</div>${foot ? html`<footer class="modal-foot">${foot}</footer>` : ''}</div>`);
  document.body.appendChild(wrap); document.body.classList.add('has-modal');
  const prev = document.activeElement;
  const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 180); modalStack = modalStack.filter((m) => m !== api); if (!modalStack.length) document.body.classList.remove('has-modal'); if (prev && prev.focus) prev.focus(); if (onClose) onClose(); };
  const api = { el: wrap, close, set(bodyHtml) { $('.modal-body', wrap).innerHTML = part(bodyHtml); hydrate(wrap); } };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  modalStack.push(api);
  requestAnimationFrame(() => { wrap.classList.add('in'); const f = wrap.querySelector('[autofocus], input:not([type=hidden]), select, textarea, button.btn'); if (f) f.focus(); });
  hydrate(wrap);
  return api;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close(); });
function closeModal() { if (modalStack.length) modalStack[modalStack.length - 1].close(); }
// Formular im Dialog: resolve mit Daten oder null
function ask({ title, text, fields = raw(''), ok = 'Bestätigen', danger = false, wide = false }) {
  return new Promise((resolve) => {
    let done = false;
    const id = 'f' + Math.random().toString(36).slice(2);
    const m = modal({ title, wide, body: html`<form id="${id}" class="stack">${text ? html`<p class="lead">${text}</p>` : ''}${fields}</form>`,
      foot: html`<button class="btn btn-ghost" data-close type="button">Abbrechen</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="submit" form="${id}">${ok}</button>`,
      onClose: () => { if (!done) resolve(null); } });
    $('#' + id, m.el).addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; if (!f.reportValidity()) return; done = true; const d = formData(f); d._form = f; resolve(d); m.close(); });
  });
}
const confirmBox = (title, text, ok = 'Ja, fortfahren', danger = false) => ask({ title, text, ok, danger }).then((r) => !!r);

/* ---------- Formularfelder ---------- */
function field(label, input, hint) { return html`<label class="field"><span class="field-label">${label}</span>${input}${hint ? html`<span class="field-hint">${hint}</span>` : ''}</label>`; }
const inp = (name, value = '', { type = 'text', ph = '', req = false, attrs = '' } = {}) => raw(`<input name="${esc(name)}" type="${type}" value="${esc(value ?? '')}" placeholder="${esc(ph)}" ${req ? 'required' : ''} ${attrs}>`);
const area = (name, value = '', { rows = 4, ph = '', req = false } = {}) => raw(`<textarea name="${esc(name)}" rows="${rows}" placeholder="${esc(ph)}" ${req ? 'required' : ''}>${esc(value ?? '')}</textarea>`);
function sel(name, options, value, { attrs = '', empty } = {}) {
  const opts = (Array.isArray(options) ? options : Object.entries(options).map(([k, v]) => [k, v])).map((o) => (Array.isArray(o) ? o : typeof o === 'object' ? [o.key ?? o.value, o.label] : [o, o]));
  return raw(`<select name="${esc(name)}" ${attrs}>${empty !== undefined ? `<option value="">${esc(empty)}</option>` : ''}${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(value ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`);
}
const chk = (name, checked, label, value) => html`<label class="check"><input type="checkbox" name="${name}" ${value !== undefined ? raw(`value="${esc(value)}"`) : ''} ${checked ? raw('checked') : ''}><span>${label}</span></label>`;

/* ---------- Diagramme (SVG) ---------- */
function barChart(rows, { h = 160, valueFmt = fNum } = {}) {
  if (!rows.length) return html`<div class="empty-sm">Keine Daten im Zeitraum.</div>`;
  const max = Math.max(1, ...rows.map((r) => r.value)), step = Math.ceil(rows.length / 10);
  return html`<div class="cols" data-hpx="${h}">${rows.map((r, i) => html`<div class="col" title="${r.label}: ${valueFmt(r.value)}${r.second != null ? ' · ' + valueFmt(r.second) : ''}"><span class="col-v">${r.value ? valueFmt(r.value) : ''}</span>
    <span class="col-bar" data-h="${Math.round((r.value / max) * 80)}">${r.second ? html`<i data-h="${Math.round((r.second / Math.max(1, r.value)) * 100)}"></i>` : ''}</span><span class="col-l">${i % step === 0 ? r.short || r.label : ''}</span></div>`)}</div>`;
}
function hbars(rows, { fmt = fNum } = {}) {
  if (!rows.length) return html`<div class="empty-sm">Keine Daten im Zeitraum.</div>`;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return html`<div class="hbars">${rows.map((r) => html`<div class="hbar"><span class="hbar-l">${r.label}</span><span class="hbar-track"><i data-w="${Math.round((r.value / max) * 100)}"></i></span><span class="hbar-v num">${fmt(r.value)}</span></div>`)}</div>`;
}
function ring(pct, { size = 64, stroke = 7, label = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return raw(`<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${stroke}" fill="none" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/></svg>`);
}
// Breiten über CSSOM setzen (Inline-Styles sind per CSP gesperrt)
function hydrate(root = document) { for (const el of root.querySelectorAll('[data-w]')) el.style.width = el.dataset.w + '%'; for (const el of root.querySelectorAll('[data-h]')) el.style.height = Math.max(+el.dataset.h, +el.dataset.h ? 2 : 0) + '%'; for (const el of root.querySelectorAll('[data-hpx]')) el.style.height = el.dataset.hpx + 'px'; }
function render(el, content) { if (typeof el === 'string') el = $(el); if (!el) return; el.innerHTML = part(content); hydrate(el); }
const delta = (cur, prev, { invert = false } = {}) => {
  if (prev == null || cur == null) return '';
  if (!prev && !cur) return html`<span class="delta">±0</span>`;
  if (!prev) return html`<span class="delta up">neu</span>`;
  const d = ((cur - prev) / Math.abs(prev)) * 100, good = invert ? d < 0 : d > 0;
  return html`<span class="delta ${d === 0 ? '' : good ? 'up' : 'down'}">${d > 0 ? '+' : ''}${fNum(d, 0)} %</span>`;
};

/* ---------- Router ---------- */
const Router = {
  routes: [], current: null,
  on(re, fn) { this.routes.push([re, fn]); return this; },
  go(h) { if (location.hash === h) this.resolve(); else location.hash = h; },
  async resolve() {
    const h = location.hash || '#/';
    for (const [re, fn] of this.routes) { const m = h.match(re); if (m) { this.current = h; await run(() => fn(...m.slice(1))); return; } }
    if (this.fallback) await run(() => this.fallback(h));
  }
};
window.addEventListener('hashchange', () => { [...modalStack].reverse().forEach((m) => m.close()); Router.resolve(); });

/* ---------- Kleinteile ---------- */
const empty = (title, text, action) => html`<div class="empty"><div class="empty-mark">${icon('inbox')}</div><strong>${title}</strong>${text ? html`<p>${text}</p>` : ''}${action || ''}</div>`;
const loading = () => html`<div class="loading" aria-busy="true"><span class="spinner"></span>Wird geladen …</div>`;
const kv = (rows) => html`<dl class="kv">${rows.filter((r) => r && r[1] !== undefined && r[1] !== null && r[1] !== '').map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>`;
const avatar = (name, cls = '') => html`<span class="avatar ${cls}" aria-hidden="true">${initials(name)}</span>`;
function copyText(t) { return navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast('In die Zwischenablage kopiert.')) : Promise.resolve(); }
ACT.copy = (b) => copyText(b.dataset.text);
ACT.closeModal = () => closeModal();
function pwStrength(pw) { let s = 0; if ((pw || '').length >= 10) s++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw) || (pw || '').length >= 14) s++; return s; }
const PW_HINT = 'Mindestens 10 Zeichen mit Buchstaben und Zahlen.';

/* ---------- Angebote ---------- */
const OFFER_KIND = { kauf: 'Kauf', leasing: 'Leasing', finanzierung: 'Finanzierung', ankauf: 'Ankauf' };
const OFFER_STATUS = { eingereicht: ['Eingereicht', 'info'], vorgestellt: ['Dem Kunden vorgestellt', 'ok-light'], nicht_ausgewaehlt: ['Nicht ausgewählt', 'muted'], angenommen: ['Vom Kunden angenommen', 'ok'], abgelehnt_kunde: ['Vom Kunden abgelehnt', 'muted'] };
const offerStatus = (s) => badge(...(OFFER_STATUS[s] || [s, 'neutral']));
const OFFER_LABELS = [
  ['config', 'Konfiguration', (v) => (v === 'gleich' ? 'Wie angefragt' : v === 'alternativ' ? 'Alternative Konfiguration' : v)],
  ['herstellercode', 'Herstellercode'], ['equipment_match', 'Ausstattung wie angefragt', (v) => (v === 'ja' ? 'Ja' : v === 'nein' ? 'Nein' : v)],
  ['price', 'Kaufpreis', fEur], ['buy_price', 'Ankaufpreis', fEur], ['monthly_rate', 'Monatliche Rate', fEur], ['down_payment', 'Anzahlung', fEur], ['final_rate', 'Schlussrate', fEur],
  ['km_per_year', 'Kilometer pro Jahr', (v) => fNum(v) + ' km'], ['term_months', 'Laufzeit', (v) => v + ' Monate'],
  ['transfer_cost', 'Überführung und Zulassung', fEur], ['service_cost', 'Servicepaket (monatlich)', fEur], ['insurance_cost', 'Versicherung / Kasko (monatlich)', fEur],
  ['vat_mode', 'Preisangaben', (v) => (v === 'netto' ? 'Netto (gewerblich)' : 'Brutto')], ['delivery', 'Lieferzeit / Verfügbarkeit'],
  ['first_registration', 'Erstzulassung'], ['mileage', 'Kilometerstand', (v) => fNum(v) + ' km'], ['upe', 'UPE (Listenpreis)', fEur], ['accident_free', 'Unfallfrei', (v) => (v === 'ja' || v === true ? 'Ja' : v === 'nein' || v === false ? 'Nein' : v)], ['owners', 'Vorbesitzer'],
  ['pickup', 'Abholung'], ['valid_until', 'Gültig bis', fDate], ['notes', 'Anmerkungen']
];
function offerRows(d) { return OFFER_LABELS.filter(([k]) => d[k] !== undefined && d[k] !== null && d[k] !== '').map(([k, l, f]) => [l, f ? f(d[k]) : d[k]]); }
const offerHeadline = (d) => (d.monthly_rate ? html`${fEur(d.monthly_rate)} <span class="small muted">/ Monat</span>` : d.price ? fEur(d.price) : d.buy_price ? fEur(d.buy_price) : '–');

function hashQuery() { const i = location.hash.indexOf('?'); return i < 0 ? {} : Object.fromEntries(new URLSearchParams(location.hash.slice(i + 1))); }

/* ---------- Vertriebs-Pipeline („Tempostrecke“): Stufen mit Anzahl und Übergangsquote ----------
   stages: [{ key, label, value, sub, href, tone: 'hot' | 'win' | '' }], opts: { dark, active, caption } */
function pipeline(stages, { dark = false, active = null, caption = '' } = {}) {
  const max = Math.max(1, ...stages.map((s) => +s.value || 0));
  return html`<nav class="pipe ${dark ? 'pipe-dark' : ''}" aria-label="${caption || 'Pipeline'}">${stages.map((s, i) => {
    const inner = html`<span class="pipe-n num">${fNum(s.value)}</span><span class="pipe-l">${s.label}</span>${s.sub ? html`<span class="pipe-s">${s.sub}</span>` : ''}<span class="pipe-bar" aria-hidden="true"><i data-w="${Math.round(((+s.value || 0) / max) * 100)}"></i></span>`;
    const cls = `pipe-st ${s.tone ? 'is-' + s.tone : ''} ${active === s.key ? 'on' : ''}`;
    return s.href ? html`<a class="${cls}" href="${s.href}" ${active === s.key ? raw('aria-current="true"') : ''}>${inner}</a>` : html`<div class="${cls}">${inner}</div>`;
  })}</nav>`;
}
// Übergangsquote zwischen zwei Stufen als kurzer Text
const pipeRate = (a, b) => (a ? `${Math.round((b / a) * 100)} % weiter` : '');
