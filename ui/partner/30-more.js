/* ===== Angebote, Statistik, Einstellungen, Support ===== */
async function pOffers() {
  const V = ppage('angebote');
  if (!isVL()) return V.show(empty('Diese Seite steht deiner Rolle nicht zur Verfügung.'));
  const d = await GET('/offers'); if (!V.alive()) return;
  V.show(html`${phead('Angebote', 'Alle Angebote deiner Organisation. Jedes Öffnen wird als „Vertrauliche Information“ für die Geschäftsführung und die KFL vermerkt.')}
    <section class="block">${d.offers.length ? html`<div class="table-wrap"><table class="table p-table"><thead><tr><th>Anfrage</th><th>Fahrzeug</th><th>Von</th><th>Abgegeben</th><th>Status</th><th></th></tr></thead><tbody>
      ${d.offers.map((o) => html`<tr><td class="strong num">#${o.number}</td><td>${o.zustand || ''} ${o.brand || ''} ${o.model || ''}<span class="cell-sub">${OFFER_KIND[o.kind] || o.kind}</span></td><td>${o.user_name || '–'}</td><td>${fDT(o.created_at)}</td><td>${offerStatus(o.status)}<span class="cell-sub">${o.aStatusLabel}</span></td>
        <td class="r"><button class="btn btn-sm" data-act="pofferOpen" data-id="${o.id}">${icon('eye')}Ansehen</button></td></tr>`)}</tbody></table></div>` : html`<div class="block-body">${empty('Noch keine Angebote', 'Sobald dein Team Angebote abgibt, erscheinen sie hier als Kopie.')}</div>`}</section>`);
}
ACT.pofferOpen = async (b) => {
  const d = await GET('/offers/' + b.dataset.id); const o = d.offer;
  modal({ title: `Angebot zu #${o.number}`, wide: true, body: html`<div class="note-box">${icon('eye')}<span>Vertrauliche Information: Das Öffnen wurde vermerkt.</span></div>
    <div class="row-between mt"><div><b>${o.brand} ${o.model}</b><div class="small muted">${o.user_name} · ${fDT(o.created_at)}</div></div>${offerStatus(o.status)}</div>
    <div class="offer-price num mt">${offerHeadline(o.data)}</div><div class="mt">${kv(offerRows(o.data))}</div>
    <div class="row mt">${o.has_pdf ? html`<a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/offers/${o.id}/file`)}">${icon('file')}Angebots-PDF</a>` : ''}${o.has_expose ? html`<a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/offers/${o.id}/file`, { which: 'expose' })}">${icon('file')}Exposé</a>` : ''}</div>` });
};

async function pStats() {
  const V = ppage('statistik');
  if (!isVL()) return V.show(empty('Die Statistik steht deiner Rolle nicht zur Verfügung.'));
  const q = hashQuery(); if (!q.from) { q.from = addDays(todayISO(), -29); q.to = todayISO(); }
  const d = await GET('/stats', q); if (!V.alive()) return;
  const t = d.totals, ac = d.accept;
  V.show(html`${phead('Statistik', `${fDate(d.period.from)} – ${fDate(d.period.to)}${isGF() ? ' · Gesamtauswertung deiner Organisation' : ''}`, isGF() ? html`<button class="btn" data-act="preport">${icon('download')}Bericht herunterladen</button>` : '')}
    <section class="block"><form class="toolbar" data-submit="pstatFilter">${[['7', 6], ['30', 29], ['90', 89]].map(([l, n]) => html`<a class="btn btn-sm ${q.from === addDays(todayISO(), -n) ? 'btn-dark' : 'btn-ghost'}" href="#/statistik${qs({ ...q, from: addDays(todayISO(), -n), to: todayISO() })}">${l} Tage</a>`)}
      <span class="spacer"></span><input type="date" name="from" value="${q.from}" aria-label="Von"><input type="date" name="to" value="${q.to}" aria-label="Bis">
      ${sel('brand', d.filters.brands, q.brand, { empty: 'Alle Marken', attrs: 'aria-label="Marke"' })}<input name="model" value="${q.model || ''}" placeholder="Modell" size="8" aria-label="Modell">
      ${isGF() ? sel('role', Object.entries(P.cfg.partnerRoles).map(([k, r]) => [k, r.label]), q.role, { empty: 'Alle Rollen', attrs: 'aria-label="Rolle"' }) : ''}<button class="btn btn-sm btn-dark" type="submit">Anwenden</button></form>
      <div class="pstats pstats-flat"><div class="pstat"><b>${fNum(t.received || 0)}</b><span>Anfragen erhalten</span></div><div class="pstat"><b>${fNum(t.worked || 0)}</b><span>bearbeitet</span></div><div class="pstat"><b>${fNum(t.won || 0)}</b><span>gewonnen</span></div><div class="pstat"><b>${fNum(t.open || 0)}</b><span>in Bearbeitung</span></div>
        <div class="pstat"><b>${fNum(t.offers || 0)}</b><span>Angebote</span></div><div class="pstat"><b>${fNum(t.lost || 0)}</b><span>nicht gewählt / gescheitert</span></div><div class="pstat"><b>${fNum(t.missed || 0)}</b><span>verpasst (ohne Angebot)</span></div><div class="pstat"><b>${t.offers ? Math.round(((t.won || 0) / t.offers) * 100) : 0} %</b><span>Erfolgsquote</span></div></div></section>
    <div class="grid-2 mt"><section class="block"><div class="block-head"><h2>Marken</h2></div><div class="block-body">${hbars(d.brands.map((b) => ({ label: b.brand, value: b.n })))}</div></section>
      <section class="block"><div class="block-head"><h2>Modelle</h2></div><div class="block-body">${hbars(d.models.map((m) => ({ label: m.model, value: m.n })))}</div></section></div>
    ${isGF() ? html`<section class="block mt"><div class="block-head"><h2>Angebote beim Kunden</h2></div><div class="block-body">${kv([['Angenommen', fNum(ac.accepted || 0)], ['Nicht gewählt / abgelehnt', fNum(ac.rejected || 0)], ['Aktuell vorgestellt', fNum(ac.presented || 0)]])}</div></section>` : ''}
    ${d.team ? html`<section class="block mt"><div class="block-head"><h2>Team</h2><span class="small muted">Wer übernimmt, wie schnell und mit welchem Erfolg</span></div><div class="table-wrap"><table class="table p-table"><thead><tr><th>Name</th><th>Rolle</th><th class="r">Übernommen</th><th class="r">Angebote</th><th class="r">Gewonnen</th><th class="r">Ø bis Übernahme</th><th class="r">Ø bis Angebot</th></tr></thead><tbody>
      ${d.team.map((m) => html`<tr><td class="strong">${m.name}</td><td>${(P.cfg.partnerRoles[m.role] || {}).label}</td><td class="r num">${m.taken || 0}</td><td class="r num">${m.offers || 0}</td><td class="r num">${m.won || 0}</td><td class="r num">${m.react_h != null ? fNum(m.react_h, 1) + ' h' : '–'}</td><td class="r num">${m.offer_h != null ? fNum(m.offer_h, 1) + ' h' : '–'}</td></tr>`)}</tbody></table></div></section>` : ''}`);
}
SUBMIT.pstatFilter = (d) => setHashQuery(d, '#/statistik');
ACT.preport = async () => {
  const d = await ask({ title: 'Bericht herunterladen', text: 'PDF-Bericht für deine Organisation oder eine Rolle.', ok: 'Herunterladen', fields: html`${field('Zeitraum', sel('days', [['30', 'Letzte 30 Tage'], ['60', 'Letzte 60 Tage']], '30'))}${field('Rolle', sel('role', Object.entries(P.cfg.partnerRoles).map(([k, r]) => [k, r.label]), '', { empty: 'Gesamte Organisation' }))}` });
  if (!d) return; const a = document.createElement('a'); a.href = fileUrl('/report', { days: d.days, role: d.role }); a.download = ''; document.body.appendChild(a); a.click(); a.remove();
};
function setHashQuery(q, base) { const s = qs(q); if (base + s !== location.hash) location.hash = base + s; else preload(); }

async function pSettings(tab) {
  const V = ppage('einstellungen');
  const d = await GET('/settings'); if (!V.alive()) return;
  const gf = isGF(); tab = tab || 'profil';
  const tabs = ptabs([['profil', 'Mein Profil', '#/einstellungen'], ['organisation', 'Organisation', '#/einstellungen/organisation'], gf && ['team', 'Team', '#/einstellungen/team'], gf && ['rechnungen', 'Rechnungen', '#/einstellungen/rechnungen']], tab);
  const o = d.org;
  let body = '';
  if (tab === 'profil') body = html`<div class="grid-2 mt"><form class="block" data-submit="pprofile"><div class="block-head"><h2>Profil</h2></div><div class="block-body stack">${field('Name', inp('name', d.profile.name, { req: true }))}${field('Telefon', inp('phone', d.profile.phone))}${field('E-Mail', inp('email', d.profile.email, { attrs: 'disabled' }), 'Änderung der E-Mail über den Support.')}<button class="btn btn-dark" type="submit">Speichern</button></div></form>
    <form class="block" data-submit="ppassword"><div class="block-head"><h2>Passwort ändern</h2></div><div class="block-body stack">${field('Aktuelles Passwort', inp('current', '', { type: 'password', req: true }))}${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength="10"' }), PW_HINT)}${field('Wiederholen', inp('next2', '', { type: 'password', req: true }))}<button class="btn btn-dark" type="submit">Passwort ändern</button></div></form></div>`;
  if (tab === 'organisation') body = html`<div class="grid-2 mt"><section class="block"><div class="block-head"><h2>${o.name}</h2></div><div class="block-body">${kv([['Anschrift', [o.street, [o.zip, o.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Telefon', o.phone], ['E-Mail', o.email], ['Webseite', o.website], ['Marken', o.brands.includes('*') ? 'Alle Marken' : o.brands.join(', ')], ...(gf ? [['Abrechnung', o.billing_mode === 'monatlich' ? 'Monatliche Sammelrechnung' : 'Je Vermittlung']] : [])])}<p class="small muted mt">Änderungen an Stammdaten und Marken über den Support.</p></div></section>
    ${gf ? html`<form class="block" data-submit="pbilling"><div class="block-head"><h2>Rechnungsdaten</h2></div><div class="block-body stack">${field('Rechnungs-E-Mail', inp('billing_email', o.billing_email || o.email, { type: 'email', req: true }))}${field('Rechnungsempfänger', inp('billing_name', o.billing_name, { ph: o.name }))}${field('Straße', inp('billing_street', o.billing_street, { ph: o.street }))}
      <div class="grid-2">${field('PLZ', inp('billing_zip', o.billing_zip, { ph: o.zip }))}${field('Ort', inp('billing_city', o.billing_city, { ph: o.city }))}</div><button class="btn btn-dark" type="submit">Speichern</button></div></form>
      <form class="block span-2" data-submit="popening"><div class="block-head"><h2>Öffnungszeiten</h2><span class="small muted">Samstag zählt nur bei Öffnung zu den Fristen.</span></div><div class="block-body tight"><table class="table"><tbody>${P.cfg.weekdays.map((w) => { const v = o.opening[w]; return html`<tr><td class="strong">${P.cfg.weekdayLabels[w]}</td><td>${chk('open_' + w, !!v, 'geöffnet')}</td><td><input type="time" name="from_${w}" value="${v ? v[0] : '08:00'}" aria-label="von"></td><td><input type="time" name="to_${w}" value="${v ? v[1] : '18:00'}" aria-label="bis"></td></tr>`; })}</tbody></table>
        <div class="block-body"><button class="btn btn-dark" type="submit">Öffnungszeiten speichern</button></div></div></form>` : ''}</div>`;
  if (tab === 'team' && gf) body = html`<div class="info-box mt">${icon('shield')}<span>Rollenänderungen, neue Konten und Löschungen prüft das KFL-Support-Team und bestätigt sie. Du bekommst eine Nachricht, sobald die Änderung aktiv ist.</span></div>
    <section class="block mt"><div class="block-head"><h2>Konten deiner Organisation</h2><button class="btn btn-sm btn-dark" data-act="padduser">${icon('plus')}Konto beantragen</button></div>${d.users.map((u) => html`<div class="rq"><span class="avatar">${initials(u.name)}</span><div><div class="rq-t">${u.name}</div><div class="rq-s"><span>${u.email}</span><span>${(P.cfg.partnerRoles[u.role] || {}).label}</span><span>${u.last_login ? 'zuletzt ' + fDT(u.last_login) : 'noch nicht angemeldet'}</span></div></div>
      <div class="row">${u.id !== P.user.id ? html`<button class="btn btn-sm" data-act="prole" data-id="${u.id}" data-role="${u.role}" data-name="${u.name}">Rolle ändern</button><button class="btn btn-sm btn-ghost" data-act="pdeluser" data-id="${u.id}" data-name="${u.name}">Löschen</button>` : html`<span class="small muted">Du</span>`}</div></div>`)}</section>
    ${d.pending.length ? html`<section class="block mt"><div class="block-head"><h2>Offene Anträge</h2></div>${d.pending.map((t) => html`<a class="rq" href="#/support/${t.id}"><span class="fi-mark">${icon('clock')}</span><div><div class="rq-t">${t.subject}</div><div class="rq-s">beantragt ${fDT(t.created_at)}</div></div>${badge('wird geprüft', 'warn')}</a>`)}</section>` : ''}
    <section class="block mt"><div class="block-body row-between"><span class="small muted">Organisation vollständig löschen? Das kann nur die KFL nach Rücksprache durchführen.</span><button class="btn btn-sm btn-ghost" data-act="pdelorg">Löschung beantragen</button></div></section>`;
  if (tab === 'rechnungen' && gf) body = html`<section class="block mt">${d.invoices.length ? html`<div class="table-wrap"><table class="table p-table"><thead><tr><th>Rechnung</th><th>Datum</th><th>Fällig</th><th class="r">Betrag</th><th>Status</th><th></th></tr></thead><tbody>${d.invoices.map((i) => { const open = ['offen', 'teilbezahlt'].includes(i.status); return html`<tr><td class="strong num">${i.number}</td><td>${fDate(i.issue_date)}</td><td>${fDate(i.due_date)}</td><td class="r num">${fEur(i.gross + i.fees)}</td>
      <td>${badge(i.status === 'bezahlt' ? 'Bezahlt' : open && i.due_date < todayISO() ? 'Überfällig' : i.status === 'teilbezahlt' ? 'Teilbezahlt' : i.status === 'storniert' ? 'Storniert' : 'Offen', i.status === 'bezahlt' ? 'ok' : open && i.due_date < todayISO() ? 'err' : 'info')}${i.dunning_level ? html`<span class="cell-sub">Mahnstufe ${i.dunning_level}</span>` : ''}</td>
      <td class="r"><a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/invoices/${i.id}/pdf`)}">${icon('file')}PDF</a></td></tr>`; })}</tbody></table></div>` : html`<div class="block-body">${empty('Noch keine Rechnungen')}</div>`}</section>`;
  V.show(html`${phead('Einstellungen')}${tabs}${body}`);
}
SUBMIT.pprofile = async (d) => { await PATCH('/settings/profile', d); P.user.name = d.name; toast('Profil gespeichert.'); preload(); };
SUBMIT.ppassword = async (d, f) => { if (d.next !== d.next2) throw new Error('Die Passwörter stimmen nicht überein.'); await POST('/password', d); f.reset(); toast('Passwort geändert.'); };
SUBMIT.pbilling = async (d) => { await PATCH('/settings/org', d); toast('Rechnungsdaten gespeichert.'); preload(); };
SUBMIT.popening = async (d) => { const opening = {}; for (const w of P.cfg.weekdays) opening[w] = d['open_' + w] ? [d['from_' + w], d['to_' + w]] : null; await PATCH('/settings/org', { opening }); toast('Öffnungszeiten gespeichert.'); preload(); };
const roleOpts = () => Object.entries(P.cfg.partnerRoles).map(([k, r]) => [k, r.label]);
ACT.prole = async (b) => { const d = await ask({ title: `Rolle von ${b.dataset.name} ändern`, text: 'Die Änderung wird vom KFL-Support geprüft.', ok: 'Änderung beantragen', fields: html`${field('Neue Rolle', sel('role', roleOpts(), b.dataset.role))}${field('Anmerkung', area('note', '', { rows: 2 }))}` }); if (!d) return; await POST('/settings/users/request', { action: 'role', user_id: +b.dataset.id, role: d.role, note: d.note }); toast('Beantragt. Du bekommst Bescheid, sobald die Änderung aktiv ist.'); preload(); };
ACT.pdeluser = async (b) => { const d = await ask({ title: `Konto von ${b.dataset.name} löschen?`, text: 'Die Löschung wird vom KFL-Support geprüft und bestätigt.', ok: 'Löschung beantragen', danger: true, fields: field('Grund', area('note', '', { rows: 2 })) }); if (!d) return; await POST('/settings/users/request', { action: 'delete_user', user_id: +b.dataset.id, note: d.note }); toast('Löschung beantragt.'); preload(); };
ACT.padduser = async () => { const d = await ask({ title: 'Neues Konto beantragen', text: 'Nach Bestätigung durch die KFL bekommt die Person eine Einladung per E-Mail.', ok: 'Beantragen', fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Telefon', inp('phone'))}${field('Rolle', sel('role', roleOpts(), 'vt'))}` }); if (!d) return; delete d._form; await POST('/settings/users/request', { action: 'add_user', ...d }); toast('Beantragt.'); preload(); };
ACT.pdelorg = async () => { const d = await ask({ title: 'Löschung der Organisation beantragen', text: 'Das KFL-Team meldet sich bei dir, um die Löschung abzustimmen.', ok: 'Antrag senden', danger: true, fields: field('Grund', area('note', '', { rows: 3, req: true })) }); if (!d) return; await POST('/settings/users/request', { action: 'delete_org', note: d.note }); toast('Antrag gesendet.'); };

const PT_STATUS = { neu: ['Eingegangen', 'accent'], in_bearbeitung: ['In Bearbeitung', 'info'], wartet: ['Wartet auf dich', 'warn'], erledigt: ['Erledigt', 'ok'] };
async function pSupport(id) {
  const V = ppage('support');
  if (id) {
    const d = await GET('/tickets/' + id); if (!V.alive()) return;
    const t = d.ticket;
    return V.show(html`${phead(`#${t.id} · ${t.subject}`, `${t.category || ''} · ${fDT(t.created_at)}`, badge(...(PT_STATUS[t.status] || [t.status])), ['#/support', 'Support'])}
      <section class="block"><div class="block-body"><div class="thread">${d.messages.map((m) => html`<div class="msg ${m.author_type === 'staff' ? '' : 'me'}"><div class="msg-meta"><b>${m.author_type === 'staff' ? (m.author_name || 'KFL Support') + ' · KFL' : m.author_name}</b><span>${fDT(m.created_at)}</span></div><div class="pre">${m.text}</div></div>`)}</div></div>
      ${t.status !== 'erledigt' ? html`<form class="composer" data-submit="preply"><input type="hidden" name="id" value="${t.id}">${area('text', '', { rows: 3, req: true, ph: 'Deine Antwort …' })}<div class="row"><span class="small muted">Geschlossen wird das Ticket vom KFL-Support.</span><span class="spacer"></span><button class="btn btn-primary" type="submit">${icon('send')}Antworten</button></div></form>` : html`<div class="block-body small muted">Dieses Ticket ist erledigt. Für ein neues Anliegen erstelle bitte ein neues Ticket.</div>`}</section>`);
  }
  const d = await GET('/tickets'); if (!V.alive()) return;
  V.show(html`${phead('Support', isGF() ? 'Deine Tickets und die deiner Organisation. Tickets der Geschäftsführung haben automatisch hohe Priorität.' : 'Fragen, Probleme oder Wünsche? Das KFL-Team hilft dir.', html`<button class="btn btn-primary" data-act="pnewTicket">${icon('plus')}Neues Ticket</button>`)}
    <section class="block">${d.tickets.length ? d.tickets.map((t) => html`<a class="rq" href="#/support/${t.id}"><span class="fi-mark">${icon(t.kind === 'aenderung' ? 'users' : 'support')}</span><div><div class="rq-t">${t.subject}</div><div class="rq-s"><span>#${t.id}</span><span>${t.category || ''}</span><span>${plural(t.messages, 'Nachricht', 'Nachrichten')}</span><span>${fRel(t.updated_at || t.created_at)}</span></div></div>${badge(...(PT_STATUS[t.status] || [t.status]))}</a>`)
      : html`<div class="block-body">${empty('Noch keine Tickets', 'Schreib uns – wir antworten per E-Mail und hier im Dashboard.')}</div>`}</section>`);
}
ACT.pnewTicket = async () => {
  const d = await ask({ title: 'Neues Ticket', ok: 'Senden', fields: html`${field('Betreff', inp('subject', '', { req: true }))}${field('Thema', sel('category', ['Anfrage / Angebot', 'Rechnung', 'Konto und Zugang', 'Technisches Problem', 'Feedback', 'Sonstiges'], 'Anfrage / Angebot'))}${field('Anfragenummer (optional)', inp('request_number', '', { ph: 'z. B. 1023', attrs: 'inputmode="numeric"' }))}${field('Nachricht', area('text', '', { rows: 5, req: true }))}` });
  if (!d) return; delete d._form; const r = await POST('/tickets', d); toast('Ticket gesendet.'); location.hash = '#/support/' + r.id;
};
SUBMIT.preply = async (d, f) => { await POST(`/tickets/${d.id}/reply`, { text: d.text }); f.reset(); toast('Antwort gesendet.'); preload(); };
