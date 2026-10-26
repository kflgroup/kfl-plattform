/* ============================================================
   Buchhaltung: Abrechnungsfälle, Rechnungen (einzeln / monatlich),
   Zahlungen, Zahlungserinnerung und Mahnstufen, Eingangsrechnungen,
   Lieferanten, Zahlungsliste mit SEPA-Export, Tagesabschluss
   ============================================================ */

function orgRecipient(org) {
  return { name: org.billing_name || org.name, street: org.billing_street || org.street, zip: org.billing_zip || org.zip, city: org.billing_city || org.city,
    country: org.country || 'Deutschland', email: org.billing_email || org.email, vat_id: org.vat_id || '', customer_no: 'P-' + String(org.id).padStart(5, '0') };
}
async function nextInvoiceNumber(ctx) {
  const s = await settingsOf(ctx);
  const year = berlinParts(nowMs()).y;
  for (let guard = 0; guard < 50; guard++) {
    const raw = await rawSetting(ctx.db, 'invoice_next');
    const n = Math.max(1, toInt(jparse(raw, s.invoice_next), 1));
    const number = `${s.invoice_prefix}-${year}-${String(n).padStart(5, '0')}`;
    await setRawSetting(ctx.db, 'invoice_next', JSON.stringify(n + 1));
    if (!(await DB.one(ctx.db, 'SELECT id FROM invoices WHERE number = ?', number))) return number;
  }
  throw new HttpError(500, 'Rechnungsnummer konnte nicht vergeben werden.');
}
async function termsFor(ctx, org) {
  const s = await settingsOf(ctx);
  return { days: org && org.payment_terms_days != null ? org.payment_terms_days : s.payment_terms_days, fee: org && org.dunning_fee != null ? org.dunning_fee : s.dunning_fee };
}

async function createInvoice(ctx, { org = null, recipient = null, lines, kind = 'einzel', serviceFrom, serviceTo, intro, note, send = true, sendTo }) {
  const s = await settingsOf(ctx);
  need(lines && lines.length, 400, 'Die Rechnung braucht mindestens eine Position.');
  const rc = recipient || orgRecipient(org);
  need(rc.name, 400, 'Bitte gib einen Rechnungsempfänger an.');
  const norm = lines.map((l) => { const qty = toNum(l.qty, 1) || 1, unit = round2(toNum(l.unit, 0)); return { description: str(l.description, 500), qty, unit, total: round2(qty * unit), billing_item_id: l.billing_item_id || null, request_id: l.request_id || null }; });
  const net = round2(norm.reduce((a, l) => a + l.total, 0));
  const vatRate = s.vat_enabled ? toNum(s.vat_rate, 19) : 0;
  const vat = round2(net * vatRate / 100), gross = round2(net + vat);
  const terms = await termsFor(ctx, org);
  const today = berlinDate(nowMs());
  const number = await nextInvoiceNumber(ctx);
  const t = nowIso();
  const inv = { number, org_id: org ? org.id : null, kind, status: 'offen', issue_date: today, service_from: serviceFrom || today, service_to: serviceTo || serviceFrom || today,
    due_date: kind === 'storno' ? today : addDaysDate(today, terms.days), net, vat_rate: vatRate, vat, gross, paid: 0, fees: 0, dunning_level: 0, recipient: JSON.stringify(rc),
    lines: JSON.stringify(norm), note: note || null, created_by: ctx._staff ? ctx._staff.id : null, created_at: t, updated_at: t };
  const id = await DB.insert(ctx.db, 'invoices', inv);
  inv.id = id; inv.intro = intro;
  const pdf = renderInvoicePdf(s, inv);
  const fileId = await putFile(ctx, { name: `${number}.pdf`, mime: 'application/pdf', bytes: pdf, ownerType: 'invoice', ownerId: id });
  await DB.update(ctx.db, 'invoices', id, { file_id: fileId });
  for (const l of norm) if (l.billing_item_id) await DB.update(ctx.db, 'billing_items', l.billing_item_id, { status: 'abgerechnet', invoice_id: id, updated_at: t });
  for (const rid of uniq(norm.map((l) => l.request_id).filter(Boolean))) { await DB.update(ctx.db, 'requests', rid, { billed: 1 }); await reqEvent(ctx, rid, 'in_rechnung_gestellt', number); }
  await audit(ctx, 'rechnung_erstellt', 'rechnung', number, { brutto: gross, empfaenger: rc.name, art: kind });
  if (send) await sendInvoiceMail(ctx, id, sendTo);
  return id;
}
async function sendInvoiceMail(ctx, id, sendTo) {
  const s = await settingsOf(ctx);
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  const rc = jparse(inv.recipient, {});
  const to = sendTo || rc.email;
  if (!emailOk(to)) { await DB.update(ctx.db, 'invoices', id, { note: (inv.note ? inv.note + ' · ' : '') + 'Keine Rechnungs-E-Mail hinterlegt' }); return { ok: false }; }
  const f = await getFile(ctx, inv.file_id);
  const isStorno = inv.kind === 'storno';
  const r = await sendMail(ctx, { category: 'invoice', to, toName: rc.name, subject: `${isStorno ? 'Stornorechnung' : 'Rechnung'} ${inv.number} der ${s.company_name}`, title: `${isStorno ? 'Stornorechnung' : 'Ihre Rechnung'} ${inv.number}`,
    body: `<p>Sehr geehrte Damen und Herren,</p><p>anbei erhalten Sie ${isStorno ? 'die Stornorechnung' : 'unsere Rechnung'} <strong>${esc(inv.number)}</strong> vom ${esc(fmtDateDE(inv.issue_date))} über <strong>${esc(money(inv.gross))}</strong>${isStorno ? '' : `, zahlbar bis ${esc(fmtDateDE(inv.due_date))}`}.</p>${mailTable(jparse(inv.lines, []).map((l) => [l.description, money(l.total)]))}<p>Mit freundlichen Grüßen<br>${esc(s.company_name)} – Buchhaltung</p>`,
    attachments: f ? [{ name: `${inv.number}.pdf`, base64: b64(f.bytes) }] : [] });
  await DB.update(ctx.db, 'invoices', id, { sent_at: nowIso(), sent_to: to, updated_at: nowIso() });
  return r;
}

// „Rechnung versenden“ für einen Abrechnungsfall
async function billItem(ctx, itemId) {
  const it = await DB.one(ctx.db, 'SELECT * FROM billing_items WHERE id = ?', itemId);
  need(it && it.status === 'offen', 409, 'Dieser Fall wurde bereits abgerechnet oder vorgemerkt.');
  const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', it.org_id);
  if (org.billing_mode === 'monatlich') {
    await DB.update(ctx.db, 'billing_items', it.id, { status: 'gesammelt', updated_at: nowIso() });
    await reqEvent(ctx, it.request_id, 'rechnung_gesammelt', 'Für die Monatsrechnung vorgemerkt');
    await audit(ctx, 'fall_gesammelt', 'abrechnung', it.id, { org: org.name });
    return { mode: 'monatlich' };
  }
  const id = await createInvoice(ctx, { org, lines: [{ description: it.description, qty: 1, unit: it.amount_net, billing_item_id: it.id, request_id: it.request_id }], kind: 'einzel', serviceFrom: berlinDate(msOf(it.created_at)) });
  return { mode: 'einzel', invoiceId: id };
}
async function runMonthlyInvoices(ctx, { force = false } = {}) {
  const p = berlinParts(nowMs());
  const from = `${p.y}-${String(p.m).padStart(2, '0')}-01`, to = `${p.y}-${String(p.m).padStart(2, '0')}-${String(lastDayOfMonth(p.y, p.m)).padStart(2, '0')}`;
  const orgs = await DB.all(ctx.db, "SELECT DISTINCT org_id FROM billing_items WHERE status = 'gesammelt'");
  let n = 0;
  for (const { org_id } of orgs) {
    const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', org_id);
    const items = await DB.all(ctx.db, "SELECT * FROM billing_items WHERE org_id = ? AND status = 'gesammelt' ORDER BY id", org_id);
    if (!items.length) continue;
    await createInvoice(ctx, { org, kind: 'sammel', serviceFrom: from, serviceTo: to, intro: `Monatliche Sammelrechnung für ${String(p.m).padStart(2, '0')}/${p.y}. Wir berechnen Ihnen die erfolgreichen Vermittlungen dieses Monats:`,
      lines: items.map((it) => ({ description: it.description, qty: 1, unit: it.amount_net, billing_item_id: it.id, request_id: it.request_id })) });
    n++;
  }
  return n;
}
// Abrechnungsfall stornieren. Ist der Fall schon abgerechnet, wird die Rechnung storniert (Stornorechnung)
// und weitere Fälle derselben Rechnung werden sofort mit einer korrigierten Rechnung neu abgerechnet.
async function cancelBillingItem(ctx, itemId, reason) {
  const it = await DB.one(ctx.db, 'SELECT * FROM billing_items WHERE id = ?', itemId);
  need(it, 404, 'Fall nicht gefunden.');
  need(it.status !== 'storniert', 409, 'Dieser Fall ist bereits storniert.');
  reason = str(reason, 300); need(reason.length >= 3, 400, 'Bitte gib einen Grund für das Storno an.');
  const who = ctx._staff ? ctx._staff.name : 'System';
  const res = { stornoInvoiceId: null, stornoNumber: null, newInvoiceId: null, newNumber: null, rebilled: 0 };
  if (it.status === 'abgerechnet' && it.invoice_id) {
    const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', it.invoice_id);
    need(inv && inv.status !== 'storniert', 409, 'Die zugehörige Rechnung ist bereits storniert.');
    need(!inv.paid, 409, `Für die Rechnung ${inv.number} sind bereits Zahlungen erfasst. Bitte zuerst die Zahlung klären (z. B. Rückzahlung oder Verrechnung), dann stornieren.`);
    const others = await DB.all(ctx.db, 'SELECT * FROM billing_items WHERE invoice_id = ? AND id != ? ORDER BY id', inv.id, it.id);
    res.stornoInvoiceId = await cancelInvoice(ctx, inv.id, `Storno Abrechnungsfall${it.request_id ? ' zu Anfrage #' + toNumber(it.request_id) : ''}: ${reason}`);
    res.stornoNumber = await DB.val(ctx.db, 'SELECT number FROM invoices WHERE id = ?', res.stornoInvoiceId);
    if (others.length) {
      const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', inv.org_id);
      res.newInvoiceId = await createInvoice(ctx, { org, recipient: jparse(inv.recipient, {}), kind: inv.kind, serviceFrom: inv.service_from, serviceTo: inv.service_to,
        intro: `Korrigierte Rechnung zur stornierten Rechnung ${inv.number}. Wir berechnen Ihnen die folgenden Vermittlungen:`, note: 'Ersetzt ' + inv.number,
        lines: others.map((o) => ({ description: o.description, qty: 1, unit: o.amount_net, billing_item_id: o.id, request_id: o.request_id })) });
      res.newNumber = await DB.val(ctx.db, 'SELECT number FROM invoices WHERE id = ?', res.newInvoiceId);
      res.rebilled = others.length;
    }
  }
  const t = nowIso();
  await DB.update(ctx.db, 'billing_items', it.id, { status: 'storniert', prev_status: it.status, invoice_id: null, cancel_reason: reason, cancelled_at: t, cancelled_by: who, updated_at: t });
  if (it.request_id) await reqEvent(ctx, it.request_id, 'abrechnung_storniert', `${reason}${res.stornoNumber ? ' (Stornorechnung ' + res.stornoNumber + ')' : ''}`);
  await audit(ctx, 'fall_storniert', 'abrechnung', it.id, { grund: reason, anfrage: it.request_id ? toNumber(it.request_id) : null, netto: it.amount_net, stornorechnung: res.stornoNumber, neue_rechnung: res.newNumber });
  return res;
}
// Storno eines Falls aufheben: Fall wird wieder abrechenbar (offen bzw. Sammelablage)
async function reopenBillingItem(ctx, itemId) {
  const it = await DB.one(ctx.db, 'SELECT * FROM billing_items WHERE id = ?', itemId);
  need(it && it.status === 'storniert', 409, 'Nur stornierte Fälle können wieder geöffnet werden.');
  const status = it.prev_status === 'gesammelt' ? 'gesammelt' : 'offen';
  await DB.update(ctx.db, 'billing_items', it.id, { status, prev_status: null, cancel_reason: null, cancelled_at: null, cancelled_by: null, updated_at: nowIso() });
  if (it.request_id) await reqEvent(ctx, it.request_id, 'abrechnung_reaktiviert', '');
  await audit(ctx, 'fall_storno_aufgehoben', 'abrechnung', it.id, { status, frueherer_grund: it.cancel_reason });
  return { status };
}
async function cancelInvoice(ctx, id, reason) {
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  need(inv && inv.status !== 'storniert' && inv.kind !== 'storno', 409, 'Diese Rechnung kann nicht storniert werden.');
  need(!inv.paid, 409, 'Für diese Rechnung sind Zahlungen erfasst. Bitte zuerst die Zahlungen klären.');
  const org = inv.org_id ? await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', inv.org_id) : null;
  const lines = jparse(inv.lines, []).map((l) => ({ description: 'Storno: ' + l.description, qty: l.qty, unit: -l.unit }));
  const sid = await createInvoice(ctx, { org, recipient: jparse(inv.recipient, {}), lines, kind: 'storno', intro: `Hiermit stornieren wir die Rechnung ${inv.number} vom ${fmtDateDE(inv.issue_date)}.${reason ? ' Grund: ' + reason : ''}`, note: 'Storno zu ' + inv.number });
  await DB.update(ctx.db, 'invoices', id, { status: 'storniert', note: (inv.note ? inv.note + ' · ' : '') + 'Storniert' + (reason ? ': ' + reason : ''), updated_at: nowIso() });
  await DB.run(ctx.db, "UPDATE billing_items SET status = 'offen', invoice_id = NULL, updated_at = ? WHERE invoice_id = ?", nowIso(), id);
  await audit(ctx, 'rechnung_storniert', 'rechnung', inv.number, { grund: reason, storno_id: sid });
  return sid;
}
async function addPayment(ctx, id, { amount, date, method, note }) {
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  need(inv && inv.status !== 'storniert', 404, 'Rechnung nicht gefunden.');
  const a = round2(toNum(amount, 0)); need(a !== 0, 400, 'Bitte gib einen Betrag an.');
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : berlinDate(nowMs());
  await DB.insert(ctx.db, 'payments', { invoice_id: id, amount: a, date: d, method: str(method, 40) || 'Überweisung', note: str(note, 300), created_by: ctx._staff ? ctx._staff.id : null, created_at: nowIso() });
  const paid = round2((await DB.val(ctx.db, 'SELECT SUM(amount) FROM payments WHERE invoice_id = ?', id)) || 0);
  const total = round2(inv.gross + inv.fees);
  const status = paid >= total - 0.005 ? 'bezahlt' : paid > 0 ? 'teilbezahlt' : 'offen';
  await DB.update(ctx.db, 'invoices', id, { paid, status, updated_at: nowIso() });
  await audit(ctx, 'zahlung_erfasst', 'rechnung', inv.number, { betrag: a, datum: d, status });
  return { paid, status };
}
async function sendDunning(ctx, id, { auto = false } = {}) {
  const s = await settingsOf(ctx);
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  need(inv && ['offen', 'teilbezahlt'].includes(inv.status) && inv.kind !== 'storno', 409, 'Für diese Rechnung ist keine Mahnung möglich.');
  const level = Math.min(4, (inv.dunning_level || 0) + 1);
  need(inv.dunning_level < 4, 409, 'Die letzte Mahnstufe ist bereits erreicht.');
  const org = inv.org_id ? await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', inv.org_id) : null;
  const terms = await termsFor(ctx, org);
  const fee = level >= 2 ? round2(terms.fee) : 0;
  const due = addDaysDate(berlinDate(nowMs()), toInt(s.dunning_due_days, 7) || 7);
  const fees = round2(inv.fees + fee), open = round2(inv.gross + fees - inv.paid);
  const pdf = renderDunningPdf(s, { ...inv, fees: inv.fees }, level, fee, due, open);
  const fileId = await putFile(ctx, { name: `${inv.number}-${DUNNING_LEVELS[level].replace(/\W+/g, '-')}.pdf`, mime: 'application/pdf', bytes: pdf, ownerType: 'dunning', ownerId: id });
  const rc = jparse(inv.recipient, {});
  const t = nowIso();
  await DB.insert(ctx.db, 'dunnings', { invoice_id: id, level, fee, due_date: due, file_id: fileId, sent_at: t, sent_to: rc.email || null, created_by: ctx._staff ? ctx._staff.id : null, created_at: t });
  await DB.update(ctx.db, 'invoices', id, { dunning_level: level, last_dunning_at: t, fees, updated_at: t });
  if (emailOk(rc.email)) await sendMail(ctx, { category: 'invoice', to: rc.email, toName: rc.name, subject: `${DUNNING_LEVELS[level]} zur Rechnung ${inv.number}`, title: `${DUNNING_LEVELS[level]} zur Rechnung ${inv.number}`,
    body: `<p>Sehr geehrte Damen und Herren,</p><p>${level === 1 ? 'zu unserer Rechnung' : 'trotz unserer Erinnerung ist die Rechnung'} <strong>${esc(inv.number)}</strong> vom ${esc(fmtDateDE(inv.issue_date))} ${level === 1 ? 'konnten wir noch keinen vollständigen Zahlungseingang feststellen' : 'weiterhin offen'}. Bitte überweisen Sie den offenen Betrag von <strong>${esc(money(open))}</strong>${fee ? ` (inkl. Mahngebühr ${esc(money(fee))})` : ''} bis zum <strong>${esc(fmtDateDE(due))}</strong>.</p><p>Sollten Sie bereits gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.</p><p>Mit freundlichen Grüßen<br>${esc(s.company_name)} – Buchhaltung</p>`,
    attachments: [{ name: `${inv.number}-${DUNNING_LEVELS[level]}.pdf`, base64: b64(pdf) }] });
  if (org) await notifyPartner(ctx, { orgId: org.id, roles: ['gf'] }, { kind: 'buchhaltung', title: `${DUNNING_LEVELS[level]}: Rechnung ${inv.number}`, body: `Offener Betrag ${money(open)}, bitte bis ${fmtDateDE(due)} begleichen.`, link: '#/einstellungen/rechnungen' });
  await audit(ctx, auto ? 'mahnung_automatisch' : 'mahnung', 'rechnung', inv.number, { stufe: DUNNING_LEVELS[level], gebuehr: fee });
  return { level, fee, due };
}
async function runDunningJobs(ctx) {
  const s = await settingsOf(ctx);
  if (!s.dunning_auto) return 0;
  const today = berlinDate(nowMs()); let n = 0;
  for (const inv of await DB.all(ctx.db, "SELECT * FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ? AND dunning_level < 4", today)) {
    const days = toInt(s['dunning_days_' + (inv.dunning_level + 1)], 10);
    const ref = inv.dunning_level ? berlinDate(msOf(inv.last_dunning_at)) : inv.due_date;
    if (addDaysDate(ref, days) <= today) { try { await sendDunning(ctx, inv.id, { auto: true }); n++; } catch (e) { console.log('Mahnung', e.message); } }
  }
  return n;
}

// Tagesabschluss: vorgemerkte Zahlungen (Eingangsrechnungen) → Zahlungsliste zur Freigabe durch die Geschäftsführung
async function runDayClose(ctx, { force = false } = {}) {
  const day = berlinDate(nowMs());
  if (!force && await DB.one(ctx.db, 'SELECT id FROM payruns WHERE day = ?', day)) return null;
  const items = await DB.all(ctx.db, "SELECT pi.*, s.name AS supplier, s.iban, s.bic FROM purchase_invoices pi JOIN suppliers s ON s.id = pi.supplier_id WHERE pi.status = 'zur_zahlung' AND (pi.pay_date IS NULL OR pi.pay_date <= ?)", addDaysDate(day, 1));
  if (!items.length) return null;
  const list = items.map((i) => ({ id: i.id, supplier: i.supplier, iban: i.iban, bic: i.bic, amount: round2(i.gross), purpose: `${i.number || 'Rechnung'} ${i.supplier}`, number: i.number, pay_date: i.pay_date }));
  const id = await DB.insert(ctx.db, 'payruns', { day, status: 'offen', total: round2(list.reduce((a, x) => a + x.amount, 0)), items: JSON.stringify(list), closed_at: nowIso(), created_at: nowIso() });
  for (const i of items) await DB.update(ctx.db, 'purchase_invoices', i.id, { status: 'in_zahlungsliste', updated_at: nowIso() });
  await notifyStaff(ctx, { perm: 'acc_release' }, { kind: 'buchhaltung', title: `Zahlungsliste ${fmtDateDE(day)} zur Freigabe`, body: `${list.length} Zahlung(en), ${money(list.reduce((a, x) => a + x.amount, 0))}`, link: '#/buchhaltung/zahlungen' });
  await audit(ctx, 'tagesabschluss', 'zahlungsliste', id, { anzahl: list.length });
  return id;
}
async function releasePayrun(ctx, id, execDate) {
  const s = await settingsOf(ctx);
  const pr = await DB.one(ctx.db, 'SELECT * FROM payruns WHERE id = ?', id);
  need(pr && pr.status === 'offen', 409, 'Diese Zahlungsliste ist bereits freigegeben.');
  need(ibanValid(s.company_iban), 400, 'Bitte hinterlege zuerst eine gültige eigene IBAN in den Einstellungen (Firma).');
  const items = jparse(pr.items, []);
  const bad = items.filter((i) => !ibanValid(i.iban));
  need(!bad.length, 400, 'Ungültige IBAN bei: ' + bad.map((b) => b.supplier).join(', '));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(execDate || '') ? execDate : addDaysDate(pr.day, 1);
  const xml = buildSepaXml(s, { msgId: `KFL-${pr.day.replace(/-/g, '')}-${id}`, execDate: date, items: items.map((i) => ({ name: i.supplier, iban: i.iban, bic: i.bic, amount: i.amount, purpose: i.purpose, endToEnd: `KFL-PI-${i.id}` })) });
  const fileId = await putFile(ctx, { name: `SEPA-${pr.day}-${id}.xml`, mime: 'application/xml', bytes: enc.encode(xml), ownerType: 'payrun', ownerId: id });
  await DB.update(ctx.db, 'payruns', id, { status: 'freigegeben', released_by: ctx._staff.id, released_at: nowIso(), file_id: fileId });
  for (const i of items) await DB.update(ctx.db, 'purchase_invoices', i.id, { status: 'freigegeben', updated_at: nowIso() });
  await audit(ctx, 'zahlungsliste_freigegeben', 'zahlungsliste', id, { summe: pr.total, ausfuehrung: date });
  return fileId;
}
