/* ===== Partner-Dashboard: Grundgerüst, Anmeldung ===== */
App.base = '/papi';
const P = { user: null, cfg: {}, links: {}, unread: 0, newCount: 0 };
const rank = () => ((P.cfg.partnerRoles || {})[P.user && P.user.role] || { rank: 1 }).rank;
const isVL = () => rank() >= 2, isGF = () => P.user && P.user.role === 'gf';
const AST = () => P.cfg.assignStatuses || [];
const PNAV = () => [
  { key: 'start', href: '#/', label: 'Übersicht', short: 'Start', icon: 'home', group: 'Arbeiten' },
  { key: 'anfragen', href: '#/anfragen', label: 'Anfragen', icon: 'inbox', count: P.newCount, group: 'Arbeiten' },
  isVL() && { key: 'angebote', href: '#/angebote', label: 'Angebote', icon: 'file', group: 'Arbeiten' },
  isVL() && { key: 'statistik', href: '#/statistik', label: 'Statistik', icon: 'chart', group: 'Auswertung' },
  { key: 'news', href: '#/news', label: 'News', icon: 'bell', count: P.unread, group: 'Kommunikation' },
  { key: 'support', href: '#/support', label: 'Support', icon: 'support', group: 'Kommunikation' },
  { key: 'einstellungen', href: '#/einstellungen', label: 'Einstellungen', icon: 'gear', group: 'Konto' }
].filter(Boolean);
const PCRUMB = { start: 'Übersicht', anfragen: 'Anfragen', angebote: 'Angebote', statistik: 'Statistik', news: 'News', support: 'Support', einstellungen: 'Einstellungen' };
const roleLabel = () => ((P.cfg.partnerRoles || {})[P.user && P.user.role] || {}).label || 'Partner';
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ohne Speicher */ } } };

function pshell(active) {
  if (!$('#pmain')) {
    const rail = store.get('kfl_p_rail') === '1';
    render('#root', html`<div class="p-app ${rail ? 'is-rail' : ''}" id="papp">
      <aside class="p-side" aria-label="Seitenleiste"><div class="ps-brand"><a href="#/" class="logo-link" aria-label="Zur Übersicht">${LOGO}</a><button class="ps-collapse" data-act="prail" aria-label="Menü ein- oder ausklappen" title="Menü ein-/ausklappen">${icon('back')}</button></div>
        <div class="ps-org" title="${P.user.org.name}"><span class="ps-org-mark">${initials(P.user.org.name)}</span><div><b>${P.user.org.name}</b><span>Partner-Dashboard</span></div></div>
        <div id="pcta"></div><nav class="ps-nav" id="pnav" aria-label="Hauptnavigation"></nav>
        <div class="ps-foot"><div class="ps-help"><b>Fragen zu einer Anfrage?</b><p>Das KFL-Team hilft dir schnell weiter.</p><a href="#/support">${icon('support')}Support kontaktieren</a></div>
          <div class="ps-me">${avatar(P.user.name, 'alt')}<div class="ps-me-txt"><b>${P.user.name}</b><span>${roleLabel()}</span></div><button class="icon-btn" data-act="plogout" aria-label="Abmelden" title="Abmelden">${icon('logout')}</button></div></div></aside>
      <div class="p-body"><header class="p-topbar" id="ptop"><div class="p-topbar-in"><a href="#/" class="pt-logo" aria-label="Zur Übersicht">${LOGO}</a><div class="pt-crumb" id="pcrumb"></div>
        <div class="pt-right"><span class="pt-chip">${icon('calendar')}${fDate(new Date())} · KW ${isoWeekOf().week}</span><span id="pbell"></span><span class="pt-me">${avatar(P.user.name, 'alt')}</span></div></div></header>
        <main class="p-main" id="pmain" tabindex="-1"></main></div>
      <nav class="p-tabbar" id="ptab" aria-label="Navigation"></nav></div>`);
  }
  P.active = active; pnav();
}
function pnav() {
  const items = PNAV(); let g = '';
  render('#pnav', items.map((n) => { const head = n.group !== g ? html`<div class="ps-group">${n.group}</div>` : ''; g = n.group; return html`${head}<a href="${n.href}" class="${P.active === n.key ? 'on' : ''}" title="${n.label}" ${P.active === n.key ? raw('aria-current="page"') : ''}>${icon(n.icon)}<span class="lbl">${n.label}</span>${n.count ? html`<span class="count">${n.count}</span>` : ''}</a>`; }));
  render('#pcta', P.newCount ? html`<a class="ps-cta" href="#/anfragen?tab=neu" title="Neue Anfragen">${icon('bolt')}<span class="lbl">Neue Anfragen</span><span class="count">${P.newCount}</span></a>` : '');
  render('#pcrumb', html`<span>${P.user.org.name}</span><span class="sep">/</span><b>${PCRUMB[P.active] || ''}</b>`);
  render('#pbell', html`<a class="pt-bell" href="#/news" aria-label="News${P.unread ? ` (${P.unread} ungelesen)` : ''}" title="News">${icon('bell')}${P.unread ? html`<span class="count">${P.unread}</span>` : ''}</a>`);
  const main = items.filter((n) => ['start', 'anfragen', 'news', 'support'].includes(n.key));
  render('#ptab', html`${main.map((n) => html`<a href="${n.href}" class="${P.active === n.key ? 'on' : ''}">${icon(n.icon)}${n.short || n.label}${n.count ? html`<span class="count">${n.count}</span>` : ''}</a>`)}
    <button data-act="moreSheet" class="${['angebote', 'statistik', 'einstellungen'].includes(P.active) ? 'on' : ''}">${icon('menu')}Mehr</button>`);
}
ACT.prail = () => { const a = $('#papp'); a.classList.toggle('is-rail'); store.set('kfl_p_rail', a.classList.contains('is-rail') ? '1' : '0'); };
window.addEventListener('scroll', () => { const t = $('#ptop'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
ACT.moreSheet = () => modal({ title: 'Mehr', body: html`<div class="sheet-links">${PNAV().filter((n) => !['start', 'anfragen', 'news', 'support'].includes(n.key)).map((n) => html`<a href="${n.href}" data-close>${icon(n.icon)}${n.label}</a>`)}
  <button data-act="plogout">${icon('logout')}Abmelden</button></div>` });
let ptok = 0, plast = null;
function ppage(key) {
  pshell(key);
  const soft = plast === location.hash; plast = location.hash;
  const t = ++ptok, y = window.scrollY;
  if (!soft) { render('#pmain', loading()); window.scrollTo(0, 0); }
  return { alive: () => t === ptok, show: (c) => { if (t !== ptok) return; render('#pmain', c); if (soft) window.scrollTo(0, y); } };
}
const preload = () => Router.resolve();
const phead = (title, sub, actions, back) => html`${back ? html`<a class="back" href="${back[0]}">${icon('back')}${back[1]}</a>` : ''}<div class="p-head"><div><h1>${title}</h1>${sub ? html`<p class="sub">${sub}</p>` : ''}</div>${actions || ''}</div>`;
const ptabs = (items, cur) => html`<div class="tabs">${items.filter(Boolean).map(([k, l, h, n]) => html`<a class="tab ${k === cur ? 'on' : ''}" href="${h}">${l}${n ? html`<span class="count ${k === 'neu' ? 'hot' : ''}">${n}</span>` : ''}</a>`)}</div>`;

async function ploadSession() { const s = await GET('/session'); P.user = s.user; P.cfg = s.config; P.links = s.links; return s; }
App.onAuth = () => { P.user = null; plogin(); };
App.onPw = () => pforcePw();

/* ---------- Anmeldung ---------- */
function pauthFrame(inner) {
  const l = P.links || {};
  render('#root', html`<div class="p-auth"><section class="p-auth-art"><div>${LOGO}</div>
    <div><h1><span>Schnell sein.</span> <span>Bestes Angebot abgeben.</span> <span>Deal gewinnen.</span></h1><p class="claim">Das Partner-Dashboard der KFL GbR. Hier landen die Anfragen deiner Region – wer zuerst ein starkes Angebot abgibt, holt den Kunden.</p></div>
    <div class="p-auth-points"><div>${icon('bolt')}<span>Neue Anfragen sofort sehen und mit einem Klick übernehmen.</span></div><div>${icon('clock')}<span>Jede Anfrage hat 24 Werktags-Stunden – die Uhr zeigt dir, wie viel Zeit bleibt.</span></div><div>${icon('trophy')}<span>Das beste Angebot gewinnt. Der Kunde meldet sich – du bekommst seine Kontaktdaten.</span></div></div>
    <div class="socials">${l.shop ? html`<a class="social" href="${l.shop}" target="_blank" rel="noopener">${icon('shop')}Webstore</a>` : ''}${l.instagram ? html`<a class="social" href="${l.instagram}" target="_blank" rel="noopener">${icon('insta')}Instagram</a>` : ''}</div></section>
    <section class="p-auth-form">${inner}</section></div>`);
}
const psupportHelp = () => html`<div class="auth-help">${icon('support')}<span>Probleme beim Anmelden?</span><span class="spacer"></span><button class="btn btn-sm" type="button" data-act="psupportPublic">Support kontaktieren</button></div>`;
function plogin(msg) {
  pauthFrame(html`<div><h2>Willkommen zurück</h2><p class="muted">Melde dich mit deiner E-Mail-Adresse an.</p></div>${msg ? html`<div class="info-box">${icon('check')}<span>${msg}</span></div>` : ''}
    <form class="stack" data-submit="plogin">${field('E-Mail', inp('email', '', { type: 'email', req: true, attrs: 'autocomplete="username" inputmode="email"' }))}${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete="current-password"' }))}
      <button class="btn btn-primary btn-block" type="submit">Anmelden</button></form>${psupportHelp()}
    <p class="tiny muted">Passwort vergessen? Schreib dem Support – die KFL schickt dir einen Link zum Zurücksetzen.</p>`);
}
SUBMIT.plogin = async (d) => { await POST('/login', d); await pboot(); };
ACT.plogout = async () => { closeModal(); await POST('/logout'); P.user = null; plast = null; plogin('Du wurdest abgemeldet.'); };
ACT.psupportPublic = async () => {
  const d = await ask({ title: 'Support kontaktieren', text: 'Das KFL-Support-Team meldet sich per E-Mail bei dir.', ok: 'Anfrage senden', fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}
    ${field('Thema', sel('topic', ['Anmeldung / Zugang', 'Passwort vergessen', 'Neues Konto', 'Technisches Problem', 'Sonstiges'], 'Anmeldung / Zugang'))}${field('Nachricht', area('message', '', { rows: 5, req: true }))}<input class="sr" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` });
  if (!d) return; delete d._form; const r = await POST('/support-public', d); toast(r.number ? `Danke! Deine Anfrage #${r.number} ist eingegangen.` : 'Danke, deine Anfrage ist eingegangen.');
};
const consentFields = () => html`<div class="consents">${chk('agb', false, raw(`Ich akzeptiere die <a class="link" href="${esc(P.links.agb || '#')}" target="_blank" rel="noopener">AGB für Geschäftspartner</a>.`))}${chk('privacy', false, raw(`Ich habe die <a class="link" href="${esc(P.links.privacy || '#')}" target="_blank" rel="noopener">Datenschutzhinweise</a> gelesen und stimme der Verarbeitung meiner Daten zu.`))}</div>`;
async function pinvite(token) {
  if (!P.links.agb) await ploadSession().catch(() => {});
  let info; try { info = await GET('/invite/check', { token }); } catch (e) { return pauthFrame(html`<div><h2>Link nicht mehr gültig</h2></div><div class="err-box">${icon('alert')}<span>${e.message}</span></div><a class="btn" href="#/">Zur Anmeldung</a>${psupportHelp()}`); }
  pauthFrame(html`<div><h2>Hallo ${info.name}!</h2><p class="muted">Willkommen bei der KFL. Lege dein Passwort für ${info.email} fest – danach geht's los für ${info.org}.</p></div>
    <form class="stack" data-submit="pinvite"><input type="hidden" name="token" value="${token}">${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength="10" autocomplete="new-password"' }), PW_HINT)}
      ${field('Passwort wiederholen', inp('password2', '', { type: 'password', req: true }))}${consentFields()}<button class="btn btn-primary btn-block" type="submit">Konto aktivieren</button></form>`);
}
SUBMIT.pinvite = async (d) => { if (d.password !== d.password2) throw new Error('Die Passwörter stimmen nicht überein.'); if (!d.agb || !d.privacy) throw new Error('Bitte bestätige AGB und Datenschutzhinweise.'); await POST('/invite/accept', d); history.replaceState(null, '', '#/'); await pboot(); };
function pconsents() {
  pauthFrame(html`<div><h2>Noch eine Bestätigung</h2><p class="muted">Bevor du Anfragen bearbeitest, bestätige bitte unsere AGB und die Datenschutzhinweise.</p></div>
    <form class="stack" data-submit="pconsents">${consentFields()}<button class="btn btn-primary btn-block" type="submit">Bestätigen und weiter</button></form>`);
}
SUBMIT.pconsents = async (d) => { if (!d.agb || !d.privacy) throw new Error('Bitte bestätige beides.'); await POST('/consents', d); await pboot(); };
function pforcePw() {
  pauthFrame(html`<div><h2>Eigenes Passwort festlegen</h2><p class="muted">Du hast ein vorläufiges Passwort von der KFL bekommen. Bitte vergib jetzt dein eigenes.</p></div>
    <form class="stack" data-submit="pforcePw">${field('Vorläufiges Passwort', inp('current', '', { type: 'password', req: true }))}${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength="10"' }), PW_HINT)}${field('Wiederholen', inp('next2', '', { type: 'password', req: true }))}
      <button class="btn btn-primary btn-block" type="submit">Speichern</button></form>`);
}
SUBMIT.pforcePw = async (d) => { if (d.next !== d.next2) throw new Error('Die Passwörter stimmen nicht überein.'); await POST('/password', d); await pboot(); };
async function pcounts() {
  try { const d = await GET('/start'); P.start = d; P.newCount = d.newRequests.length; P.unread = d.news.notifications.filter((n) => !n.read).length + d.news.posts.filter((p) => !p.read).length; if ($('#pnav')) pnav(); return d; } catch (e) { return null; }
}
async function pboot() {
  const s = await ploadSession();
  if (!s.user) return plogin();
  if (!s.user.consentsOk) return pconsents();
  if (s.user.mustChangePw) return pforcePw();
  $('#root').innerHTML = '';
  Router.resolve();
}
setInterval(() => { if (P.user && P.user.consentsOk && document.visibilityState === 'visible') pcounts(); }, 30000);

/* ---------- Bausteine ---------- */
// Stoppuhr: Restzeit als Ring (voller Ring = 24 Werktags-Stunden)
function clock(deadline, total = 24) {
  if (!deadline) return '';
  const left = (toDate(deadline).getTime() - Date.now()) / 3600e3;
  const pct = Math.max(0, Math.min(1, left / total));
  const label = left <= 0 ? 'abgelaufen' : left < 1 ? `${Math.max(1, Math.round(left * 60))} Min.` : left < 48 ? `${Math.floor(left)} Std.` : `${Math.round(left / 24)} Tage`;
  return html`<span class="clock ${left < 4 ? 'urgent' : ''}"><span class="ring-wrap">${ring(pct, { size: 44, stroke: 5, label: 'Restzeit ' + label })}<span class="ring-c">${left <= 0 ? '0' : left < 1 ? Math.max(1, Math.round(left * 60)) + "'" : Math.floor(left) < 100 ? Math.floor(left) + 'h' : Math.round(left / 24) + 'd'}</span></span>${label}</span>`;
}
const zTag = (z) => html`<span class="zustand ${/gebraucht/i.test(z || '') ? 'used' : /vorf/i.test(z || '') ? 'pre' : ''}" title="${z || ''}">${/gebraucht/i.test(z || '') ? 'GW' : /vorf/i.test(z || '') ? 'VF' : 'NW'}</span>`;
// Restzeit als Pille mit Fortschrittsbalken (Listen)
function tpill(deadline, total = 24) {
  if (!deadline) return '';
  const left = (toDate(deadline).getTime() - Date.now()) / 3600e3, pct = Math.max(0, Math.min(1, left / total));
  const label = left <= 0 ? 'abgelaufen' : left < 1 ? `noch ${Math.max(1, Math.round(left * 60))} Min.` : left < 48 ? `noch ${Math.floor(left)} Std.` : `noch ${Math.round(left / 24)} Tage`;
  return html`<span class="tpill ${left <= 0 ? 'over' : left < 4 ? 'urgent' : left < 10 ? 'soon' : ''}" title="Frist: ${fDT(deadline)}"><span class="tpill-t">${icon('clock')}${label}</span><span class="tpill-b"><i data-w="${Math.round(pct * 100)}"></i></span></span>`;
}
const rqTitle = (a) => { const r = a.request || {}; return a.level === 'full' ? (r.vehicle || [r.brand, r.model].filter(Boolean).join(' ') || r.typeLabel) : `${r.zustand || 'Fahrzeug'}${r.brand ? ' · ' + r.brand : ''}`; };
function rqCard(a) {
  const r = a.request || {};
  const live = ['neu', 'in_bearbeitung'].includes(a.status);
  return html`<a class="rq tone-${a.tone}" href="#/anfragen/${a.id}">${zTag(r.zustand)}<div class="rq-main"><div class="rq-t">${rqTitle(a)}<span class="rq-no">#${r.number}</span></div>
    <div class="rq-s"><span>${icon('pin')}PLZ ${r.plz || '–'}${a.distance_km != null ? ` · ${fNum(a.distance_km)} km` : ''}</span>${a.level === 'full' && r.summary ? html`<span>${r.summary}</span>` : r.typeLabel ? html`<span>${r.typeLabel}</span>` : ''}${a.taker ? html`<span>${icon('user')}${a.taker}</span>` : ''}${a.direct ? html`<span class="direct">${icon('star')}direkt an dich</span>` : ''}</div></div>
    <div class="rq-side">${live && a.deadline_at ? tpill(a.deadline_at) : a.status === 'gewonnen' && a.contact_due_at ? tpill(a.contact_due_at) : ''}${a.status !== 'neu' || !a.deadline_at ? badge(a.statusLabel, a.tone) : ''}</div>${icon('arrow', 'rq-go')}</a>`;
}
const rqList = (items) => html`<div class="rq-list">${items.map(rqCard)}</div>`;
