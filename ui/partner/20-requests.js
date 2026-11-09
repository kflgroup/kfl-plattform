/* ===== Anfragen, Angebot abgeben ===== */
const PTABS = () => { const st = P.start || {}, n = (k) => (st[k] || []).length || 0; return [['neu', 'Neu', '#/anfragen?tab=neu', n('newRequests')], ['meine', 'In Bearbeitung', '#/anfragen?tab=meine', n('mine')], ['beantwortet', 'Beim Kunden', '#/anfragen?tab=beantwortet', n('waiting')], ['gewonnen', 'Gewonnen', '#/anfragen?tab=gewonnen', n('won')], ['archiv', 'Archiv', '#/anfragen?tab=archiv'], isVL() && ['team', 'Team', '#/anfragen?tab=team']]; };
const TAB_EMPTY = { neu: ['Keine neuen Anfragen', 'Neue Anfragen aus deiner Region erscheinen hier – du bekommst zusätzlich eine E-Mail.'], meine: ['Nichts in Bearbeitung', 'Übernimm eine neue Anfrage und gib dein Angebot ab.'], beantwortet: ['Noch keine Angebote offen', ''], gewonnen: ['Noch kein Deal gewonnen', 'Gute Angebote zahlen sich aus – bleib dran!'], archiv: ['Archiv ist leer', ''], team: ['Keine Anfragen im Team', ''] };
async function pRequests() {
  const V = ppage('anfragen');
  const tab = hashQuery().tab || 'neu';
  const d = await GET('/requests', { tab }); if (!V.alive()) return;
  if (!P.start) await pcounts(); if (!V.alive()) return;
  V.show(html`${phead('Anfragen', 'Alle Anfragen aus deiner Region – sortiert nach Status. Wer zuerst ein starkes Angebot abgibt, gewinnt.')}${P.start ? html`${partnerPipeline({ neu: P.start.newRequests, mine: P.start.mine, waiting: P.start.waiting, won: P.start.won }, P.start.stats, tab)}<div class="sub-tabs">${[['archiv', 'Archiv', '#/anfragen?tab=archiv'], isVL() && ['team', 'Team', '#/anfragen?tab=team']].filter(Boolean).map(([k, l, h]) => html`<a class="${tab === k ? 'on' : ''}" href="${h}">${icon(k === 'team' ? 'users' : 'file')}${l}</a>`)}</div>` : ptabs(PTABS(), tab)}
    ${tab === 'neu' ? html`<div class="hint-bar">${icon('shield')}<span>Vor der Übernahme siehst du nur die Eckdaten. Nach der Übernahme gehört die Anfrage dir – dein Team sieht sie dann nicht mehr.</span></div>` : ''}
    <div class="mt">${d.items.length ? html`<div class="rq-wrap">${rqList(d.items)}</div>` : html`<section class="block">${empty(...TAB_EMPTY[tab])}</section>`}</div>`);
}

let PA = null;
const numOf = (v) => { const m = String(v || '').replace(/\./g, '').match(/\d+/g); return m ? +m[m.length - 1] : ''; };
async function pRequest(id) {
  const V = ppage('anfragen');
  const d = await GET('/requests/' + id); pcounts(); if (!V.alive()) return;
  const a = d.item; PA = a; const r = a.request;
  const back = ['#/anfragen?tab=' + ({ neu: 'neu', in_bearbeitung: 'meine', versendet: 'beantwortet', vorgestellt: 'beantwortet', gewonnen: 'gewonnen', nicht_erreicht: 'gewonnen' }[a.status] || 'archiv'), 'Anfragen'];
  if (a.level === 'teaser') {
    return V.show(html`${phead(`Anfrage #${r.number}`, r.typeLabel, badge(a.statusLabel, a.tone), back)}<section class="block teaser">
      ${zTag(r.zustand)}<div class="big">${r.zustand || 'Fahrzeug'}</div>
      <div class="facts"><div><b>${r.brand || '–'}</b><span>Marke</span></div><div><b>PLZ ${r.plz || '–'}</b><span>Wohnort des Kunden</span></div><div><b>${a.distance_km != null ? fNum(a.distance_km) + ' km' : '–'}</b><span>Luftlinie zu dir</span></div><div><b>${fDT(a.deadline_at)}</b><span>Angebotsfrist</span></div></div>
      ${clock(a.deadline_at)}
      ${r.tradeIn ? html`<div class="dual-card">${icon('refresh')}<div><b>Doppeltes Geschäft möglich</b><span>Der Kunde möchte sein jetziges Auto in Zahlung geben. Nach der Übernahme siehst du die Fahrzeugdaten und kannst zusätzlich den Ankauf übernehmen.</span></div></div>` : ''}
      <p class="muted small">Nach der Übernahme siehst du alle Details der Anfrage. Du hast dann ${4} Stunden für dein Angebot – sonst wird sie wieder für dein Team freigegeben. Kontaktdaten des Kunden bekommst du, sobald er dein Angebot annimmt.</p>
      <button class="btn btn-primary" data-act="ptake" data-id="${a.id}">${icon('bolt')}Anfrage übernehmen</button></section>`);
  }
  if (a.level === 'summary') {
    return V.show(html`${phead(`Anfrage #${r.number}`, `${r.zustand || ''} ${r.brand || ''} · PLZ ${r.plz}`, badge(a.statusLabel, a.tone), back)}<section class="block narrow"><div class="block-head"><h2><span class="h-ic">${icon('lock')}</span>Wird von deinem Team bearbeitet</h2></div><div class="block-body">
      ${kv([['Bearbeitet von', a.taker || '–'], ['Übernommen', fDT(a.taken_at)], ['Angebot gesendet', a.sent_at ? fDT(a.sent_at) : 'noch nicht'], ['Frist', fDT(a.deadline_at)], ['Kontaktfrist', a.contact_due_at ? fDT(a.contact_due_at) : '']])}
      <p class="small muted mt">Inhalt und Angebot sieht nur die bearbeitende Person. ${isVL() ? html`Abgegebene Angebote findest du unter <a class="link" href="#/angebote">Angebote</a>.` : ''}</p></div></section>`);
  }
  const f = r.fields || {};
  const statusBox = {
    in_bearbeitung: html`<div class="note-box">${icon('clock')}<div class="spacer">Du bearbeitest diese Anfrage. ${a.lock_until ? html`Reserviert bis <b>${fTime(a.lock_until)} Uhr</b> (${fLeft(a.lock_until)}) – danach wird sie wieder für dein Team freigegeben.` : ''}</div><button class="btn btn-sm" data-act="prelease" data-id="${a.id}">Wieder öffnen</button></div>`,
    versendet: html`<div class="info-box">${icon('send')}<span>Dein Angebot wurde am ${fDT(a.sent_at)} gesendet. Nach Ablauf der Frist wertet die KFL alle Angebote aus und stellt dem Kunden das beste vor.</span></div>`,
    vorgestellt: html`<div class="present">${icon('star')}<span><b>Stark! Dein Angebot wurde dem Kunden vorgestellt.</b> Sobald er „Interessiert mich“ klickt, bekommst du seine Kontaktdaten.</span></div>`,
    gewonnen: html`<div class="win">${icon('trophy')}<div><b>Gewonnen! Der Kunde wartet auf deinen Anruf.</b><div class="small">Bitte melde dich bis ${fDT(a.contact_due_at)} (${fLeft(a.contact_due_at)}).</div></div></div>`,
    nicht_erreicht: html`<div class="note-box">${icon('phone')}<span>Du hast den Kunden nicht erreicht. Die KFL fragt beim Kunden nach und meldet sich. Versuch es gern weiter.</span></div>`,
    kontaktiert: html`<div class="present">${icon('check')}<span>Kunde erfolgreich kontaktiert – viel Erfolg beim Abschluss!</span></div>`,
    geschlossen: html`<div class="note-box">${icon('x')}<span>Geschlossen. ${a.closed_reason || 'Dein Angebot wurde dem Kunden nicht vorgestellt.'}</span></div>`,
    verloren: html`<div class="note-box">${icon('clock')}<span>${a.closed_reason || 'Die Frist ist abgelaufen.'}</span></div>`,
    gescheitert: html`<div class="note-box">${icon('x')}<span>Verhandlung gescheitert. ${a.closed_reason || ''}</span></div>`
  }[a.status] || '';
  const offerView = a.offer ? html`<section class="block"><div class="block-head"><h2>Dein Angebot</h2>${offerStatus(a.offer.status)}</div><div class="block-body"><div class="offer-price num">${offerHeadline(a.offer.data)}</div><div class="mt">${kv(offerRows(a.offer.data))}</div></div></section>` : '';
  V.show(html`${phead(html`#${r.number} · ${r.vehicle || [r.brand, r.model].filter(Boolean).join(' ')}`, html`${r.typeLabel} · ${r.summary || ''} · PLZ ${r.plz}${a.distance_km != null ? ` (${fNum(a.distance_km)} km)` : ''}`, html`<div class="row">${['neu', 'in_bearbeitung'].includes(a.status) ? clock(a.deadline_at) : ''}${badge(a.statusLabel, a.tone)}</div>`, back)}
    ${statusBox}
    <div class="p-detail mt"><div class="stack">
      ${a.contact ? html`<section class="contact-card stack-s" id="kontakt"><h3>Kontaktdaten des Kunden</h3>${kv([['Name', a.contact.name], ['Telefon', a.contact.phone], ['E-Mail', a.contact.email], ['Anschrift', [a.contact.street, [a.contact.zip, a.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Bevorzugt', a.contact.contactWay]])}
        <div class="row">${a.contact.phone ? html`<a class="btn btn-ok" href="tel:${a.contact.phone.replace(/[^+\d]/g, '')}">${icon('phone')}Anrufen</a>` : ''}${a.contact.email ? html`<a class="btn" href="mailto:${a.contact.email}?subject=${encodeURIComponent('Ihr Angebot über KFL – Anfrage #' + r.number)}">${icon('mail')}E-Mail</a>` : ''}</div>
        ${['gewonnen', 'nicht_erreicht'].includes(a.status) ? html`<div class="row mt"><button class="btn btn-ok btn-sm" data-act="pcontact" data-s="kontaktiert">${icon('check')}Kunde erfolgreich kontaktiert</button><button class="btn btn-sm" data-act="pcontact" data-s="nicht_erreicht">Kunde nicht erreicht</button></div>` : ''}
        <button class="btn btn-sm btn-ghost" data-act="pcontract">${icon('file')}Vertragsunterlagen vorbereiten</button></section>` : ''}
      ${linkedCard(a)}
      <section class="block"><div class="block-head"><h2>Anfrage des Kunden</h2><span class="small muted">${fDT(r.created_at)}</span></div><div class="block-body">${kv(Object.entries(f).filter(([k]) => !k.startsWith('Altwagen ')).map(([k, v]) => [k === 'body' ? 'Sonstiges' : k, html`<span class="pre">${v}</span>`]))}
        <p class="tiny muted mt">Name, E-Mail, Telefon und Anschrift des Kunden siehst du nach seiner Zusage.</p></div></section>
      ${a.trade ? html`<section class="block"><div class="block-head"><h2>Altwagen zur Inzahlungnahme</h2><span class="small muted">#${a.trade.request.number}</span></div><div class="block-body">${kv(Object.entries(a.trade.request.fields || {}).filter(([k]) => !/^Inzahlungnahme zu$|^(PLZ|Umkreis|Kontaktweg)$/.test(k)).map(([k, v]) => [k === 'body' ? 'Sonstiges' : k, html`<span class="pre">${v}</span>`]))}</div></section>` : ''}
      ${!a.trade && Object.keys(f).some((k) => k.startsWith('Altwagen ')) ? html`<section class="block"><div class="block-head"><h2>Altwagen zur Inzahlungnahme</h2></div><div class="block-body">${kv(Object.entries(f).filter(([k]) => k.startsWith('Altwagen ')).map(([k, v]) => [k.slice(9), html`<span class="pre">${v}</span>`]))}</div></section>` : ''}
      ${a.events && a.events.length ? html`<section class="block"><div class="block-head"><h2>Verlauf</h2></div><div class="block-body"><ul class="timeline">${a.events.map((e) => html`<li class="${/^KFL/.test(e.text || '') ? 'kfl' : ''}"><div><div class="tl-meta">${e.actor_name || 'KFL'} · ${fDT(e.created_at)}</div><div>${e.text}</div></div></li>`)}</ul></div></section>` : ''}
    </div><div class="stack">${r.type === 'deal' && a.mine && (a.trade || (a.linked && a.linked.canJoin && ['in_bearbeitung', 'versendet'].includes(a.status))) ? comboForm(a) : a.status === 'in_bearbeitung' && a.mine ? offerForm(a) : offerView}</div></div>`);
  // Direkt aus der E-Mail („Kontaktdaten öffnen“): zur Kontaktkarte springen und kurz hervorheben
  if (/[?&]kontakt\b/.test(location.hash)) { const cc = $('.contact-card'); if (cc) { cc.classList.add('flash'); cc.scrollIntoView({ block: 'start', behavior: 'smooth' }); setTimeout(() => cc.classList.remove('flash'), 2600); } }
}
// Verknüpfte Anfrage (Inzahlungnahme ↔ Traumwagen-DEAL)
function linkedCard(a) {
  const l = a.linked; if (!l) return '';
  if (a.request.type === 'deal') {
    if (a.trade) return html`<section class="dual-card big">${icon('refresh')}<div><b>Kombi-Angebot: Fahrzeug + Inzahlungnahme</b>
      <span>Du hast die Inzahlungnahme (#${a.trade.request.number}) mit übernommen. Beide Angebote gibst du rechts in einer Maske ab – sie werden getrennt bewertet, der Kunde sieht, dass sie zusammengehören.</span></div></section>`;
    if (!l.canJoin) return html`<section class="dual-card">${icon('refresh')}<div><b>Inzahlungnahme</b><span>Der Kunde möchte sein jetziges Fahrzeug in Zahlung geben. Für den Ankauf werden keine Angebote mehr angenommen.</span></div></section>`;
    return html`<section class="dual-card big">${icon('refresh')}<div><b>Doppeltes Geschäft möglich: Fahrzeug + Inzahlungnahme</b>
      <span>Der Kunde möchte sein jetziges Fahrzeug in Zahlung geben${l.vehicle ? ` (${l.vehicle})` : ''}. Biete den Ankauf direkt mit an – die Felder erscheinen rechts unter deinem Fahrzeugangebot, du musst nicht zwischen Anfragen wechseln.</span>
      ${a.mine ? html`<div class="row mt-s"><button class="btn btn-primary btn-sm" data-act="pjoin" data-id="${a.id}">${icon('plus')}Inzahlungnahme mit anbieten</button></div>` : ''}</div></section>`;
  }
  return html`<section class="dual-card">${icon('refresh')}<div><b>Kunde kauft gleichzeitig ein Fahrzeug</b><span>Dieses Fahrzeug soll beim Kauf über KFL in Zahlung gehen (Fahrzeug-Anfrage #${l.number}${l.vehicle ? ` · ${l.vehicle}` : ''}).${l.aid && l.mine ? ' Du kannst beide Angebote gemeinsam in der Fahrzeug-Anfrage abgeben.' : ''}</span>
    ${l.aid ? html`<div class="row mt-s"><a class="btn btn-sm" href="#/anfragen/${l.aid}">Zur Fahrzeug-Anfrage #${l.number}</a></div>` : ''}</div></section>`;
}
ACT.pjoin = async (b) => {
  if (!(await confirmBox('Inzahlungnahme mit anbieten?', 'Die Inzahlungnahme wird dir zugeordnet und für dich reserviert. Die Felder für dein Ankaufangebot erscheinen direkt unter deinem Fahrzeugangebot.', 'Mit anbieten'))) return;
  await POST(`/requests/${b.dataset.id}/linked`); toast('Inzahlungnahme übernommen – die Felder stehen jetzt in deinem Angebot.'); await pcounts(); plast = null; await preload();
  const t = $('.combo-trade'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
ACT.ptake = async (b) => { await POST(`/requests/${b.dataset.id}/take`); toast('Übernommen – jetzt Angebot erstellen.'); await pcounts(); plast = null; preload(); };
ACT.prelease = async (b) => { if (!(await confirmBox('Anfrage wieder öffnen?', 'Die Anfrage wird wieder für deine ganze Organisation sichtbar. Das wird vertraulich vermerkt.', 'Wieder öffnen'))) return; await POST(`/requests/${b.dataset.id}/release`); toast('Wieder für dein Team geöffnet.'); location.hash = '#/anfragen'; };
ACT.pcontact = async (b) => {
  const s = b.dataset.s;
  const d = await ask({ title: s === 'kontaktiert' ? 'Kunde erfolgreich kontaktiert' : 'Kunde nicht erreicht', text: s === 'kontaktiert' ? 'Super! Kurze Notiz zum Stand (optional).' : 'Die KFL fragt beim Kunden nach, ob du dich gemeldet hast. Wie oft und wie hast du es versucht?', ok: 'Speichern', fields: field('Notiz', area('note', '', { rows: 3, req: s !== 'kontaktiert' })) });
  if (!d) return; await POST(`/requests/${PA.id}/contact`, { status: s, note: d.note }); toast('Gespeichert.'); await pcounts(); preload();
};
ACT.pcontract = () => {
  const a = PA, r = a.request, o = a.offer ? a.offer.data : {};
  modal({ title: 'Vertragsunterlagen vorbereiten', wide: true, cls: 'printable', body: html`<p class="small muted">Zusammenfassung für deinen Kauf-, Leasing- oder Finanzierungsvertrag. Übernimm die Daten in dein Vertragssystem oder speichere die Seite als PDF.</p>
    <div class="grid-2 mt"><div><h3>Kunde</h3>${kv([['Name', a.contact.name], ['Anschrift', [a.contact.street, [a.contact.zip, a.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Telefon', a.contact.phone], ['E-Mail', a.contact.email], ['Kundenart', (r.fields || {}).Kundenart]])}</div>
      <div><h3>Fahrzeug</h3>${kv([['Fahrzeug', r.vehicle], ['Zustand', r.zustand], ['Wunsch', r.summary], ['KFL-Anfrage', '#' + r.number]])}</div></div>
    ${custConfig(r, o)}
    <h3 class="mt-l">Angebot</h3>${kv(offerRows(o).map(([k, v]) => (k === 'Konfiguration' ? [k, o.config === 'gleich' ? 'Wie vom Kunden angefragt (Konfiguration siehe oben)' : o.herstellercode ? `Alternative · Herstellercode ${o.herstellercode}` : v] : k === 'Herstellercode' ? null : [k, v])).filter(Boolean))}`, foot: html`<button class="btn btn-ghost" data-close>Schließen</button><button class="btn btn-dark" data-act="pprint">${icon('download')}Drucken / als PDF</button>` });
};
// Konfiguration laut Kundenanfrage (alle Angaben inkl. „Sonstiges“) – für den Vertrag ausgeschrieben
const CFG_SKIP = /^(PLZ|Umkreis|Kontaktweg|Kundenart|Zustand|Formular|form|utf8|form_type|AGB akzeptiert|Datenschutz akzeptiert)$/i;
function custConfig(r, o) {
  const f = r.fields || {};
  const rows = Object.entries(f).filter(([k, v]) => !CFG_SKIP.test(k) && !/^(Altwagen |Ankauf-Anfrage|Inzahlungnahme zu$)/.test(k) && String(v ?? '').trim() !== '').map(([k, v]) => [k === 'body' ? 'Sonstiges' : k, html`<span class="pre">${v}</span>`]);
  if (!rows.length) return '';
  return html`<h3 class="mt-l">${o.config === 'alternativ' ? 'Konfiguration laut Kundenanfrage (Angebot weicht ab)' : 'Konfiguration laut Kundenanfrage'}</h3>${o.config === 'gleich' ? html`<p class="small muted">Das Angebot entspricht dieser Konfiguration.</p>` : ''}${kv(rows)}`;
}
ACT.pprint = () => { document.body.classList.add('printing'); window.print(); setTimeout(() => document.body.classList.remove('printing'), 500); };

// Eingabefelder eines Angebots; px = Namenspräfix (z. B. „t_“ für die Inzahlungnahme in derselben Maske)
function offerFields(a, px = '') {
  const r = a.request, f = r.fields || {}, kind = a.kindHint;
  const used = /gebraucht/i.test(r.zustand || '');
  const service = !!f['Servicepaket Wartung & Inspektion'], kasko = !!f['Servicepaket Versicherung / Kasko'];
  const km = numOf(f['Kilometer pro Jahr']), term = numOf(f.Laufzeit);
  const vat = kind === 'finanzierung' ? 'brutto' : a.b2b ? 'netto' : 'brutto';
  const n = (x) => px + x;
  const money = (name, label, req, hint) => field(`${label}${req ? ' *' : ''} (${vat})`, inp(n(name), '', { req, ph: '0,00', attrs: 'inputmode="decimal"' }), hint);
  const seg = (name, opts, req) => html`<div class="seg">${opts.map(([v, l], i) => html`<label><input type="radio" name="${n(name)}" value="${v}" ${req && i === 0 ? raw('required') : ''}><span>${l}</span></label>`)}</div>`;
  return html`<div class="pdf-drop"><b>Angebot als PDF hochladen</b><span class="small muted">Optional. Wir lesen die Eckdaten aus und tragen sie unten ein – bitte prüfen. Der Kunde sieht das Angebot neutral ohne deine Firmendaten.</span>
      <input type="file" name="${n('pdf')}" accept="application/pdf" data-change="pparsePdf" data-aid="${a.id}" data-px="${px}"><div id="${n('sugg')}"></div></div>
    ${kind !== 'ankauf' ? html`<div class="field"><span class="field-label">Konfiguration *</span><div class="seg"><label><input type="radio" name="${n('config')}" value="gleich" checked data-change="pconfig" data-px="${px}"><span>Wie angefragt</span></label><label><input type="radio" name="${n('config')}" value="alternativ" data-change="pconfig" data-px="${px}"><span>Alternative</span></label></div></div>
      <div id="${n('altBox')}" class="stack hide">${field('Herstellercode / Konfigurationscode', inp(n('herstellercode'), '', { ph: 'z. B. AUDI-A4-XYZ123' }))}${field('Exposé (PDF)', raw(`<input type="file" name="${n('expose')}" accept="application/pdf">`))}</div>` : ''}
    <div class="field"><span class="field-label">${kind === 'ankauf' ? 'Entsprechen die Fahrzeugangaben deiner Einschätzung? *' : 'Entspricht die Ausstattung der Anfrage? *'}</span>${seg('equipment_match', [['ja', 'Ja'], ['nein', 'Nein']], true)}</div>
    <div class="grid-2">
      ${kind === 'kauf' ? money('price', 'Kaufpreis', true) : ''}
      ${kind === 'leasing' ? html`${money('monthly_rate', 'Monatliche Rate', true, 'ohne Service- und Versicherungskosten')}${field('Kilometer pro Jahr *', inp(n('km_per_year'), km, { req: true, attrs: 'inputmode="numeric"' }), km ? `Kundenwunsch: ${fNum(km)} km – bestätigen oder Alternative eintragen` : '')}
        ${field('Laufzeit in Monaten *', inp(n('term_months'), term, { req: true, attrs: 'inputmode="numeric"' }), term ? `Kundenwunsch: ${term} Monate` : '')}${money('down_payment', 'Sonderzahlung', false)}` : ''}
      ${kind === 'finanzierung' ? html`${money('price', 'Kaufpreis', true)}${money('monthly_rate', 'Monatliche Rate', true)}${money('final_rate', 'Schlussrate', true)}${field('Laufzeit in Monaten *', inp(n('term_months'), term, { req: true, attrs: 'inputmode="numeric"' }))}${money('down_payment', 'Anzahlung', false)}` : ''}
      ${kind === 'ankauf' ? html`${money('buy_price', 'Dein Ankaufpreis', true, px ? 'Der Kunde sieht genau diesen Preis.' : '')}${field('Abholung / Übergabe', inp(n('pickup'), '', { ph: 'z. B. Übergabe bei Auslieferung des neuen Fahrzeugs' }))}` : ''}
      ${kind !== 'ankauf' ? money('transfer_cost', 'Überführung und Zulassung', false) : ''}
      ${service ? money('service_cost', 'Servicepaket Wartung & Inspektion (mtl.)', true, 'Vom Kunden gewünscht') : ''}${kasko ? money('insurance_cost', 'Versicherung / Kasko (mtl.)', true, 'Vom Kunden gewünscht') : ''}
      ${kind !== 'ankauf' ? field('Lieferzeit / Verfügbarkeit', inp(n('delivery'), '', { ph: 'z. B. sofort, 8 Wochen' })) : ''}${field('Angebot gültig bis', inp(n('valid_until'), addDays(todayISO(), 7), { type: 'date' }))}</div>
    ${used || kind === 'ankauf' ? html`<fieldset><legend>${kind === 'ankauf' ? 'Fahrzeugzustand laut deiner Einschätzung' : 'Angaben zum Fahrzeug'}</legend><div class="grid-2">${field('Erstzulassung', inp(n('first_registration'), '', { ph: 'MM/JJJJ' }))}${field('Kilometerstand', inp(n('mileage'), '', { attrs: 'inputmode="numeric"' }))}
      ${kind !== 'ankauf' ? field('UPE (Neupreis, falls bekannt)', inp(n('upe'), '', { attrs: 'inputmode="decimal"' })) : ''}${kind !== 'ankauf' ? field('Vorbesitzer', inp(n('owners'), '', { attrs: 'inputmode="numeric"' })) : ''}
      <div class="field"><span class="field-label">Unfallfrei</span>${seg('accident_free', [['ja', 'Ja'], ['nein', 'Nein']], false)}</div></div></fieldset>` : ''}
    ${field(kind === 'ankauf' && px ? 'Zusätzliche Informationen / Sonstiges zur Inzahlungnahme' : 'Anmerkungen für den Kunden', area(n('notes'), '', { rows: 3, ph: kind === 'ankauf' ? 'z. B. Preis vorbehaltlich Besichtigung, Winterräder werden mit übernommen' : 'Was macht dein Angebot besonders? z. B. Wartung inklusive, Winterräder' }))}
    <p class="tiny muted">Preise ${vat === 'netto' ? 'netto (gewerblicher Kunde)' : 'brutto'}. Mit * markierte Felder sind Pflicht.</p>`;
}
function offerForm(a) {
  return html`<form class="block offer-form" data-submit="psendOffer"><div class="block-head"><h2>Angebot erstellen</h2><span class="kind-pill">${OFFER_KIND[a.kindHint]}</span></div><div class="block-body stack">
    ${offerFields(a)}<div class="sticky-submit"><button class="btn btn-primary btn-block" type="submit">${icon('send')}Angebot senden</button></div></div></form>`;
}
const sentOffer = (o, label) => html`<div class="combo-sent"><div class="row-between"><b>${label}</b>${offerStatus(o.status)}</div><div class="offer-price num">${offerHeadline(o.data)}</div><div class="mt-s">${kv(offerRows(o.data))}</div></div>`;
// Traumwagen-DEAL mit Inzahlungnahme: beide Angebote in einer Maske, ein Klick zum Senden – getrennt gespeichert und bewertet
function comboForm(a) {
  const t = a.trade, l = a.linked || {};
  const dealOpen = a.status === 'in_bearbeitung' && a.mine, tradeOpen = !!(t && t.mine && t.status === 'in_bearbeitung');
  const ta = t ? { ...t, kindHint: 'ankauf' } : null;
  const both = dealOpen && tradeOpen;
  return html`<form class="block offer-form" data-submit="psendCombo"><div class="block-head"><h2>${both ? 'Angebote erstellen' : 'Angebot erstellen'}</h2><span class="kind-pill">${OFFER_KIND[a.kindHint]}${t ? ' + Ankauf' : ''}</span></div><div class="block-body stack">
    <div class="combo-step"><span class="combo-n">1</span><div><b>Angebot für das Fahrzeug</b><span class="small muted">${OFFER_KIND[a.kindHint]} · #${a.request.number}</span></div></div>
    ${dealOpen ? offerFields(a) : a.offer ? sentOffer(a.offer, 'Fahrzeugangebot gesendet') : html`<p class="small muted">Für das Fahrzeug ist kein Angebot mehr möglich.</p>`}
    <div class="combo-step"><span class="combo-n">2</span><div><b>Angebot zur Inzahlungnahme</b><span class="small muted">${t ? `Ankauf des Altwagens · #${t.request.number}` : 'Der Kunde möchte sein jetziges Fahrzeug in Zahlung geben.'}</span></div></div>
    ${tradeOpen ? html`<div class="combo-trade stack">${offerFields(ta, 't_')}</div>`
      : t && t.offer ? sentOffer(t.offer, 'Inzahlungnahme-Angebot gesendet')
      : t ? html`<p class="small muted">${t.statusLabel}: Für die Inzahlungnahme ist kein Angebot mehr möglich.</p>`
      : l.canJoin && a.mine ? html`<div class="combo-join"><span class="small">Gib zusätzlich ein Ankaufangebot für den Altwagen ab – die Felder erscheinen dann direkt hier.</span><button class="btn btn-primary btn-sm" type="button" data-act="pjoin" data-id="${a.id}">${icon('plus')}Inzahlungnahme mit anbieten</button></div>`
      : html`<p class="small muted">Für die Inzahlungnahme werden keine Angebote mehr angenommen.</p>`}
    ${dealOpen || tradeOpen ? html`<div class="info-box small">${icon('star')}<span>Beide Angebote werden getrennt bewertet und dem Kunden getrennt vorgestellt. Der Kunde sieht, dass sie von dir zusammen kommen, und kann sie unabhängig voneinander annehmen.</span></div>
      <div class="sticky-submit"><button class="btn btn-primary btn-block" type="submit">${icon('send')}${both ? 'Beide Angebote senden' : tradeOpen ? 'Inzahlungnahme-Angebot senden' : 'Angebot senden'}</button></div>` : ''}</div></form>`;
}
CHANGE.pconfig = (el) => { $('#' + (el.dataset.px || '') + 'altBox').classList.toggle('hide', el.value !== 'alternativ'); };
CHANGE.pparsePdf = async (el) => {
  const file = await fileField(el, { max: 8 }); if (!file) return;
  const px = el.dataset.px || '', box = '#' + px + 'sugg';
  render(box, html`<div class="sugg">Wird ausgelesen …</div>`);
  const r = await POST(`/requests/${el.dataset.aid || PA.id}/parse-pdf`, { base64: file.base64 });
  const s = r.suggestions || {}, form = el.form; let n = 0;
  for (const [k, v] of Object.entries(s)) { const i = form.elements[px + k]; if (i && !i.value) { i.value = typeof v === 'number' && !['km_per_year', 'term_months', 'mileage'].includes(k) ? v.toFixed(2).replace('.', ',') : v; n++; } }
  render(box, html`<div class="sugg">${n ? `${plural(n, 'Feld', 'Felder')} aus der PDF übernommen – bitte prüfen.` : r.textFound ? 'Keine Eckdaten erkannt – bitte manuell eintragen.' : 'Die PDF enthält keinen lesbaren Text (z. B. Scan). Bitte Eckdaten manuell eintragen.'}</div>`);
};
const kmTermConfirm = (d, fields) => ({ km_confirmed: d.km_per_year ? String(d.km_per_year) === String(numOf(fields['Kilometer pro Jahr'])) : undefined, term_confirmed: d.term_months ? String(d.term_months) === String(numOf(fields.Laufzeit)) : undefined });
SUBMIT.psendCombo = async (d, f) => {
  const t = PA.trade, dealOpen = PA.status === 'in_bearbeitung' && PA.mine, tradeOpen = !!(t && t.mine && t.status === 'in_bearbeitung');
  const deal = {}, trade = {};
  for (const [k, v] of Object.entries(d)) { if (k.startsWith('t_')) trade[k.slice(2)] = v; else deal[k] = v; }
  const body = {
    deal: dealOpen ? { ...deal, pdf: await fileField(f.elements.pdf, { max: 8 }), expose: f.elements.expose ? await fileField(f.elements.expose, { max: 8 }) : null, ...kmTermConfirm(deal, PA.request.fields || {}) } : null,
    trade: tradeOpen ? { ...trade, pdf: f.elements.t_pdf ? await fileField(f.elements.t_pdf, { max: 8 }) : null } : null };
  const both = body.deal && body.trade;
  if (!(await confirmBox(both ? 'Beide Angebote jetzt senden?' : 'Angebot jetzt senden?', `Nach dem Senden kannst du ${both ? 'die Angebote' : 'das Angebot'} nicht mehr ändern. Die KFL wertet Fahrzeug und Inzahlungnahme getrennt aus.`, both ? 'Beide senden' : 'Angebot senden'))) return;
  await POST(`/requests/${PA.id}/offer-combo`, body);
  toast(both ? 'Beide Angebote gesendet – Daumen sind gedrückt!' : 'Angebot gesendet – Daumen sind gedrückt!'); await pcounts(); preload();
};
SUBMIT.psendOffer = async (d, f) => {
  const pdf = await fileField(f.elements.pdf, { max: 8 }), expose = f.elements.expose ? await fileField(f.elements.expose, { max: 8 }) : null;
  const body = { ...d, pdf, expose, km_confirmed: d.km_per_year ? String(d.km_per_year) === String(numOf(PA.request.fields['Kilometer pro Jahr'])) : undefined, term_confirmed: d.term_months ? String(d.term_months) === String(numOf(PA.request.fields.Laufzeit)) : undefined };
  if (!(await confirmBox('Angebot jetzt senden?', 'Nach dem Senden kannst du das Angebot nicht mehr ändern. Die KFL wertet alle Angebote nach Ablauf der Frist aus.', 'Angebot senden'))) return;
  await POST(`/requests/${PA.id}/offer`, body);
  toast('Angebot gesendet – Daumen sind gedrückt!'); await pcounts(); preload();
};
