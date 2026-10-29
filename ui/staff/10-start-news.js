/* ===== Startseite, News, Chat, Vertretung ===== */
function greeting() { const h = +new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend'; }
const NOTE_ICON = { anfrage: 'inbox', kundennotiz: 'note', support: 'support', vertretung: 'users', spam: 'flag', buchhaltung: 'euro', chat: 'chat', partner: 'partner', backup: 'shield', system: 'gear' };

function feedItems(news, filter = 'alle') {
  let items = [...(news.posts || []).map((p) => ({ ...p, kind: 'post' })), ...(news.notifications || []).map((n) => ({ ...n, ntype: n.kind, kind: 'note' }))]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (filter === 'ungelesen') items = items.filter((i) => !i.read);
  if (filter === 'mitteilungen') items = items.filter((i) => i.kind === 'post');
  if (filter === 'system') items = items.filter((i) => i.kind === 'note');
  return items;
}
function feedRow(i) {
  const mark = i.kind === 'post' ? html`<span class="fi-mark ${i.important ? 'important' : 'post'}">${icon(i.important ? 'bolt' : 'news')}</span>` : html`<span class="fi-mark">${icon(NOTE_ICON[i.ntype] || 'bell')}</span>`;
  return html`<div class="feed-item ${i.read ? '' : 'unread'}">${mark}
    <div><a href="#" class="fi-title" data-act="openFeed" data-kind="${i.kind}" data-id="${i.id}" data-link="${i.link || ''}">${i.title}</a>
      ${i.body ? html`<div class="fi-body">${i.body}</div>` : ''}
      <div class="tiny muted">${i.kind === 'post' ? `Mitteilung von ${i.author || 'KFL'}` : 'Systemhinweis'}</div></div>
    <div class="stack-s"><span class="fi-time" title="${fDT(i.created_at)}">${fRel(i.created_at)}</span>
      <button class="btn btn-ghost btn-sm" data-act="toggleRead" data-kind="${i.kind}" data-id="${i.id}" data-read="${i.read ? 1 : 0}">${i.read ? 'Ungelesen' : 'Gelesen'}</button></div></div>`;
}
let NEWS_CACHE = null;
ACT.openFeed = async (a) => {
  const kind = a.dataset.kind, id = +a.dataset.id;
  await POST('/news/read', kind === 'post' ? { posts: [id] } : { notifications: [id] });
  if (kind === 'note' && a.dataset.link) { await refreshCounts(); location.hash = a.dataset.link; return; }
  const p = NEWS_CACHE && (NEWS_CACHE.posts || []).find((x) => x.id === id);
  if (p) modal({ title: p.title, body: html`<p class="tiny muted">${p.author} · ${fDT(p.created_at)}</p><div class="pre">${p.body}</div>`, foot: html`<button class="btn btn-dark" data-close>Schließen</button>`, onClose: () => { refreshCounts(); reload(); } });
  else { await refreshCounts(); reload(); }
};
ACT.toggleRead = async (b) => { const id = +b.dataset.id, read = b.dataset.read !== '1'; await POST('/news/read', { ...(b.dataset.kind === 'post' ? { posts: [id] } : { notifications: [id] }), read }); await refreshCounts(); reload(); };
ACT.allRead = async () => { await POST('/news/read', { all: true, posts: (NEWS_CACHE?.posts || []).filter((p) => !p.read).map((p) => p.id) }); await refreshCounts(); toast('Alles als gelesen markiert.'); reload(); };

// Stufen der Vertriebs-Pipeline (gleich wie die Fortschrittsstrecke einer Anfrage)
const PIPE_STAGES = [
  ['eingang', 'Eingang', 'eingang,in_bearbeitung,fehler,stoerung'], ['partner', 'Bei Partnern', 'versendet'], ['angebote', 'Angebote da', 'angebot_liegt_vor,angebot_in_bearbeitung'],
  ['kunde', 'Beim Kunden', 'angebot_beim_kunden,angebot_akzeptiert'], ['gewonnen', 'Vermittelt', 'kontaktdaten_versendet,angebot_akzeptiert']];
const monthStartISO = () => todayISO().slice(0, 8) + '01';
function staffPipeline(pl, { dark = false, active = null } = {}) {
  if (!pl) return '';
  const st = pl.stages;
  const sub = { eingang: pl.unassigned ? `${fNum(pl.unassigned)} ohne Zuständigen` : 'in Prüfung', partner: pl.deadlineSoon ? `${fNum(pl.deadlineSoon)} Fristen < 4 Std.` : 'warten auf Angebote', angebote: 'auswerten und vorstellen', kunde: 'Entscheidung offen', gewonnen: 'diesen Monat' };
  const tone = { eingang: pl.unassigned || pl.problems ? 'hot' : '', partner: pl.deadlineSoon ? 'hot' : '', gewonnen: 'win' };
  return pipeline(PIPE_STAGES.map(([k, l, status]) => ({ key: k, label: l, value: st[k] || 0, sub: sub[k], tone: tone[k] || '',
    href: '#/anfragen' + qs(k === 'gewonnen' ? { view: 'alle', status, from: monthStartISO() } : { status }) })), { dark, active, caption: 'Vertriebs-Pipeline' });
}
async function pageStart() {
  const P = page('start');
  const d = await GET('/me/start', { full: 1 }).catch(() => null) || (await refreshCounts());
  if (!P.alive() || !d) return;
  NEWS_CACHE = d.news;
  const k = d.kpis || {}, pl = d.pipeline;
  // Aufgaben nach Dringlichkeit: was heute Umsatz sichert oder Kunden warten lässt, steht oben
  const todo = [
    k.problems && { ic: 'alert', n: k.problems, t: 'Anfragen mit Fehler oder ohne Angebot', h: 'Partner nachfassen oder manuell zuordnen, bevor der Kunde abspringt.', href: '#/anfragen?view=alle&status=fehler,stoerung,kein_angebot', hot: true },
    pl && pl.deadlineSoon && { ic: 'clock', n: pl.deadlineSoon, t: 'Angebotsfristen laufen bald ab', h: 'Weniger als 4 Stunden – jetzt die Partner erinnern.', href: '#/anfragen?status=versendet', hot: true },
    k.notes && { ic: 'note', n: k.notes, t: 'Neue Notizen von Kunden', h: 'Lesen und an die Partner weitergeben.', href: '#/anfragen?notes=1', hot: true },
    pl && pl.stages.angebote && { ic: 'star', n: pl.stages.angebote, t: 'Angebote liegen vor', h: 'Auswerten und die besten drei dem Kunden vorstellen.', href: '#/anfragen?status=angebot_liegt_vor,angebot_in_bearbeitung' },
    pl && pl.unassigned && { ic: 'user', n: pl.unassigned, t: 'Neue Eingänge ohne Zuständigen', h: 'Übernehmen oder im Team zuweisen.', href: '#/anfragen?unassigned=1&status=eingang,in_bearbeitung' },
    k.mine && { ic: 'inbox', n: k.mine, t: 'Mir zugewiesene Anfragen', h: 'Deine offenen Vorgänge.', href: '#/anfragen?mine=1' },
    k.spam && { ic: 'flag', n: k.spam, t: 'Spam-Meldungen prüfen', h: 'Bestätigen oder wieder freigeben.', href: '#/anfragen?view=spam' },
    k.tickets && { ic: 'support', n: k.tickets, t: 'Offene Support-Tickets', h: 'Kunden und Partner warten auf Antwort.', href: '#/support' },
    k.bill && { ic: 'euro', n: k.bill, t: 'Abrechnungsfälle offen', h: 'Vermittlungen abrechnen.', href: '#/buchhaltung/faelle' },
    k.overdue && { ic: 'alert', n: k.overdue, t: 'Rechnungen überfällig', h: 'Zahlung anmahnen oder klären.', href: '#/buchhaltung/rechnungen?overdue=1', hot: true }
  ].filter(Boolean);
  const urgent = todo.filter((x) => x.hot).length;
  const m = pl && pl.month, lm = pl && pl.lastMonth;
  const unread = feedItems(d.news, 'ungelesen').length;
  const line = pl ? `${urgent ? plural(urgent, 'Aufgabe braucht', 'Aufgaben brauchen') + ' heute deine Aufmerksamkeit' : 'Nichts Dringendes offen'}, ${plural(pl.stages.eingang + pl.stages.partner + pl.stages.angebote + pl.stages.kunde, 'Anfrage läuft', 'Anfragen laufen')} in der Pipeline.` : S.user.roleLabel;
  P.show(html`${canAny('settings_all', 'acc_view') ? mailWarn() : ''}
    <div class="cockpit-head"><div><h1>${greeting()}, ${S.user.name.split(' ')[0]}</h1><p class="sub">${line}</p></div>
      ${can('req_view') ? html`<div class="row"><a class="btn" href="#/anfragen?mine=1">${icon('user')}Meine Anfragen</a><a class="btn btn-primary" href="#/anfragen">${icon('inbox')}Alle offenen Anfragen</a></div>` : ''}</div>
    ${pl ? staffPipeline(pl, { dark: true }) : ''}
    ${(d.absenceRequests || []).map((a) => html`<div class="note-box mt">${icon('users')}<div class="spacer"><b>${a.user_name}</b> bittet dich um Vertretung vom ${fDate(a.from_date)} bis ${fDate(a.to_date)}.${a.note ? html` „${a.note}“` : ''}</div>
      <button class="btn btn-sm btn-ok" data-act="absDecide" data-id="${a.id}" data-accept="1">Zusagen</button><button class="btn btn-sm" data-act="absDecide" data-id="${a.id}" data-accept="0">Absagen</button></div>`)}
    <div class="cockpit-grid">
      <div class="stack">
        <section class="panel"><div class="panel-head"><h2>Jetzt handeln ${urgent ? html`<span class="count hot">${urgent}</span>` : ''}</h2><span class="small muted">nach Dringlichkeit</span></div>
          ${todo.length ? html`<div class="todo">${todo.map((x) => html`<a class="todo-row ${x.hot ? 'is-hot' : ''}" href="${x.href}"><span class="todo-ic">${icon(x.ic)}</span><span class="todo-n num">${fNum(x.n)}</span><span class="todo-t"><b>${x.t}</b><span>${x.h}</span></span>${icon('arrow', 'todo-go')}</a>`)}</div>`
            : html`<div class="panel-body">${empty('Alles erledigt', 'Keine offenen Aufgaben. Neue Anfragen und Rückmeldungen erscheinen hier, sobald sie da sind.')}</div>`}</section>
        <section class="panel newsroom"><div class="panel-head"><h2>News ${unread ? html`<span class="count hot">${unread}</span>` : ''}</h2>
          <div class="row">${canAny('news_publish', 'news_partner') ? html`<button class="btn btn-sm btn-dark" data-act="composeNews">${icon('plus')}Mitteilung</button>` : ''}<button class="btn btn-sm btn-ghost" data-act="allRead">Alles gelesen</button><a class="btn btn-sm" href="#/news">Alle News</a></div></div>
          <div class="feed">${feedItems(d.news).length ? feedItems(d.news).slice(0, 12).map(feedRow) : empty('Keine Neuigkeiten', 'Neue Anfragen, Support-Antworten und Mitteilungen erscheinen hier.')}</div></section>
      </div>
      <div class="stack">
        ${m ? html`<section class="panel month"><div class="panel-head"><h2>${new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: TZ }).format(new Date())} im Vertrieb</h2>${can('stats_view') ? html`<a class="btn btn-sm btn-ghost" href="#/statistik">Statistik</a>` : ''}</div>
          <div class="month-grid">
            <div class="mg"><b class="num">${fNum(m.requests)}</b><span>Anfragen</span>${lm ? html`<em>Vormonat ${fNum(lm.requests)}</em>` : ''}</div>
            <div class="mg win"><b class="num">${fNum(m.won)}</b><span>Vermittelt</span>${lm ? html`<em>Vormonat ${fNum(lm.won)}</em>` : ''}</div>
            <div class="mg"><b class="num">${fNum(m.conversion)} %</b><span>Abschlussquote</span></div>
            <div class="mg"><b class="num">${pl.responseHours != null ? fNum(pl.responseHours, 1) + ' Std.' : '–'}</b><span>Ø Angebotszeit Partner</span></div>
            ${pl.revenue != null ? html`<div class="mg wide"><b class="num">${fEur(pl.revenue)}</b><span>Umsatz netto (Rechnungen)</span></div>` : ''}
          </div></section>` : ''}
        <section class="panel"><div class="panel-head"><h2>Chats</h2><button class="btn btn-sm" data-act="newChat">${icon('plus')}Neuer Chat</button></div>
          <div class="panel-body tight">${(d.chats || []).length ? d.chats.map(chatRow) : html`<div class="panel-body">${empty('Noch keine Chats', 'Schreib Kolleginnen und Kollegen direkt an.')}</div>`}</div></section>
        <section class="panel"><div class="panel-head"><h2>Schnellzugriff</h2></div><div class="panel-body quick">
          ${can('acc_view') ? html`<a href="#/buchhaltung/faelle">${icon('euro')}Abrechnungsfälle</a>` : ''}
          ${can('partner_view') ? html`<a href="#/partner">${icon('partner')}Geschäftspartner</a>` : ''}
          <a href="#/news/vertretung">${icon('calendar')}Urlaub und Vertretung</a>
          <button type="button" data-act="newTicket">${icon('support')}Support kontaktieren</button></div></section>
      </div></div>`);
}

/* ---------- News-Seite ---------- */
async function pageNews(sub, id) {
  const P = page('news');
  const tabs = tabsBar([['feed', 'Neuigkeiten', '#/news'], ['chat', 'Chats', '#/news/chat'], ['vertretung', 'Urlaub & Vertretung', '#/news/vertretung']], sub || 'feed');
  const actions = canAny('news_publish', 'news_partner') ? html`<button class="btn btn-primary" data-act="composeNews">${icon('plus')}Mitteilung veröffentlichen</button>` : '';
  if (sub === 'chat') return pageChats(P, tabs, actions, id);
  if (sub === 'vertretung') return pageAbsences(P, tabs, actions);
  const d = await GET('/news'); if (!P.alive()) return;
  NEWS_CACHE = d;
  const f = hashQuery().f || 'alle';
  const items = feedItems(d, f);
  P.show(html`${head('News & Chat', 'Mitteilungen der Geschäftsführung, Systemhinweise zu deinem Fachbereich und deine Chats.', actions)}${tabs}
    <section class="panel newsroom mt"><div class="toolbar">${[['alle', 'Alle'], ['ungelesen', 'Ungelesen'], ['mitteilungen', 'Mitteilungen'], ['system', 'Systemhinweise']].map(([k, l]) => html`<a class="btn btn-sm ${f === k ? 'btn-dark' : 'btn-ghost'}" href="#/news?f=${k}">${l}</a>`)}<span class="spacer"></span><button class="btn btn-sm" data-act="allRead">Alles als gelesen markieren</button></div>
      <div class="feed">${items.length ? items.map(feedRow) : empty('Hier ist gerade nichts', f === 'ungelesen' ? 'Du hast alles gelesen.' : '')}</div></section>`);
}

ACT.composeNews = async () => {
  let dir = { users: [] }, orgs = [];
  try { dir = await GET('/directory'); } catch (e) { /* optional */ }
  if (can('news_partner')) try { orgs = (await GET('/orgs')).orgs; } catch (e) { /* ohne Partnerliste */ }
  const roles = Object.entries(S.config.roles || {});
  const scopes = [can('news_publish') && ['staff', 'Mitarbeiter der KFL'], can('news_partner') && ['partner', 'Geschäftspartner']].filter(Boolean);
  const m = modal({ title: 'Mitteilung veröffentlichen', wide: true, body: html`<form class="stack" data-submit="publishNews" id="newsForm">
    <div class="row">${scopes.map(([k, l], i) => html`<label class="check"><input type="radio" name="scope" value="${k}" ${i === 0 ? raw('checked') : ''} data-change="newsScope"><span>${l}</span></label>`)}</div>
    ${field('Titel', inp('title', '', { req: true }))}${field('Nachricht', area('body', '', { rows: 6 }))}
    ${chk('important', false, 'Als wichtig markieren (steht oben und ist hervorgehoben)')}
    <fieldset data-scope="staff" class="${scopes[0][0] === 'staff' ? '' : 'hide'}"><legend>Empfänger im Team</legend><div class="stack-s">
      <div class="row">${[['all', 'Alle Mitarbeiter'], ['roles', 'Bestimmte Rollen'], ['users', 'Einzelne Personen']].map(([k, l], i) => html`<label class="check"><input type="radio" name="aud_staff" value="${k}" ${i === 0 ? raw('checked') : ''}><span>${l}</span></label>`)}</div>
      <div class="checks">${roles.map(([k, r]) => chk('roles[]', false, r.label, k))}</div>
      ${field('Einzelne Personen (Mehrfachauswahl mit Strg/Cmd)', raw(`<select name="users" multiple size="5">${dir.users.map((u) => `<option value="${u.id}">${esc(u.name)} – ${esc(roleLabel(u.role_key))}</option>`).join('')}</select>`))}</div></fieldset>
    ${can('news_partner') ? html`<fieldset data-scope="partner" class="${scopes[0][0] === 'partner' ? '' : 'hide'}"><legend>Empfänger bei den Partnern</legend><div class="stack-s">
      <div class="row">${[['partners_all', 'Alle Partner'], ['brands', 'Nach Marke'], ['orgs', 'Organisationen'], ['partner_roles', 'Nach Rolle']].map(([k, l], i) => html`<label class="check"><input type="radio" name="aud_partner" value="${k}" ${i === 0 ? raw('checked') : ''}><span>${l}</span></label>`)}</div>
      ${field('Marken (kommagetrennt)', inp('brands', '', { ph: 'z. B. Audi, Volkswagen' }))}
      ${field('Organisationen', raw(`<select name="orgs" multiple size="5">${orgs.map((o) => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>`))}
      <div class="checks">${Object.entries(S.config.partnerRoles || {}).map(([k, r]) => chk('proles[]', false, r.label, k))}</div>
      ${chk('mail', false, 'Zusätzlich per E-Mail senden')}</div></fieldset>` : ''}
    </form>`, foot: html`<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" type="submit" form="newsForm">Veröffentlichen</button>` });
  m.el.dataset.m = '1';
};
CHANGE.newsScope = (el) => { const f = el.form; $$('fieldset[data-scope]', f).forEach((fs) => fs.classList.toggle('hide', fs.dataset.scope !== el.value)); };
SUBMIT.publishNews = async (d, f) => {
  const scope = d.scope || 'staff';
  let audience;
  if (scope === 'staff') {
    const t = d.aud_staff || 'all';
    audience = { type: t, values: t === 'roles' ? d.roles : t === 'users' ? [...f.elements.users.selectedOptions].map((o) => +o.value) : [] };
    if (t !== 'all' && !audience.values.length) throw new Error('Bitte wähle mindestens eine Rolle oder Person aus.');
  } else {
    const t = d.aud_partner || 'partners_all';
    audience = { type: t, values: t === 'brands' ? String(d.brands || '').split(',').map((x) => x.trim()).filter(Boolean) : t === 'orgs' ? [...f.elements.orgs.selectedOptions].map((o) => +o.value) : t === 'partner_roles' ? d.proles : [] };
    if (t !== 'partners_all' && !audience.values.length) throw new Error('Bitte wähle die Empfänger aus.');
  }
  await POST('/news', { scope, title: d.title, body: d.body, important: d.important, audience, mail: d.mail });
  closeModal(); toast('Mitteilung veröffentlicht.'); reload();
};

/* ---------- Chats ---------- */
const chatName = (c) => c.title || (c.members || []).filter((m) => m.id !== S.user.id).map((m) => m.name).join(', ') || 'Chat';
const chatRow = (c, on) => html`<a class="chat-row ${on ? 'on' : ''}" href="#/news/chat/${c.id}">${avatar(chatName(c), c.kind === 'group' ? 'alt' : '')}<span class="t"><b>${chatName(c)}</b><span>${c.last_text || 'Noch keine Nachrichten'}</span></span>${c.unread ? html`<span class="count hot">${c.unread}</span>` : ''}</a>`;
let chatTimer = null;
async function pageChats(P, tabs, actions, id) {
  const [list, cur] = await Promise.all([GET('/chats'), id ? GET('/chats/' + id) : null]);
  if (!P.alive()) return;
  P.show(html`${head('News & Chat', 'Direktnachrichten und Gruppenchats im Team.', actions)}${tabs}
    <section class="panel chat-layout"><div class="chat-list"><div class="panel-head"><h3>Unterhaltungen</h3><button class="btn btn-sm" data-act="newChat">${icon('plus')}Neu</button></div>
      ${list.chats.length ? list.chats.map((c) => chatRow(c, +id === c.id)) : html`<div class="panel-body">${empty('Noch keine Chats')}</div>`}</div>
      <div class="chat-main">${cur ? html`<div class="panel-head"><div><h3>${chatName(cur.chat)}</h3><span class="tiny muted">${cur.chat.members.map((m) => m.name).join(', ')}</span></div><button class="btn btn-sm btn-ghost" data-act="chatUnread" data-id="${id}">Als ungelesen markieren</button></div>
        <div class="thread" id="thread">${threadHtml(cur.messages)}</div>
        <form data-submit="chatSend"><input type="hidden" name="id" value="${id}"><input name="text" placeholder="Nachricht schreiben …" autocomplete="off" required><button class="btn btn-primary" type="submit">${icon('send')}Senden</button></form>`
        : empty('Wähle einen Chat aus', 'oder starte eine neue Unterhaltung.', html`<button class="btn btn-dark" data-act="newChat">Neuer Chat</button>`)}</div></section>`);
  const t = $('#thread'); if (t) t.scrollTop = t.scrollHeight;
  clearInterval(chatTimer);
  if (cur) chatTimer = setInterval(async () => { if (!location.hash.startsWith('#/news/chat/' + id)) return clearInterval(chatTimer); const n = await GET('/chats/' + id).catch(() => null); const th = $('#thread'); if (n && th && n.messages.length !== th.children.length) { render(th, threadHtml(n.messages)); th.scrollTop = th.scrollHeight; } }, 12000);
  refreshCounts();
}
const threadHtml = (msgs) => msgs.length ? msgs.map((m) => html`<div class="msg ${m.user_id === S.user.id ? 'me' : ''}"><div class="msg-meta"><b>${m.name}</b><span>${fDT(m.created_at)}</span></div><div class="pre">${m.text}</div></div>`) : html`<div class="empty-sm">Schreib die erste Nachricht.</div>`;
SUBMIT.chatSend = async (d, f) => { await POST('/chats/' + d.id, { text: d.text }); f.reset(); const n = await GET('/chats/' + d.id); const th = $('#thread'); render(th, threadHtml(n.messages)); th.scrollTop = th.scrollHeight; };
ACT.chatUnread = async (b) => { await PATCH('/chats/' + b.dataset.id, { unread: true }); toast('Als ungelesen markiert.'); location.hash = '#/news/chat'; };
ACT.newChat = async () => {
  const dir = await GET('/directory');
  const others = dir.users.filter((u) => u.id !== S.user.id);
  const d = await ask({ title: 'Neuer Chat', text: 'Eine Person für einen Direktchat, mehrere für einen Gruppenchat. Gruppen sind mit Personen der gleichen Rolle möglich.', ok: 'Chat starten',
    fields: html`<div class="stack-s">${others.map((u) => chk('users[]', false, raw(`${esc(u.name)} <span class="muted small">${esc(roleLabel(u.role_key))}</span>`), u.id))}</div>${field('Name der Gruppe (optional)', inp('title'))}` });
  if (!d) return;
  if (!d.users.length) throw new Error('Bitte wähle mindestens eine Person aus.');
  const r = await POST('/chats', { userIds: d.users.map(Number), title: d.title });
  location.hash = '#/news/chat/' + r.id;
};

/* ---------- Abwesenheit & Vertretung ---------- */
const ABS_STATUS = { angefragt: ['Wartet auf Zusage', 'warn'], bestaetigt: ['Bestätigt', 'ok'], abgelehnt: ['Abgelehnt', 'err'], storniert: ['Storniert', 'muted'] };
async function pageAbsences(P, tabs, actions) {
  const d = await GET('/absences'); if (!P.alive()) return;
  const st = (s) => badge(...(ABS_STATUS[s] || [s, 'neutral']));
  P.show(html`${head('News & Chat', 'Trag Urlaub oder Abwesenheit ein. Deine Vertretung muss zustimmen und bekommt solange Einsicht und Bearbeitung in deinen Fällen.', actions)}${tabs}
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Abwesenheit eintragen</h2></div><form class="panel-body stack" data-submit="absNew">
        <div class="grid-2">${field('Von', inp('from', todayISO(), { type: 'date', req: true }))}${field('Bis', inp('to', todayISO(), { type: 'date', req: true }))}</div>
        ${field('Vertretung', sel('substitute_id', d.candidates.map((c) => [c.id, `${c.name} (${roleLabel(c.role_key)})`]), '', { empty: 'Keine Vertretung' }), 'Nur gleiche oder höhere Rolle möglich.')}
        ${field('Notiz für die Vertretung', area('note', '', { rows: 3 }))}
        <button class="btn btn-primary" type="submit">Eintragen und Vertretung anfragen</button></form></section>
      <section class="panel"><div class="panel-head"><h2>Ich vertrete</h2></div><div class="panel-body tight">
        ${d.asSubstitute.length ? html`<table class="table"><tbody>${d.asSubstitute.map((a) => html`<tr><td><b>${a.user_name}</b><span class="cell-sub">${fDate(a.from_date)} – ${fDate(a.to_date)}</span>${a.note ? html`<span class="cell-sub">${a.note}</span>` : ''}</td><td>${st(a.status)}</td>
          <td class="r">${a.status === 'angefragt' ? html`<button class="btn btn-sm btn-ok" data-act="absDecide" data-id="${a.id}" data-accept="1">Zusagen</button> <button class="btn btn-sm" data-act="absDecide" data-id="${a.id}" data-accept="0">Absagen</button>` : ''}</td></tr>`)}</tbody></table>` : html`<div class="panel-body">${empty('Keine Vertretungen')}</div>`}</div></section></div>
    <section class="panel mt"><div class="panel-head"><h2>Meine Abwesenheiten</h2></div><div class="panel-body tight">
      ${d.mine.length ? html`<table class="table"><thead><tr><th>Zeitraum</th><th>Vertretung</th><th>Status</th><th></th></tr></thead><tbody>${d.mine.map((a) => html`<tr><td>${fDate(a.from_date)} – ${fDate(a.to_date)}</td><td>${a.substitute_name || '–'}</td><td>${st(a.status)}</td><td class="r">${['angefragt', 'bestaetigt'].includes(a.status) ? html`<button class="btn btn-sm btn-ghost" data-act="absCancel" data-id="${a.id}">Stornieren</button>` : ''}</td></tr>`)}</tbody></table>` : html`<div class="panel-body">${empty('Keine Einträge')}</div>`}</div></section>`);
}
SUBMIT.absNew = async (d) => { await POST('/absences', d); toast(d.substitute_id ? 'Eingetragen. Deine Vertretung wurde angefragt.' : 'Abwesenheit eingetragen.'); reload(); };
ACT.absDecide = async (b) => { await POST(`/absences/${b.dataset.id}/decide`, { accept: b.dataset.accept === '1' }); toast(b.dataset.accept === '1' ? 'Vertretung zugesagt.' : 'Vertretung abgesagt.'); await loadSession(); reload(); };
ACT.absCancel = async (b) => { if (!(await confirmBox('Abwesenheit stornieren?', 'Die Vertretung endet sofort.'))) return; await POST(`/absences/${b.dataset.id}/cancel`); reload(); };
