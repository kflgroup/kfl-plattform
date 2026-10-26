/* ===== Buchhaltung ===== */
const INV_STATUS = { entwurf: ['Entwurf', 'neutral'], offen: ['Offen', 'info'], teilbezahlt: ['Teilbezahlt', 'warn'], bezahlt: ['Bezahlt', 'ok'], storniert: ['Storniert', 'muted'] };
const ITEM_STATUS = { offen: ['Offen', 'accent'], gesammelt: ['In der Sammelablage', 'info'], abgerechnet: ['Abgerechnet', 'ok'], storniert: ['Storniert', 'muted'] };
const PI_STATUS = { offen: ['Offen', 'info'], zur_zahlung: ['Zur Zahlung vorgemerkt', 'accent'], in_zahlungsliste: ['In Zahlungsliste', 'warn'], freigegeben: ['Freigegeben', 'ok-light'], bezahlt: ['Bezahlt', 'ok'] };
const PR_STATUS = { offen: ['Wartet auf Freigabe', 'accent'], freigegeben: ['Freigegeben', 'ok-light'], ausgefuehrt: ['Ausgeführt', 'ok'] };
const st = (map, k) => badge(...(map[k] || [k, 'neutral']));
const notSent = (i) => i.kind !== 'storno' && i.status !== 'storniert' && i.mail_status && i.mail_status !== 'gesendet';
const invStatus = (i) => html`${st(INV_STATUS, i.status)}${notSent(i) ? html` ${badge('nicht versendet', 'warn')}` : ''}${i.overdue ? html` ${badge('überfällig', 'err')}` : ''}${i.dunning_level ? html`<span class="cell-sub">${S.config.dunningLevels[i.dunning_level] || 'Mahnstufe ' + i.dunning_level}</span>` : ''}`;
const ACC_TABS = () => [['uebersicht', 'Übersicht', '#/buchhaltung'], ['faelle', 'Abrechnungsfälle', '#/buchhaltung/faelle'], ['rechnungen', 'Ausgangsrechnungen', '#/buchhaltung/rechnungen'],
  ['eingang', 'Eingangsrechnungen', '#/buchhaltung/eingang'], ['lieferanten', 'Lieferanten', '#/buchhaltung/lieferanten'], ['zahlungen', 'Zahlungslisten', '#/buchhaltung/zahlungen']];
// Hinweis, solange kein E-Mail-Versand eingerichtet ist
const mailWarn = () => (S.mailReady ? '' : html`<div class="err-box mt">${icon('alert')}<span><b>E-Mail-Versand ist nicht eingerichtet.</b> Rechnungen, Mahnungen und Einladungen werden erstellt, aber <b>nicht verschickt</b>. Das Postfach-Passwort muss als Secret (SMTP_USER / SMTP_PASS) im Worker hinterlegt werden${can('settings_all') ? html` – <a class="link" href="#/verwaltung/einstellungen">zur Anleitung</a>` : ''}. Danach Rechnungen über „Erneut senden“ verschicken.</span></div>`);
const accHead = (tab) => html`${mailWarn()}${head('Buchhaltung', 'Rechnungen an Geschäftspartner, Zahlungseingänge, Mahnwesen, Eingangsrechnungen und Zahlungsläufe.', can('acc_manage') ? html`<button class="btn" data-act="newInvoice">${icon('plus')}Rechnung schreiben</button>${can('acc_manage') ? html`<button class="btn" data-act="monthlyRun">Sammelrechnungen jetzt erstellen</button>` : ''}` : '')}${tabsBar(ACC_TABS(), tab)}`;

async function pageAccounting(tab = 'uebersicht') {
  const P = page('buchhaltung');
  if (!can('acc_view')) return P.show(noAccess());
  const fn = { uebersicht: accOverview, faelle: accItems, rechnungen: accInvoices, eingang: accPurchase, lieferanten: accSuppliers, zahlungen: accPayruns }[tab] || accOverview;
  await fn(P, tab);
}
async function accOverview(P, tab) {
  const [o, od] = await Promise.all([GET('/acc/overview'), GET('/acc/invoices', { overdue: 1, sort: 'due', dir: 'asc' })]);
  if (!P.alive()) return;
  P.show(html`${accHead(tab)}
    <div class="kpis mt">
      <a class="kpi" href="#/buchhaltung/rechnungen?status=offen"><b>${fEur(o.open.sum)}</b><span>${plural(o.open.n, 'offene Rechnung', 'offene Rechnungen')}</span></a>
      <a class="kpi ${o.overdue.n ? 'hot' : ''}" href="#/buchhaltung/rechnungen?overdue=1"><b>${fEur(o.overdue.sum)}</b><span>${plural(o.overdue.n, 'Rechnung', 'Rechnungen')} überfällig</span></a>
      <a class="kpi ${o.cases.open ? 'hot' : ''}" href="#/buchhaltung/faelle"><b>${fNum(o.cases.open)}</b><span>Abrechnungsfälle offen</span></a>
      <a class="kpi" href="#/buchhaltung/faelle?status=gesammelt"><b>${fEur(o.cases.collected_sum)}</b><span>${fNum(o.cases.collected)} in der Sammelablage</span></a>
      <div class="kpi"><b>${fEur(o.month.net)}</b><span>Umsatz netto diesen Monat</span></div>
      <div class="kpi"><b>${fEur(o.month.paid)}</b><span>Zahlungseingang diesen Monat</span></div>
      <a class="kpi" href="#/buchhaltung/eingang"><b>${fEur(o.purchase.due)}</b><span>Eingangsrechnungen fällig</span></a>
      <a class="kpi ${o.payruns ? 'hot' : ''}" href="#/buchhaltung/zahlungen"><b>${fNum(o.payruns)}</b><span>Zahlungslisten zur Freigabe</span></a></div>
    <section class="panel mt"><div class="panel-head"><h2>Überfällige Rechnungen</h2><a class="btn btn-sm" href="#/buchhaltung/rechnungen?overdue=1">Alle anzeigen</a></div>
      ${od.invoices.length ? invTable(od.invoices.slice(0, 12)) : html`<div class="panel-body">${empty('Keine überfälligen Rechnungen', 'Alle offenen Rechnungen sind noch im Zahlungsziel.')}</div>`}</section>`);
}
function invTable(list) {
  return html`<div class="table-wrap"><table class="table"><thead><tr><th><button data-act="invSort" data-key="number">Nummer</button></th><th><button data-act="invSort" data-key="date">Datum</button></th><th><button data-act="invSort" data-key="recipient">Empfänger</button></th><th><button data-act="invSort" data-key="due">Fällig</button></th><th class="r"><button data-act="invSort" data-key="gross">Brutto</button></th><th class="r">Offen</th><th><button data-act="invSort" data-key="status">Status</button></th></tr></thead>
    <tbody>${list.map((i) => html`<tr class="clickable" data-act="openInvoice" data-id="${i.id}"><td class="strong num">${i.number}<span class="cell-sub">${{ einzel: 'Einzelrechnung', sammel: 'Sammelrechnung', manuell: 'Manuell', storno: 'Stornorechnung' }[i.kind] || i.kind}</span></td>
      <td>${fDate(i.issue_date)}</td><td>${i.recipient.name || '–'}<span class="cell-sub">${i.sent_to || ''}</span></td><td>${fDate(i.due_date)}</td><td class="r num">${fEur(i.gross)}${i.fees ? html`<span class="cell-sub">+ ${fEur(i.fees)} Gebühren</span>` : ''}</td><td class="r num">${fEur(i.open)}</td><td>${invStatus(i)}</td></tr>`)}</tbody></table></div>`;
}
ACT.invSort = (b) => { const q = hashQuery(); setHashQuery({ ...q, sort: b.dataset.key, dir: q.sort === b.dataset.key && q.dir !== 'asc' ? 'asc' : 'desc' }, '#/buchhaltung/rechnungen'); };

async function accItems(P, tab) {
  const q = hashQuery(); const status = q.status || 'aktiv';
  const d = await GET('/acc/items', { status }); if (!P.alive()) return;
  const n = d.counts || {};
  const chips = { aktiv: 'Aktuell', offen: 'Offen', gesammelt: 'Sammelablage', abgerechnet: 'Abgerechnet', storniert: 'Storniert', alle: 'Alle' };
  P.show(html`${accHead(tab)}<section class="panel mt"><div class="toolbar">${Object.entries(chips).map(([k, l]) => html`<a class="btn btn-sm ${status === k ? 'btn-dark' : 'btn-ghost'}" href="#/buchhaltung/faelle?status=${k}">${l}${n[k] ? html` <span class="count ${k === 'offen' ? 'hot' : ''}">${n[k]}</span>` : ''}</a>`)}
      <span class="spacer"></span><span class="small muted">Gewonnene Anfragen, deren Kontaktdaten an den Partner gingen. „Aktuell“ zeigt alle Fälle außer stornierten.</span></div>
    ${d.items.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Anfrage</th><th>Kunde</th><th>Geschäftspartner</th><th>Abrechnung</th><th class="r">Netto</th><th>Status</th><th></th></tr></thead><tbody>
      ${d.items.map((i) => html`<tr><td class="nowrap">${i.number ? html`<a class="link strong" href="#/anfragen/${i.number}">#${i.number}</a>` : '–'}<span class="cell-sub">${i.vehicle || i.description}</span><span class="cell-sub">gewonnen ${fDate(i.created_at)}</span></td>
        <td>${i.customer_name || '–'}<span class="cell-sub">${i.customer_email || ''}</span><span class="cell-sub">${i.customer_phone || ''}</span></td>
        <td>${i.org_name}<span class="cell-sub">${i.billing_email || 'keine Rechnungs-E-Mail'}</span></td><td>${i.billing_mode === 'monatlich' ? 'Monatlich' : 'Je Fall'}</td>
        <td class="r num">${fEur(i.amount_net)}</td><td>${st(ITEM_STATUS, i.status)}${i.invoice_number ? html`<span class="cell-sub"><button class="link" data-act="openInvoice" data-id="${i.invoice_id}">${i.invoice_number}</button> · ${(INV_STATUS[i.invoice_status] || [i.invoice_status])[0]}${i.invoice_cases > 1 ? ` · ${i.invoice_cases} Fälle` : ''}</span>` : ''}${i.note ? html`<span class="cell-sub">Notiz: ${i.note}</span>` : ''}${i.status === 'storniert' ? html`<span class="cell-sub">Grund: ${i.cancel_reason || '–'}</span><span class="cell-sub">${i.cancelled_by || ''} · ${fDT(i.cancelled_at)}</span>` : ''}</td>
        <td class="r"><div class="row-acts"><button class="btn btn-sm btn-ghost" data-act="itemOpen" data-id="${i.id}">Ansehen</button>${can('acc_manage') && i.status === 'offen' ? html`<button class="btn btn-sm btn-primary" data-act="itemBill" data-id="${i.id}" data-mode="${i.billing_mode}">${icon('send')}Rechnung versenden</button>` : ''}${itemCancelBtn(i)}</div></td></tr>`)}</tbody></table></div>`
      : html`<div class="panel-body">${empty({ aktiv: 'Keine aktuellen Abrechnungsfälle', offen: 'Keine offenen Abrechnungsfälle', storniert: 'Keine stornierten Fälle' }[status] || 'Keine Fälle', status === 'offen' && n.aktiv ? 'Bereits abgerechnete Fälle findest du unter „Aktuell“ oder „Abgerechnet“ – dort lassen sie sich auch stornieren.' : 'Sobald ein Kunde „Interessiert mich“ klickt, erscheint der Fall hier.')}</div>`}</section>`);
}
ACT.itemOpen = async (b) => {
  const d = await GET('/acc/items/' + b.dataset.id);
  const it = d.item, mng = can('acc_manage');
  modal({ title: `Abrechnungsfall${d.request ? ' zu Anfrage #' + d.request.number : ''}`, wide: true, body: html`<div class="grid-2">
    <div class="stack"><h3>Anfrage</h3>${d.request ? kv([['Nummer', html`<a class="link" href="#/anfragen/${d.request.number}">#${d.request.number}</a>`], ['Fahrzeug', d.request.vehicle], ['Anliegen', d.request.summary], ['Eingang', fDT(d.request.created_at)]]) : html`<p class="muted">Kein Anfragebezug.</p>`}
      <h3>Kunde</h3>${d.customer ? kv([['Name', d.customer.name], ['E-Mail', d.customer.email], ['Telefon', d.customer.phone], ['Anschrift', [d.customer.street, d.customer.zip, d.customer.city].filter(Boolean).join(' ')]]) : ''}</div>
    <div class="stack"><h3>Geschäftspartner (Zuschlag)</h3>${kv([['Firma', d.org.name], ['Rechnungsanschrift', [d.org.street, [d.org.zip, d.org.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Rechnungs-E-Mail', d.org.email], ['USt-IdNr.', d.org.vat_id], ['Abrechnung', d.org.billing_mode === 'monatlich' ? 'Monatliche Sammelrechnung' : 'Je Fall'], ['Zahlungsziel', d.org.payment_terms_days != null ? d.org.payment_terms_days + ' Tage (individuell)' : 'Standard']])}
      ${d.offer ? html`<h3>Angebot</h3>${kv([['Bearbeiter', d.offer.user_name], ...offerRows(d.offer.data).slice(0, 8)])}` : ''}</div></div>
    <hr class="sep"><form class="stack" data-submit="itemSave"><input type="hidden" name="id" value="${it.id}">
      <div class="grid-2">${field('Betrag netto', inp('amount', it.amount_net, { attrs: mng && ['offen', 'gesammelt'].includes(it.status) ? '' : 'disabled' }))}${field('Leistungstext', inp('description', it.description, { attrs: mng && ['offen', 'gesammelt'].includes(it.status) ? '' : 'disabled' }))}</div>
      ${field('Notiz', area('note', it.note, { rows: 2, ...(mng ? {} : {}) }))}
      ${it.status === 'storniert' ? html`<div class="note-box">${icon('x')}<span><b>Storniert</b> am ${fDT(it.cancelled_at)} von ${it.cancelled_by || '–'}. Grund: ${it.cancel_reason || '–'}</span></div>` : ''}
      ${mng || can('acc_cancel') ? html`<div class="row">${mng ? html`<button class="btn btn-dark" type="submit">Speichern</button>` : ''}${mng && it.status === 'offen' ? html`<button class="btn btn-primary" type="button" data-act="itemBill" data-id="${it.id}" data-mode="${d.org.billing_mode}">${icon('send')}Rechnung versenden</button>` : ''}<span class="spacer"></span>${itemCancelBtn({ ...it, invoice_number: d.invoiceNumber, invoice_cases: d.invoiceCases, invoice_paid: d.invoicePaid, billing_mode: d.org.billing_mode })}</div>` : ''}</form>` });
};
// Stornieren nur mit Recht „acc_cancel“ (Admin, Geschäftsführung, Buchhaltung)
function itemCancelBtn(i) {
  if (!can('acc_cancel')) return '';
  if (i.status === 'storniert') return html` <button class="btn btn-sm" type="button" data-act="itemReopen" data-id="${i.id}">${icon('refresh')}Storno aufheben</button>`;
  if (i.status === 'abgerechnet' && i.invoice_paid > 0) return html` <button class="btn btn-sm btn-ghost" type="button" disabled title="Für die Rechnung ${i.invoice_number} sind Zahlungen erfasst – Storno erst nach Klärung der Zahlung.">${icon('lock')}Bezahlt</button>`;
  return html` <button class="btn btn-sm btn-ghost" type="button" data-act="itemCancel" data-id="${i.id}" data-status="${i.status}" data-inv="${i.invoice_number || ''}" data-cases="${i.invoice_cases || 0}" data-monthly="${i.billing_mode === 'monatlich' ? 1 : ''}" data-no="${i.number || ''}">${icon('x')}Stornieren</button>`;
}
ACT.itemCancel = async (b) => {
  const billed = b.dataset.status === 'abgerechnet', inv = b.dataset.inv, no = b.dataset.no, cases = +b.dataset.cases || 1;
  const back = b.dataset.monthly ? 'kommt zurück in die Sammelablage' : 'wird wieder „Offen“';
  const choice = billed ? html`<div class="field"><span class="field-label">Was soll storniert werden? *</span>
      <label class="check"><input type="radio" name="mode" value="fall" checked><span><b>Fall und Rechnung stornieren</b><br><span class="small muted">Der Vorgang wird nicht berechnet. Die Rechnung ${inv} wird per Stornorechnung aufgehoben${cases > 1 ? `, die ${cases - 1} anderen Fälle dieser Rechnung werden sofort korrigiert neu berechnet` : ''}.</span></span></label>
      <label class="check"><input type="radio" name="mode" value="rechnung"><span><b>Nur die Rechnung stornieren</b><br><span class="small muted">Die Rechnung ${inv} wird per Stornorechnung aufgehoben, der Fall ${back}${cases > 1 ? ` (ebenso die ${cases - 1} anderen Fälle der Rechnung)` : ''} – z. B. um ihn mit korrigiertem Betrag neu abzurechnen.</span></span></label></div>` : '';
  const text = billed ? `Der Fall ist bereits abgerechnet (Rechnung ${inv}). Die Stornorechnung geht automatisch an den Geschäftspartner.`
    : 'Der Fall wird nicht abgerechnet und verschwindet aus den offenen Fällen' + (b.dataset.status === 'gesammelt' ? ' und aus der Sammelablage' : '') + '. Das Storno kann später wieder aufgehoben werden.';
  const d = await ask({ title: `Abrechnungsfall${no ? ' zu Anfrage #' + no : ''} stornieren?`, text, ok: 'Stornieren', danger: true,
    fields: html`${choice}${field('Grund *', inp('reason', '', { req: true, ph: 'z. B. Kunde hat nicht gekauft, Kulanz, doppelt erfasst', attrs: 'minlength="3" maxlength="300"' }), 'Wird im Protokoll, beim Fall und auf der Stornorechnung vermerkt.')}` });
  if (!d) return;
  const r = await POST(`/acc/items/${b.dataset.id}/cancel`, { reason: d.reason, mode: d.mode || 'fall' });
  closeModal();
  if (r.mode === 'rechnung') toast(`Rechnung storniert (Stornorechnung ${r.stornoNumber}). Der Fall ist wieder ${r.status === 'gesammelt' ? 'in der Sammelablage' : 'offen'}.`);
  else toast(r.stornoNumber ? `Storniert. Stornorechnung ${r.stornoNumber} erstellt${r.newNumber ? `, ${plural(r.rebilled, 'weiterer Fall', 'weitere Fälle')} neu abgerechnet (${r.newNumber})` : ''}.` : 'Fall storniert.');
  reload();
};
ACT.itemReopen = async (b) => {
  if (!(await confirmBox('Storno aufheben?', 'Der Fall wird wieder abrechenbar und erscheint unter „Offen“ (bzw. in der Sammelablage). Eine bereits erstellte Stornorechnung bleibt bestehen.', 'Storno aufheben'))) return;
  const r = await POST(`/acc/items/${b.dataset.id}/reopen`); closeModal(); toast(r.status === 'gesammelt' ? 'Fall liegt wieder in der Sammelablage.' : 'Fall ist wieder offen.'); reload();
};
SUBMIT.itemSave = async (d) => { await POST(`/acc/items/${d.id}/note`, { text: d.note }); if (d.amount !== undefined) await POST(`/acc/items/${d.id}/amount`, { amount: d.amount, description: d.description }); closeModal(); toast('Gespeichert.'); reload(); };
ACT.itemBill = async (b) => {
  const monthly = b.dataset.mode === 'monatlich';
  if (!(await confirmBox('Rechnung versenden?', monthly ? 'Dieser Partner zahlt monatlich: Der Fall kommt in die Sammelablage und wird am Monatsende mit allen anderen Fällen abgerechnet. Das Zahlungsziel beginnt dann.' : 'Die Rechnung wird erstellt und sofort per E-Mail (von noreplay@kfl-group.com) an die Rechnungsadresse des Partners geschickt.', monthly ? 'In Sammelablage legen' : 'Rechnung erstellen und senden'))) return;
  const r = await POST(`/acc/items/${b.dataset.id}/bill`); closeModal();
  if (r.mode === 'monatlich') toast('In die Sammelablage gelegt.');
  else if (r.mail === 'gesendet') toast(`Rechnung erstellt und an ${r.sentTo} versendet.`);
  else toast(`Rechnung erstellt, aber NICHT versendet: ${r.mailError || 'E-Mail-Versand nicht eingerichtet'}`, 'err');
  reload();
};
ACT.monthlyRun = async () => { if (!(await confirmBox('Sammelrechnungen jetzt erstellen?', 'Normalerweise passiert das automatisch am Monatsende. Alle Fälle in der Sammelablage werden jetzt je Partner abgerechnet und versendet.', 'Jetzt erstellen'))) return; const r = await POST('/acc/monthly-run'); toast(`${r.count || 0} Sammelrechnung(en) erstellt.`); reload(); };

async function accInvoices(P, tab) {
  const q = hashQuery();
  const d = await GET('/acc/invoices', q); if (!P.alive()) return;
  const sum = d.invoices.reduce((a, i) => a + (i.status === 'storniert' ? 0 : i.open), 0);
  P.show(html`${accHead(tab)}<section class="panel mt"><form class="toolbar" data-submit="invFilter">
      <label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Rechnungsnummer, Empfänger, Anfragenummer …" aria-label="Suche"></label>
      ${sel('status', Object.entries(INV_STATUS).map(([k, v]) => [k, v[0]]), q.status, { empty: 'Alle Status', attrs: 'data-change="invFilterChange" aria-label="Status"' })}
      ${sel('kind', [['einzel', 'Einzelrechnung'], ['sammel', 'Sammelrechnung'], ['manuell', 'Manuell'], ['storno', 'Storno']], q.kind, { empty: 'Alle Arten', attrs: 'data-change="invFilterChange" aria-label="Art"' })}
      <input type="date" name="from" value="${q.from || ''}" aria-label="Von" data-change="invFilterChange"><input type="date" name="to" value="${q.to || ''}" aria-label="Bis" data-change="invFilterChange">
      <label class="check small"><input type="checkbox" name="overdue" value="1" ${q.overdue ? raw('checked') : ''} data-change="invFilterChange"><span>Überfällig</span></label>
      <label class="check small"><input type="checkbox" name="dunned" value="1" ${q.dunned ? raw('checked') : ''} data-change="invFilterChange"><span>Angemahnt</span></label>
      <button class="btn btn-sm btn-dark" type="submit">Suchen</button></form>
    ${d.invoices.length ? html`${invTable(d.invoices)}<div class="pager"><span>${plural(d.invoices.length, 'Rechnung', 'Rechnungen')}</span><span>Offen gesamt: <b class="num">${fEur(sum)}</b></span></div>` : html`<div class="panel-body">${empty('Keine Rechnungen gefunden')}</div>`}</section>`);
}
SUBMIT.invFilter = (d) => { const q = hashQuery(); setHashQuery({ sort: q.sort, dir: q.dir, q: d.q, status: d.status, kind: d.kind, from: d.from, to: d.to, overdue: d.overdue ? 1 : '', dunned: d.dunned ? 1 : '' }, '#/buchhaltung/rechnungen'); };
CHANGE.invFilterChange = (el) => SUBMIT.invFilter({ ...formData(el.form), overdue: el.form.elements.overdue.checked, dunned: el.form.elements.dunned.checked });

ACT.openInvoice = async (b) => {
  const d = await GET('/acc/invoices/' + b.dataset.id);
  const i = d.invoice, mng = can('acc_manage'), live = ['offen', 'teilbezahlt'].includes(i.status) && i.kind !== 'storno';
  const nextLevel = (i.dunning_level || 0) + 1;
  modal({ title: `Rechnung ${i.number}`, wide: true, body: html`<div class="row-between"><div>${invStatus({ ...i, overdue: live && i.due_date < todayISO() })}</div>
      <div class="row"><a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/acc/invoices/${i.id}/pdf`)}">${icon('eye')}PDF ansehen</a><a class="btn btn-sm" href="${fileUrl(`/acc/invoices/${i.id}/pdf`, { download: 1 })}">${icon('download')}Herunterladen</a></div></div>
    <div class="grid-2 mt"><div>${kv([['Empfänger', i.recipient.name], ['Anschrift', [i.recipient.street, [i.recipient.zip, i.recipient.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['E-Mail', i.recipient.email], ['USt-IdNr.', i.recipient.vat_id], ['Versendet', i.sent_at ? `${fDT(i.sent_at)} an ${i.sent_to}` : html`<span class="badge t-warn">nicht versendet</span>${i.mail_error ? html`<span class="cell-sub">${i.mail_error}</span>` : ''}`]])}</div>
      <div>${kv([['Rechnungsdatum', fDate(i.issue_date)], ['Leistungszeitraum', i.service_from ? `${fDate(i.service_from)}${i.service_to ? ' – ' + fDate(i.service_to) : ''}` : ''], ['Fällig am', fDate(i.due_date)], ['Netto', fEur(i.net)], [`USt ${fNum(i.vat_rate)} %`, fEur(i.vat)], ['Brutto', html`<b>${fEur(i.gross)}</b>`], ['Mahngebühren', i.fees ? fEur(i.fees) : ''], ['Bezahlt', fEur(i.paid)], ['Offen', html`<b>${fEur(i.open)}</b>`]])}</div></div>
    <h3 class="mt-l">Positionen</h3><table class="table"><thead><tr><th>Leistung</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Summe</th></tr></thead><tbody>${i.lines.map((l) => html`<tr><td>${l.description}</td><td class="r">${fNum(l.qty, 2)}</td><td class="r num">${fEur(l.unit)}</td><td class="r num">${fEur(l.total)}</td></tr>`)}</tbody></table>
    <div class="grid-2 mt-l"><div><h3>Zahlungen</h3>${d.payments.length ? html`<ul class="timeline mt">${d.payments.map((p) => html`<li><div><div class="tl-meta">${fDate(p.date)} · ${p.method}${p.author ? ' · ' + p.author : ''}</div><b class="num">${fEur(p.amount)}</b>${p.note ? html` <span class="muted">${p.note}</span>` : ''}</div></li>`)}</ul>` : html`<p class="muted small mt">Noch kein Zahlungseingang.</p>`}
        ${mng && live ? html`<form class="inline-form mt" data-submit="payAdd"><input type="hidden" name="id" value="${i.id}">${field('Betrag', inp('amount', i.open.toFixed(2).replace('.', ','), { req: true }))}${field('Datum', inp('date', todayISO(), { type: 'date' }))}${field('Art', sel('method', ['Überweisung', 'Lastschrift', 'Bar', 'Verrechnung', 'Kulanz'], 'Überweisung'))}<button class="btn btn-ok" type="submit">Zahlung buchen</button></form>` : ''}</div>
      <div><h3>Mahnwesen</h3>${d.dunnings.length ? html`<ul class="timeline mt">${d.dunnings.map((m) => html`<li><div><div class="tl-meta">${fDT(m.created_at)}${m.author ? ' · ' + m.author : ' · automatisch'}</div>${S.config.dunningLevels[m.level] || 'Stufe ' + m.level}${m.fee ? ` · Gebühr ${fEur(m.fee)}` : ''} · fällig ${fDate(m.due_date)} ${m.file_id ? html`<a class="link small" target="_blank" rel="noopener" href="${fileUrl(`/acc/invoices/${i.id}/dunning-pdf/${m.id}`)}">PDF</a>` : ''}</div></li>`)}</ul>` : html`<p class="muted small mt">Noch nicht angemahnt.</p>`}
        ${mng && live && nextLevel <= 4 ? html`<button class="btn btn-sm mt" data-act="dunning" data-id="${i.id}" data-level="${nextLevel}">${icon('bell')}${nextLevel === 1 ? 'Zahlungserinnerung senden' : S.config.dunningLevels[nextLevel] + ' senden'}</button>` : ''}</div></div>`,
    foot: mng || can('acc_cancel') ? html`${can('acc_cancel') && i.kind !== 'storno' && i.status !== 'storniert' ? html`<button class="btn btn-ghost" data-act="invCancel" data-id="${i.id}">Stornieren</button>` : ''}<span class="spacer"></span>${mng ? html`<button class="btn ${notSent(i) ? 'btn-primary' : ''}" data-act="invResend" data-id="${i.id}">${icon('mail')}${notSent(i) ? 'Jetzt senden' : 'Erneut senden'}</button>` : ''}<button class="btn btn-dark" data-close>Schließen</button>` : html`<button class="btn btn-dark" data-close>Schließen</button>` });
};
SUBMIT.payAdd = async (d) => { const r = await POST(`/acc/invoices/${d.id}/payment`, d); closeModal(); toast(r.status === 'bezahlt' ? 'Zahlung gebucht – Rechnung ist bezahlt.' : 'Teilzahlung gebucht.'); reload(); };
ACT.dunning = async (b) => {
  const lvl = +b.dataset.level;
  if (!(await confirmBox(`${S.config.dunningLevels[lvl]} senden?`, lvl === 1 ? 'Eine freundliche Zahlungserinnerung geht per E-Mail an den Partner und erscheint in seinen News.' : 'Ab der 1. Mahnung wird die eingestellte Mahngebühr berechnet. Das Schreiben geht per E-Mail (von noreplay@kfl-group.com) und erscheint in den Partner-News.', 'Senden'))) return;
  const r = await POST(`/acc/invoices/${b.dataset.id}/dunning`); closeModal(); toast(`${S.config.dunningLevels[r.level]} versendet${r.fee ? ' · Gebühr ' + fEur(r.fee) : ''}.`); reload();
};
ACT.invCancel = async (b) => { const d = await ask({ title: 'Rechnung stornieren?', text: 'Es wird eine Stornorechnung erzeugt. Verknüpfte Abrechnungsfälle werden wieder geöffnet.', ok: 'Stornieren', danger: true, fields: field('Grund', inp('reason', '', { req: true })) }); if (!d) return; await POST(`/acc/invoices/${b.dataset.id}/cancel`, d); closeModal(); toast('Storniert.'); reload(); };
ACT.invResend = async (b) => { const d = await ask({ title: 'Rechnung erneut senden', ok: 'Senden', fields: field('An E-Mail (leer = Rechnungsadresse)', inp('email', '', { type: 'email' })) }); if (!d) return; const r = await POST(`/acc/invoices/${b.dataset.id}/resend`, d); toast(r.mail === 'gesendet' ? 'Rechnung gesendet.' : `Nicht versendet: ${r.error || 'E-Mail-Versand nicht eingerichtet'}`, r.mail === 'gesendet' ? 'ok' : 'err'); closeModal(); reload(); };
ACT.newInvoice = async () => {
  const orgs = (await GET('/acc/orgs')).orgs;
  const line = () => html`<tr><td><input name="ld[]" placeholder="Leistung" required></td><td><input name="lq[]" value="1" size="4"></td><td><input name="lu[]" placeholder="0,00" size="8" required></td></tr>`;
  modal({ title: 'Rechnung schreiben', wide: true, body: html`<form class="stack" data-submit="invCreate" id="invForm">
    ${field('Empfänger', sel('org_id', orgs.map((o) => [o.id, o.name]), '', { empty: 'Anderer Empfänger (unten eintragen)' }))}
    <div class="grid-2">${field('Name', inp('r_name'))}${field('E-Mail', inp('r_email', '', { type: 'email' }))}${field('Straße', inp('r_street'))}${field('PLZ / Ort', inp('r_city', '', { ph: '49451 Holdorf' }))}</div>
    <div class="grid-2">${field('Leistung von', inp('service_from', '', { type: 'date' }))}${field('Leistung bis', inp('service_to', '', { type: 'date' }))}</div>
    ${field('Einleitungstext (optional)', area('intro', '', { rows: 2 }))}
    <table class="table lines-table"><thead><tr><th>Leistung</th><th>Menge</th><th>Einzelpreis netto</th></tr></thead><tbody id="lines">${line()}${line()}</tbody></table>
    <div class="row"><button class="btn btn-sm" type="button" data-act="addLine">${icon('plus')}Position</button><span class="spacer"></span>${chk('send', true, 'Direkt per E-Mail versenden')}</div></form>`,
    foot: html`<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" type="submit" form="invForm">Rechnung erstellen</button>` });
  ACT.addLine = () => { $('#lines').insertAdjacentHTML('beforeend', part(line())); };
};
SUBMIT.invCreate = async (d) => {
  const lines = d.ld.map((desc, i) => ({ description: desc, qty: d.lq[i], unit: d.lu[i] })).filter((l) => l.description && l.unit);
  const [zip, ...city] = String(d.r_city || '').split(' ');
  await POST('/acc/invoices', { org_id: d.org_id || null, recipient: d.org_id ? null : { name: d.r_name, email: d.r_email, street: d.r_street, zip, city: city.join(' ') }, lines, service_from: d.service_from, service_to: d.service_to, intro: d.intro, send: d.send });
  closeModal(); toast('Rechnung erstellt.'); location.hash = '#/buchhaltung/rechnungen';
};

async function accPurchase(P, tab) {
  const q = hashQuery();
  const [d, s] = await Promise.all([GET('/acc/purchase', q), GET('/acc/suppliers')]); if (!P.alive()) return;
  const mng = can('acc_manage');
  P.show(html`${accHead(tab)}<section class="panel mt"><form class="toolbar" data-submit="piFilter"><label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Rechnungsnummer oder Lieferant" aria-label="Suche"></label>
      ${sel('status', Object.entries(PI_STATUS).map(([k, v]) => [k, v[0]]), q.status, { empty: 'Alle Status', attrs: 'data-change="piFilterChange" aria-label="Status"' })}
      ${sel('supplier', s.suppliers.map((x) => [x.id, x.name]), q.supplier, { empty: 'Alle Lieferanten', attrs: 'data-change="piFilterChange" aria-label="Lieferant"' })}<button class="btn btn-sm btn-dark" type="submit">Suchen</button>
      <span class="spacer"></span>${mng ? html`<button class="btn btn-sm btn-primary" type="button" data-act="piNew">${icon('plus')}Eingangsrechnung erfassen</button>` : ''}</form>
    ${d.invoices.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Lieferant</th><th>Nummer</th><th>Datum</th><th>Fällig</th><th class="r">Brutto</th><th>Status</th><th></th></tr></thead><tbody>${d.invoices.map((p) => html`<tr>
      <td><b>${p.supplier_name}</b>${p.category ? html`<span class="cell-sub">${p.category}</span>` : ''}</td><td>${p.number || '–'}</td><td>${fDate(p.date)}</td><td>${fDate(p.due_date)}${p.pay_date ? html`<span class="cell-sub">Zahlung am ${fDate(p.pay_date)}</span>` : ''}</td><td class="r num">${fEur(p.gross)}<span class="cell-sub">netto ${fEur(p.net)}</span></td><td>${st(PI_STATUS, p.status)}</td>
      <td class="r nowrap">${p.file_id ? html`<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${fileUrl(`/acc/purchase/${p.id}/file`)}">${icon('file')}Beleg</a>` : ''}
        ${mng && p.status === 'offen' ? html`<button class="btn btn-sm" data-act="piSchedule" data-id="${p.id}" data-due="${p.due_date || ''}">Zur Zahlung vormerken</button>` : ''}
        ${mng && p.status === 'zur_zahlung' ? html`<button class="btn btn-sm btn-ghost" data-act="piUnschedule" data-id="${p.id}">Vormerkung lösen</button>` : ''}
        ${mng && ['offen', 'zur_zahlung'].includes(p.status) ? html`<button class="btn btn-sm btn-ghost" data-act="piPaid" data-id="${p.id}">Bezahlt</button>` : ''}</td></tr>`)}</tbody></table></div>`
      : html`<div class="panel-body">${empty('Keine Eingangsrechnungen', 'Erfasse Rechnungen deiner Lieferanten und merke sie zur Zahlung vor.')}</div>`}</section>`);
  S.suppliers = s.suppliers;
}
SUBMIT.piFilter = (d) => setHashQuery(d, '#/buchhaltung/eingang');
CHANGE.piFilterChange = (el) => SUBMIT.piFilter(formData(el.form));
ACT.piNew = async () => {
  const sups = (S.suppliers || []).filter((x) => x.active);
  if (!sups.length) { toast('Bitte lege zuerst einen Lieferanten an.', 'err'); location.hash = '#/buchhaltung/lieferanten'; return; }
  const d = await ask({ title: 'Eingangsrechnung erfassen', wide: true, ok: 'Speichern', fields: html`<div class="grid-2">${field('Lieferant', sel('supplier_id', sups.map((x) => [x.id, x.name]), '', { attrs: 'required' }))}${field('Rechnungsnummer', inp('number', '', { req: true }))}
    ${field('Rechnungsdatum', inp('date', todayISO(), { type: 'date', req: true }))}${field('Fällig am', inp('due_date', addDays(todayISO(), 14), { type: 'date' }))}
    ${field('Netto', inp('net', '', { req: true, ph: '0,00' }))}${field('USt (leer = 19 %)', inp('vat', '', { ph: 'automatisch' }))}${field('Kategorie', inp('category', '', { ph: 'z. B. Marketing, Software' }))}${field('Beleg (PDF)', raw('<input type="file" name="file" accept="application/pdf,image/*">'))}</div>${field('Notiz', area('note', '', { rows: 2 }))}` });
  if (!d) return; const file = await fileField(d._form.elements.file, { max: 8 }); delete d._form;
  await POST('/acc/purchase', { ...d, file }); toast('Eingangsrechnung erfasst.'); reload();
};
ACT.piSchedule = async (b) => { const d = await ask({ title: 'Zur Zahlung vormerken', text: 'Vorgemerkte Rechnungen landen beim Tagesabschluss auf der Zahlungsliste zur Freigabe durch die Geschäftsführung.', ok: 'Vormerken', fields: field('Zahlung am', inp('pay_date', b.dataset.due && b.dataset.due > todayISO() ? b.dataset.due : todayISO(), { type: 'date', req: true })) }); if (!d) return; await POST(`/acc/purchase/${b.dataset.id}/schedule`, d); toast('Vorgemerkt.'); reload(); };
ACT.piUnschedule = async (b) => { await POST(`/acc/purchase/${b.dataset.id}/unschedule`); reload(); };
ACT.piPaid = async (b) => { if (!(await confirmBox('Als bezahlt markieren?', 'Nur verwenden, wenn die Rechnung außerhalb der Zahlungsliste bezahlt wurde.', 'Als bezahlt markieren'))) return; await POST(`/acc/purchase/${b.dataset.id}/paid`); reload(); };

async function accSuppliers(P, tab) {
  const d = await GET('/acc/suppliers'); if (!P.alive()) return;
  P.show(html`${accHead(tab)}<section class="panel mt"><div class="toolbar"><span class="small muted">Lieferantenkonten mit Bankverbindung für den SEPA-Zahlungslauf.</span><span class="spacer"></span>${can('acc_manage') ? html`<button class="btn btn-sm btn-primary" data-act="supEdit">${icon('plus')}Lieferant anlegen</button>` : ''}</div>
    ${d.suppliers.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Kontakt</th><th>IBAN</th><th>Kundennr.</th><th class="r">Rechnungen</th><th></th></tr></thead><tbody>${d.suppliers.map((x) => html`<tr class="${x.active ? '' : 'muted'}">
      <td><b>${x.name}</b><span class="cell-sub">${[x.street, x.zip, x.city].filter(Boolean).join(' ')}</span></td><td>${x.email || '–'}<span class="cell-sub">${x.phone || ''}</span></td><td class="num">${x.iban ? x.iban.replace(/(.{4})/g, '$1 ').trim() : html`<span class="badge t-warn">fehlt</span>`}</td><td>${x.customer_no || '–'}</td><td class="r">${x.invoices}</td>
      <td class="r">${can('acc_manage') ? html`<button class="btn btn-sm btn-ghost" data-act="supEdit" data-id="${x.id}">Bearbeiten</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="panel-body">${empty('Noch keine Lieferanten')}</div>`}</section>`);
  S.suppliers = d.suppliers;
}
ACT.supEdit = async (b) => {
  const x = (S.suppliers || []).find((s) => s.id === +b.dataset.id) || {};
  const d = await ask({ title: x.id ? 'Lieferant bearbeiten' : 'Lieferant anlegen', wide: true, ok: 'Speichern', fields: html`<div class="grid-2">${field('Name', inp('name', x.name, { req: true }))}${field('E-Mail', inp('email', x.email, { type: 'email' }))}
    ${field('Straße', inp('street', x.street))}<div class="grid-2">${field('PLZ', inp('zip', x.zip))}${field('Ort', inp('city', x.city))}</div>${field('Telefon', inp('phone', x.phone))}${field('Unsere Kundennummer', inp('customer_no', x.customer_no))}
    ${field('IBAN', inp('iban', x.iban))}${field('BIC', inp('bic', x.bic))}${field('USt-IdNr.', inp('vat_id', x.vat_id))}</div>${field('Notiz', area('note', x.note, { rows: 2 }))}${x.id ? chk('active', x.active, 'Aktiv') : ''}` });
  if (!d) return; delete d._form;
  if (x.id) await PATCH('/acc/suppliers/' + x.id, d); else await POST('/acc/suppliers', d);
  toast('Gespeichert.'); reload();
};

async function accPayruns(P, tab) {
  const d = await GET('/acc/payruns'); if (!P.alive()) return;
  P.show(html`${accHead(tab)}<div class="info-box mt">${icon('clock')}<span>Beim Tagesabschluss (Uhrzeit in den Einstellungen) werden alle vorgemerkten Eingangsrechnungen auf eine Zahlungsliste gesetzt. Die Geschäftsführung gibt sie frei und lädt die SEPA-Datei fürs Online-Banking herunter.</span></div>
    <section class="panel mt"><div class="toolbar"><h3>Zahlungslisten</h3><span class="spacer"></span>${can('acc_manage') ? html`<button class="btn btn-sm" data-act="dayClose">Tagesabschluss jetzt ausführen</button>` : ''}</div>
    ${d.payruns.length ? d.payruns.map((p) => html`<div class="asg"><div class="asg-head"><div><b>Zahlungsliste vom ${fDate(p.day)}</b><div class="asg-meta">${plural(p.items.length, 'Zahlung', 'Zahlungen')} · Summe <b class="num">${fEur(p.total)}</b>${p.released_at ? ` · freigegeben ${fDT(p.released_at)} von ${p.released_name || '–'}` : ''}</div></div>${st(PR_STATUS, p.status)}</div>
      <table class="table mt"><tbody>${p.items.map((i) => html`<tr><td>${i.supplier}<span class="cell-sub">${i.purpose}</span></td><td class="num small">${i.iban}</td><td class="r num">${fEur(i.amount)}</td></tr>`)}</tbody></table>
      <div class="row">${p.status === 'offen' && can('acc_release') ? html`<button class="btn btn-sm btn-primary" data-act="prRelease" data-id="${p.id}">Freigeben und SEPA-Datei erzeugen</button>` : ''}${p.status === 'offen' && !can('acc_release') ? html`<span class="small muted">Wartet auf Freigabe durch die Geschäftsführung.</span>` : ''}
        ${p.file_id ? html`<a class="btn btn-sm" href="${fileUrl(`/acc/payruns/${p.id}/file`)}">${icon('download')}SEPA-Datei (XML)</a>` : ''}${p.status === 'freigegeben' && can('acc_manage') ? html`<button class="btn btn-sm btn-ok" data-act="prPaid" data-id="${p.id}">Als ausgeführt markieren</button>` : ''}</div></div>`)
      : html`<div class="panel-body">${empty('Noch keine Zahlungslisten')}</div>`}</section>`);
}
ACT.dayClose = async () => { const r = await POST('/acc/payruns/close'); toast(r.id ? 'Zahlungsliste erstellt.' : 'Keine vorgemerkten Zahlungen für heute.', r.id ? 'ok' : 'err'); reload(); };
ACT.prRelease = async (b) => { const d = await ask({ title: 'Zahlungsliste freigeben', text: 'Es wird eine SEPA-Überweisungsdatei (pain.001) für dein Online-Banking erzeugt.', ok: 'Freigeben', fields: field('Ausführungsdatum', inp('exec_date', todayISO(), { type: 'date', req: true })) }); if (!d) return; await POST(`/acc/payruns/${b.dataset.id}/release`, d); toast('Freigegeben. Die SEPA-Datei steht zum Download bereit.'); reload(); };
ACT.prPaid = async (b) => { await POST(`/acc/payruns/${b.dataset.id}/paid`); toast('Als ausgeführt markiert.'); reload(); };
