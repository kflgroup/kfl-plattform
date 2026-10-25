/* ===== Anfragen, Angebot abgeben ===== */
const PTABS = () => [['neu', 'Neu', '#/anfragen?tab=neu'], ['meine', 'In Bearbeitung', '#/anfragen?tab=meine'], ['beantwortet', 'Beantwortet', '#/anfragen?tab=beantwortet'], ['gewonnen', 'Gewonnen', '#/anfragen?tab=gewonnen'], ['archiv', 'Archiv', '#/anfragen?tab=archiv'], isVL() && ['team', 'Team', '#/anfragen?tab=team']];
const TAB_EMPTY = { neu: ['Keine neuen Anfragen', 'Neue Anfragen aus deiner Region erscheinen hier – du bekommst zusätzlich eine E-Mail.'], meine: ['Nichts in Bearbeitung', 'Übernimm eine neue Anfrage und gib dein Angebot ab.'], beantwortet: ['Noch keine Angebote offen', ''], gewonnen: ['Noch kein Deal gewonnen', 'Gute Angebote zahlen sich aus – bleib dran!'], archiv: ['Archiv ist leer', ''], team: ['Keine Anfragen im Team', ''] };
async function pRequests() {
  const V = ppage('anfragen');
  const tab = hashQuery().tab || 'neu';
  const d = await GET('/requests', { tab }); if (!V.alive()) return;
  V.show(html`${phead('Anfragen', 'Vor der Übernahme siehst du nur die Eckdaten. Nach der Übernahme gehört die Anfrage dir – dein Team sieht sie nicht mehr.')}${ptabs(PTABS(), tab)}
    <div class="mt">${d.items.length ? d.items.map((a) => rqCard(a, 'list')) : html`<section class="block">${empty(...TAB_EMPTY[tab])}</section>`}</div>`);
}

let PA = null;
const numOf = (v) => { const m = String(v || '').replace(/\./g, '').match(/\d+/g); return m ? +m[m.length - 1] : ''; };
async function pRequest(id) {
  const V = ppage('anfragen');
  const d = await GET('/requests/' + id); if (!V.alive()) return;
  const a = d.item; PA = a; const r = a.request;
  const back = ['#/anfragen?tab=' + ({ neu: 'neu', in_bearbeitung: 'meine', versendet: 'beantwortet', vorgestellt: 'beantwortet', gewonnen: 'gewonnen', nicht_erreicht: 'gewonnen' }[a.status] || 'archiv'), 'Anfragen'];
  if (a.level === 'teaser') {
    return V.show(html`${phead(`Anfrage #${r.number}`, r.typeLabel, badge(a.statusLabel, a.tone), back)}<section class="block teaser">
      ${zTag(r.zustand)}<div class="big">${r.zustand || 'Fahrzeug'}</div>
      <div class="facts"><div><b>${r.brand || '–'}</b><span>Marke</span></div><div><b>PLZ ${r.plz || '–'}</b><span>Wohnort des Kunden</span></div><div><b>${a.distance_km != null ? fNum(a.distance_km) + ' km' : '–'}</b><span>Luftlinie zu dir</span></div><div><b>${fDT(a.deadline_at)}</b><span>Angebotsfrist</span></div></div>
      ${clock(a.deadline_at)}
      <p class="muted small">Nach der Übernahme siehst du alle Details der Anfrage. Du hast dann ${4} Stunden für dein Angebot – sonst wird sie wieder für dein Team freigegeben. Kontaktdaten des Kunden bekommst du, sobald er dein Angebot annimmt.</p>
      <button class="btn btn-primary" data-act="ptake" data-id="${a.id}">${icon('bolt')}Anfrage übernehmen</button></section>`);
  }
  if (a.level === 'summary') {
    return V.show(html`${phead(`Anfrage #${r.number}`, `${r.zustand || ''} ${r.brand || ''} · PLZ ${r.plz}`, badge(a.statusLabel, a.tone), back)}<section class="block"><div class="block-body">
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
      ${a.contact ? html`<section class="contact-card stack-s"><h3>Kontaktdaten des Kunden</h3>${kv([['Name', a.contact.name], ['Telefon', a.contact.phone], ['E-Mail', a.contact.email], ['Anschrift', [a.contact.street, [a.contact.zip, a.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Bevorzugt', a.contact.contactWay]])}
        <div class="row">${a.contact.phone ? html`<a class="btn btn-ok" href="tel:${a.contact.phone.replace(/[^+\d]/g, '')}">${icon('phone')}Anrufen</a>` : ''}${a.contact.email ? html`<a class="btn" href="mailto:${a.contact.email}?subject=${encodeURIComponent('Ihr Angebot über KFL – Anfrage #' + r.number)}">${icon('mail')}E-Mail</a>` : ''}</div>
        ${['gewonnen', 'nicht_erreicht'].includes(a.status) ? html`<div class="row mt"><button class="btn btn-ok btn-sm" data-act="pcontact" data-s="kontaktiert">${icon('check')}Kunde erfolgreich kontaktiert</button><button class="btn btn-sm" data-act="pcontact" data-s="nicht_erreicht">Kunde nicht erreicht</button></div>` : ''}
        <button class="btn btn-sm btn-ghost" data-act="pcontract">${icon('file')}Vertragsunterlagen vorbereiten</button></section>` : ''}
      <section class="block"><div class="block-head"><h2>Anfrage des Kunden</h2><span class="small muted">${fDT(r.created_at)}</span></div><div class="block-body">${kv(Object.entries(f).map(([k, v]) => [k === 'body' ? 'Sonstiges' : k, html`<span class="pre">${v}</span>`]))}
        <p class="tiny muted mt">Name, E-Mail, Telefon und Anschrift des Kunden siehst du nach seiner Zusage.</p></div></section>
      ${a.events && a.events.length ? html`<section class="block"><div class="block-head"><h2>Verlauf</h2></div><div class="block-body"><ul class="timeline">${a.events.map((e) => html`<li class="${/^KFL/.test(e.text || '') ? 'kfl' : ''}"><div><div class="tl-meta">${e.actor_name || 'KFL'} · ${fDT(e.created_at)}</div><div>${e.text}</div></div></li>`)}</ul></div></section>` : ''}
    </div><div class="stack">${a.status === 'in_bearbeitung' && a.mine ? offerForm(a) : offerView}</div></div>`);
}
ACT.ptake = async (b) => { await POST(`/requests/${b.dataset.id}/take`); toast('Übernommen – jetzt Angebot erstellen.'); await pcounts(); plast = null; preload(); };
ACT.prelease = async (b) => { if (!(await confirmBox('Anfrage wieder öffnen?', 'Die Anfrage wird wieder für deine ganze Organisation sichtbar. Das wird vertraulich vermerkt.', 'Wieder öffnen'))) return; await POST(`/requests/${b.dataset.id}/release`); toast('Wieder für dein Team geöffnet.'); location.hash = '#/anfragen'; };
ACT.pcontact = async (b) => {
  const s = b.dataset.s;
  const d = await ask({ title: s === 'kontaktiert' ? 'Kunde erfolgreich kontaktiert' : 'Kunde nicht erreicht', text: s === 'kontaktiert' ? 'Super! Kurze Notiz zum Stand (optional).' : 'Die KFL fragt beim Kunden nach, ob du dich gemeldet hast. Wie oft und wie hast du es versucht?', ok: 'Speichern', fields: field('Notiz', area('note', '', { rows: 3, req: s !== 'kontaktiert' })) });
  if (!d) return; await POST(`/requests/${PA.id}/contact`, { status: s, note: d.note }); toast('Gespeichert.'); preload();
};
ACT.pcontract = () => {
  const a = PA, r = a.request, o = a.offer ? a.offer.data : {};
  modal({ title: 'Vertragsunterlagen vorbereiten', wide: true, cls: 'printable', body: html`<p class="small muted">Zusammenfassung für deinen Kauf-, Leasing- oder Finanzierungsvertrag. Übernimm die Daten in dein Vertragssystem oder speichere die Seite als PDF.</p>
    <div class="grid-2 mt"><div><h3>Kunde</h3>${kv([['Name', a.contact.name], ['Anschrift', [a.contact.street, [a.contact.zip, a.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Telefon', a.contact.phone], ['E-Mail', a.contact.email], ['Kundenart', (r.fields || {}).Kundenart]])}</div>
      <div><h3>Fahrzeug</h3>${kv([['Fahrzeug', r.vehicle], ['Zustand', r.zustand], ['Wunsch', r.summary], ['KFL-Anfrage', '#' + r.number]])}</div></div>
    <h3 class="mt-l">Angebot</h3>${kv(offerRows(o))}`, foot: html`<button class="btn btn-ghost" data-close>Schließen</button><button class="btn btn-dark" data-act="pprint">${icon('download')}Drucken / als PDF</button>` });
};
ACT.pprint = () => { document.body.classList.add('printing'); window.print(); setTimeout(() => document.body.classList.remove('printing'), 500); };

function offerForm(a) {
  const r = a.request, f = r.fields || {}, kind = a.kindHint;
  const used = /gebraucht/i.test(r.zustand || '');
  const service = !!f['Servicepaket Wartung & Inspektion'], kasko = !!f['Servicepaket Versicherung / Kasko'];
  const km = numOf(f['Kilometer pro Jahr']), term = numOf(f.Laufzeit);
  const vat = kind === 'finanzierung' ? 'brutto' : a.b2b ? 'netto' : 'brutto';
  const money = (name, label, req, hint) => field(`${label}${req ? ' *' : ''} (${vat})`, inp(name, '', { req, ph: '0,00', attrs: 'inputmode="decimal"' }), hint);
  return html`<form class="block offer-form" data-submit="psendOffer"><div class="block-head"><h2>Angebot erstellen</h2><span class="kind-pill">${OFFER_KIND[kind]}</span></div><div class="block-body stack">
    <div class="pdf-drop"><b>Angebot als PDF hochladen</b><span class="small muted">Optional. Wir lesen die Eckdaten aus und tragen sie unten ein – bitte prüfen. Der Kunde sieht das Angebot neutral ohne deine Firmendaten.</span>
      <input type="file" name="pdf" accept="application/pdf" data-change="pparsePdf"><div id="sugg"></div></div>
    ${kind !== 'ankauf' ? html`<div class="field"><span class="field-label">Konfiguration *</span><div class="seg"><label><input type="radio" name="config" value="gleich" checked data-change="pconfig"><span>Wie angefragt</span></label><label><input type="radio" name="config" value="alternativ" data-change="pconfig"><span>Alternative</span></label></div></div>
      <div id="altBox" class="stack hide">${field('Herstellercode / Konfigurationscode', inp('herstellercode', '', { ph: 'z. B. AUDI-A4-XYZ123' }))}${field('Exposé (PDF)', raw('<input type="file" name="expose" accept="application/pdf">'))}</div>` : ''}
    <div class="field"><span class="field-label">Entspricht die Ausstattung der Anfrage? *</span><div class="seg"><label><input type="radio" name="equipment_match" value="ja" required><span>Ja</span></label><label><input type="radio" name="equipment_match" value="nein"><span>Nein</span></label></div></div>
    <div class="grid-2">
      ${kind === 'kauf' ? money('price', 'Kaufpreis', true) : ''}
      ${kind === 'leasing' ? html`${money('monthly_rate', 'Monatliche Rate', true, 'ohne Service- und Versicherungskosten')}${field('Kilometer pro Jahr *', inp('km_per_year', km, { req: true, attrs: 'inputmode="numeric"' }), km ? `Kundenwunsch: ${fNum(km)} km – bestätigen oder Alternative eintragen` : '')}
        ${field('Laufzeit in Monaten *', inp('term_months', term, { req: true, attrs: 'inputmode="numeric"' }), term ? `Kundenwunsch: ${term} Monate` : '')}${money('down_payment', 'Sonderzahlung', false)}` : ''}
      ${kind === 'finanzierung' ? html`${money('price', 'Kaufpreis', true)}${money('monthly_rate', 'Monatliche Rate', true)}${money('final_rate', 'Schlussrate', true)}${field('Laufzeit in Monaten *', inp('term_months', term, { req: true, attrs: 'inputmode="numeric"' }))}${money('down_payment', 'Anzahlung', false)}` : ''}
      ${kind === 'ankauf' ? html`${money('buy_price', 'Dein Ankaufpreis', true)}${field('Abholung / Übergabe', inp('pickup', '', { ph: 'z. B. Abholung beim Kunden möglich' }))}` : ''}
      ${kind !== 'ankauf' ? money('transfer_cost', 'Überführung und Zulassung', false) : ''}
      ${service ? money('service_cost', 'Servicepaket Wartung & Inspektion (mtl.)', true, 'Vom Kunden gewünscht') : ''}${kasko ? money('insurance_cost', 'Versicherung / Kasko (mtl.)', true, 'Vom Kunden gewünscht') : ''}
      ${field('Lieferzeit / Verfügbarkeit', inp('delivery', '', { ph: 'z. B. sofort, 8 Wochen' }))}${field('Angebot gültig bis', inp('valid_until', addDays(todayISO(), 7), { type: 'date' }))}</div>
    ${used || kind === 'ankauf' ? html`<fieldset><legend>Angaben zum Fahrzeug</legend><div class="grid-2">${field('Erstzulassung', inp('first_registration', '', { ph: 'MM/JJJJ' }))}${field('Kilometerstand', inp('mileage', '', { attrs: 'inputmode="numeric"' }))}
      ${field('UPE (Neupreis, falls bekannt)', inp('upe', '', { attrs: 'inputmode="decimal"' }))}${field('Vorbesitzer', inp('owners', '', { attrs: 'inputmode="numeric"' }))}
      <div class="field"><span class="field-label">Unfallfrei</span><div class="seg"><label><input type="radio" name="accident_free" value="ja"><span>Ja</span></label><label><input type="radio" name="accident_free" value="nein"><span>Nein</span></label></div></div></div></fieldset>` : ''}
    ${field('Anmerkungen für den Kunden', area('notes', '', { rows: 3, ph: 'Was macht dein Angebot besonders? z. B. Wartung inklusive, Winterräder' }))}
    <p class="tiny muted">Preise ${vat === 'netto' ? 'netto (gewerblicher Kunde)' : 'brutto'}. Mit * markierte Felder sind Pflicht.</p>
    <div class="sticky-submit"><button class="btn btn-primary btn-block" type="submit">${icon('send')}Angebot senden</button></div></div></form>`;
}
CHANGE.pconfig = (el) => { $('#altBox').classList.toggle('hide', el.value !== 'alternativ'); };
CHANGE.pparsePdf = async (el) => {
  const file = await fileField(el, { max: 8 }); if (!file) return;
  render('#sugg', html`<div class="sugg">Wird ausgelesen …</div>`);
  const r = await POST(`/requests/${PA.id}/parse-pdf`, { base64: file.base64 });
  const s = r.suggestions || {}, form = el.form; let n = 0;
  for (const [k, v] of Object.entries(s)) { const i = form.elements[k]; if (i && !i.value) { i.value = typeof v === 'number' && !['km_per_year', 'term_months', 'mileage'].includes(k) ? v.toFixed(2).replace('.', ',') : v; n++; } }
  render('#sugg', html`<div class="sugg">${n ? `${plural(n, 'Feld', 'Felder')} aus der PDF übernommen – bitte prüfen.` : r.textFound ? 'Keine Eckdaten erkannt – bitte manuell eintragen.' : 'Die PDF enthält keinen lesbaren Text (z. B. Scan). Bitte Eckdaten manuell eintragen.'}</div>`);
};
SUBMIT.psendOffer = async (d, f) => {
  const pdf = await fileField(f.elements.pdf, { max: 8 }), expose = f.elements.expose ? await fileField(f.elements.expose, { max: 8 }) : null;
  const body = { ...d, pdf, expose, km_confirmed: d.km_per_year ? String(d.km_per_year) === String(numOf(PA.request.fields['Kilometer pro Jahr'])) : undefined, term_confirmed: d.term_months ? String(d.term_months) === String(numOf(PA.request.fields.Laufzeit)) : undefined };
  if (!(await confirmBox('Angebot jetzt senden?', 'Nach dem Senden kannst du das Angebot nicht mehr ändern. Die KFL wertet alle Angebote nach Ablauf der Frist aus.', 'Angebot senden'))) return;
  await POST(`/requests/${PA.id}/offer`, body);
  toast('Angebot gesendet – Daumen sind gedrückt!'); await pcounts(); preload();
};
