/* ===== Support ===== */
const TK_STATUS = { neu: ['Neu', 'accent'], in_bearbeitung: ['In Bearbeitung', 'info'], wartet: ['Wartet auf Rückmeldung', 'warn'], erledigt: ['Erledigt', 'ok'] };
const TK_PRIO = { normal: ['Normal', 'neutral'], hoch: ['Hoch', 'warn'], dringend: ['Dringend', 'err'] };
const TK_KIND = { ticket: 'Anfrage', aenderung: 'Änderungsantrag', spam: 'Spam-Prüfung' };
const CHANGE_FIELD = { email: 'E-Mail', name: 'Name', phone: 'Telefon', reason: 'Begründung', opening: 'Öffnungszeiten', billing_email: 'Rechnungs-E-Mail', billing_street: 'Rechnungsanschrift', note: 'Notiz' };
const CHANGE_LABEL = { role: 'Rolle ändern', delete_user: 'Konto löschen', add_user: 'Konto hinzufügen', opening: 'Öffnungszeiten', billing: 'Rechnungsdaten', org: 'Organisationsdaten' };

async function pageSupport(id) {
  const P = page('support');
  if (!can('support_view')) return P.show(html`${head('Support')}<section class="panel"><div class="panel-body">${empty('Du hast ein Anliegen?', 'Schreib dem Support-Team – Antworten erscheinen in deinen News.', html`<button class="btn btn-primary" data-act="newTicket">Support kontaktieren</button>`)}</div></section>`);
  if (id === 'systemfehler') return pageSysIssues(P);
  if (id) return pageTicket(P, id);
  const q = hashQuery(); const view = q.view || 'offen';
  const params = { ...q, view: undefined };
  if (['Webseite', 'Intern', 'Partner'].includes(view)) params.tag = view;
  if (view === 'erledigt') params.status = 'erledigt';
  if (view === 'archiv') params.archived = 1;
  const d = await GET('/tickets', params); if (!P.alive()) return;
  const tabs = [['offen', 'Offen'], ['Webseite', 'Webseite'], ['Intern', 'Intern'], ['Partner', 'Partner'], ['erledigt', 'Erledigt (10 Tage)'], ['archiv', 'Archiv']].map(([k, l]) => [k, l, '#/support' + qs({ view: k })]);
  if (can('support_syslist')) tabs.push(['sys', 'System-Fehlerliste', '#/support/systemfehler']);
  P.show(html`${head('Support', 'Anfragen von der Webseite, aus dem Team und von Geschäftspartnern. Nach 24 Stunden steigt die Priorität automatisch.', html`<button class="btn" data-act="newTicket">${icon('plus')}Ticket anlegen</button>`)}
    ${tabsBar(tabs, view)}<section class="panel mt"><form class="toolbar" data-submit="tkFilter"><input type="hidden" name="view" value="${view}">
      <label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Betreff, Name, E-Mail, Ticketnummer" aria-label="Suche"></label>
      ${sel('priority', Object.entries(TK_PRIO).map(([k, v]) => [k, v[0]]), q.priority, { empty: 'Alle Prioritäten', attrs: 'data-change="tkFilterChange" aria-label="Priorität"' })}
      ${sel('kind', Object.entries(TK_KIND), q.kind, { empty: 'Alle Arten', attrs: 'data-change="tkFilterChange" aria-label="Art"' })}<button class="btn btn-sm btn-dark" type="submit">Suchen</button></form>
    ${d.tickets.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Nr.</th><th>Betreff</th><th>Tag</th><th>Von</th><th>Priorität</th><th>Status</th><th>Zuständig</th><th>Eingang</th></tr></thead><tbody>
      ${d.tickets.map((t) => html`<tr class="clickable ${t.status === 'neu' ? 'is-unread' : ''}" data-act="go" data-href="#/support/${t.id}"><td class="num strong">#${t.id}</td><td><b>${t.subject}</b><span class="cell-sub">${TK_KIND[t.kind] || t.kind}${t.category ? ' · ' + t.category : ''} · ${plural(t.messages, 'Nachricht', 'Nachrichten')}</span></td>
        <td><span class="tag">${t.tag}</span></td><td>${t.requester_name || '–'}<span class="cell-sub">${t.org_name || t.requester_email || ''}</span></td><td>${badge(...(TK_PRIO[t.priority] || [t.priority]))}${t.escalated_at ? html`<span class="cell-sub">automatisch erhöht</span>` : ''}</td>
        <td>${badge(...(TK_STATUS[t.status] || [t.status]))}</td><td>${t.assignee_name || html`<span class="muted">offen</span>`}</td><td class="nowrap">${fDT(t.created_at)}<span class="cell-sub">${fRel(t.created_at)}</span></td></tr>`)}</tbody></table></div>`
      : html`<div class="panel-body">${empty('Keine Tickets in dieser Ansicht')}</div>`}</section>`);
}
SUBMIT.tkFilter = (d) => setHashQuery(d, '#/support');
CHANGE.tkFilterChange = (el) => SUBMIT.tkFilter(formData(el.form));

let TK = null;
async function pageTicket(P, id) {
  const [d, dir] = await Promise.all([GET('/tickets/' + id), GET('/directory').catch(() => ({ users: [] }))]); if (!P.alive()) return;
  TK = d.ticket; const t = d.ticket, mng = can('support_manage');
  const p = t.payload || {};
  P.show(html`${head(html`#${t.id} · ${t.subject}`, html`${TK_KIND[t.kind] || 'Anfrage'} · ${t.category || ''} · eingegangen ${fDT(t.created_at)}`, html`<span class="tag">${t.tag}</span>${badge(...(TK_STATUS[t.status] || [t.status]))}${badge(...(TK_PRIO[t.priority] || [t.priority]))}`, ['#/support', 'Alle Tickets'])}
    <div class="detail-grid"><div class="stack">
      ${t.kind === 'aenderung' ? html`<section class="panel"><div class="panel-head"><h2>Änderungsantrag: ${CHANGE_LABEL[p.action] || p.action}</h2>${t.status === 'erledigt' ? badge('Bearbeitet', 'ok') : badge('Wartet auf Bestätigung', 'accent')}</div><div class="panel-body stack">
        ${p.label ? html`<p class="strong">${p.label}</p>` : ''}${kv(Object.entries(p).filter(([k]) => !['action', 'label', 'user_id', 'role'].includes(k)).map(([k, v]) => [CHANGE_FIELD[k] || k, typeof v === 'object' ? Object.entries(v || {}).map(([a, b]) => `${a}: ${Array.isArray(b) ? b.join('–') : b ?? 'geschlossen'}`).join(', ') : String(v)]))}
        <p class="small muted">Die Geschäftsführung des Partners hat diese Änderung beantragt. Im Zweifel vorher telefonisch beim Antragsteller nachfragen.</p>
        ${can('support_changes') && t.status !== 'erledigt' ? html`<div class="row"><button class="btn btn-ok" data-act="tkChange" data-ok="1">${icon('check')}Änderung bestätigen</button><button class="btn" data-act="tkChange" data-ok="0">Ablehnen</button></div>` : ''}</div></section>` : ''}
      <section class="panel"><div class="panel-head"><h2>Verlauf</h2></div><div class="panel-body"><div class="thread">${d.messages.map((m) => html`<div class="msg ${m.author_type === 'staff' ? 'me' : ''} ${m.internal ? 'internal' : ''}"><div class="msg-meta"><b>${m.author_name || (m.author_type === 'staff' ? 'KFL Support' : 'Anfragender')}</b><span>${fDT(m.created_at)}</span>${m.internal ? html`<span>· interne Notiz</span>` : ''}</div><div class="pre">${m.text}</div></div>`)}</div></div>
        ${t.status !== 'erledigt' || mng ? html`<form class="composer" data-submit="tkReply">${area('text', '', { rows: 4, req: true, ph: mng ? 'Antwort an den Anfragenden …' : 'Deine Nachricht …' })}
          <div class="row">${mng ? chk('internal', false, 'Interne Notiz (nicht sichtbar für den Anfragenden)') : ''}<span class="spacer"></span><button class="btn btn-primary" type="submit">${icon('send')}Senden</button></div>
          ${mng ? html`<p class="tiny muted">Antworten gehen per E-Mail von support@ und erscheinen – falls vorhanden – in den News des Kontos.</p>` : ''}</form>` : ''}</section></div>
      <div class="stack">${mng ? html`<section class="panel"><div class="panel-head"><h2>Bearbeitung</h2></div><form class="panel-body stack" data-submit="tkSave">
        ${field('Status', sel('status', Object.entries(TK_STATUS).map(([k, v]) => [k, v[0]]), t.status))}${field('Priorität', sel('priority', Object.entries(TK_PRIO).map(([k, v]) => [k, v[0]]), t.priority))}
        ${field('Zuständig', sel('assignee_id', dir.users.filter((u) => true).map((u) => [u.id, u.name]), t.assignee_id, { empty: 'Niemand' }))}${field('Tag', sel('tag', ['Webseite', 'Intern', 'Partner', 'Kunde'], t.tag))}
        <div class="row"><button class="btn btn-dark" type="submit">Speichern</button>${t.status !== 'erledigt' ? html`<button class="btn btn-ok" type="button" data-act="tkDone">${icon('check')}Erledigt</button>` : ''}</div></form></section>` : ''}
        <section class="panel"><div class="panel-head"><h2>Anfragender</h2></div><div class="panel-body">${kv([['Name', t.requester_name], ['E-Mail', t.requester_email ? html`<a class="link" href="mailto:${t.requester_email}">${t.requester_email}</a>` : ''], ['Art', { staff: 'Mitarbeiter KFL', partner: 'Geschäftspartner', web: 'Webseite', customer: 'Kunde' }[t.requester_type] || t.requester_type],
          ['Organisation', t.org_name ? html`<a class="link" href="#/partner/${t.org_id}">${t.org_name}</a>` : ''], ['Anfrage', t.request_id ? html`<a class="link" href="#/anfragen/${t.request_id + 1000}">#${t.request_id + 1000}</a>` : ''], ['Eskaliert', t.escalated_at ? fDT(t.escalated_at) : ''], ['Erledigt', t.done_at ? fDT(t.done_at) : '']])}</div></section></div></div>`);
}
SUBMIT.tkReply = async (d, f) => { await POST(`/tickets/${TK.id}/reply`, d); f.reset(); toast(d.internal ? 'Interne Notiz gespeichert.' : 'Antwort gesendet.'); reload(); };
SUBMIT.tkSave = async (d) => { await PATCH('/tickets/' + TK.id, { ...d, assignee_id: d.assignee_id || null }); toast('Gespeichert.'); reload(); };
ACT.tkDone = async () => { await PATCH('/tickets/' + TK.id, { status: 'erledigt' }); toast('Erledigt. Das Ticket bleibt 10 Tage im Support und wandert dann ins Archiv.'); reload(); };
ACT.tkChange = async (b) => { const ok = b.dataset.ok === '1'; const d = await ask({ title: ok ? 'Änderung bestätigen?' : 'Änderung ablehnen?', text: ok ? 'Die Änderung wird sofort durchgeführt. Der Antragsteller wird per E-Mail (support@) und in seinen News informiert.' : 'Der Antragsteller erhält die Ablehnung mit deiner Begründung.', ok: ok ? 'Bestätigen' : 'Ablehnen', danger: !ok, fields: field('Notiz an den Antragsteller (optional)', area('note', '', { rows: 2 })) }); if (!d) return; await POST(`/tickets/${TK.id}/change`, { approve: ok, note: d.note }); toast(ok ? 'Änderung durchgeführt.' : 'Abgelehnt.'); reload(); };

async function pageSysIssues(P) {
  if (!can('support_syslist')) return P.show(noAccess());
  const d = await GET('/sysissues'); if (!P.alive()) return;
  const tabs = [['offen', 'Offen'], ['Webseite', 'Webseite'], ['Intern', 'Intern'], ['Partner', 'Partner'], ['erledigt', 'Erledigt (10 Tage)'], ['archiv', 'Archiv']].map(([k, l]) => [k, l, '#/support' + qs({ view: k })]);
  tabs.push(['sys', 'System-Fehlerliste', '#/support/systemfehler']);
  const ST = { offen: ['Offen', 'accent'], in_bearbeitung: ['In Bearbeitung', 'info'], erledigt: ['Erledigt', 'ok'] };
  P.show(html`${head('Support', 'Die System-Fehlerliste sieht nur der Admin. Erledigte Einträge werden 365 Tage im Backup aufbewahrt.', html`<button class="btn btn-primary" data-act="sysNew">${icon('plus')}Fehler erfassen</button>`)}${tabsBar(tabs, 'sys')}
    <section class="panel mt">${d.issues.length ? d.issues.map((s) => html`<div class="asg"><div class="asg-head"><div><b>${s.title}</b><div class="asg-meta">erfasst ${fDT(s.created_at)} von ${s.author || '–'}${s.done_at ? ' · erledigt ' + fDT(s.done_at) : ''}</div></div>${badge(...(ST[s.status] || [s.status]))}</div>
      ${s.details ? html`<p class="pre small mt">${s.details}</p>` : ''}${s.notes.length ? html`<ul class="timeline mt">${s.notes.map((n) => html`<li><div><div class="tl-meta">${n.by} · ${fDT(n.at)}</div>${n.text}</div></li>`)}</ul>` : ''}
      <form class="inline-form mt" data-submit="sysNote"><input type="hidden" name="id" value="${s.id}">${field('Notiz', inp('note'))}${field('Status', sel('status', Object.entries(ST).map(([k, v]) => [k, v[0]]), s.status))}<button class="btn btn-sm btn-dark" type="submit">Speichern</button></form></div>`)
      : html`<div class="panel-body">${empty('Keine Systemfehler erfasst')}</div>`}</section>`);
}
ACT.sysNew = async () => { const d = await ask({ title: 'Systemfehler erfassen', ok: 'Speichern', fields: html`${field('Titel', inp('title', '', { req: true }))}${field('Beschreibung', area('details', '', { rows: 5 }))}` }); if (!d) return; delete d._form; await POST('/sysissues', d); reload(); };
SUBMIT.sysNote = async (d) => { await PATCH('/sysissues/' + d.id, { note: d.note, status: d.status }); toast('Gespeichert.'); reload(); };
