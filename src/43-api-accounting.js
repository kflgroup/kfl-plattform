/* ============================================================
   Schnittstelle Buchhaltung (/api/acc/…)
   ============================================================ */

async function handleAccounting(ctx, u, path, method, body, q, url) {
  const db = ctx.db; let m;
  requirePerm(u, 'acc_view');
  const manage = () => requirePerm(u, 'acc_manage');

  if (path === '/overview' && method === 'GET') {
    const today = berlinDate(nowMs());
    const open = await DB.one(db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno'");
    const overdue = await DB.one(db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ?", today);
    const cases = await DB.one(db, "SELECT SUM(status = 'offen') AS open, SUM(status = 'gesammelt') AS collected, SUM(status = 'storniert') AS cancelled, COALESCE(SUM(CASE WHEN status = 'gesammelt' THEN amount_net END),0) AS collected_sum FROM billing_items");
    const pi = await DB.one(db, "SELECT SUM(status = 'offen') AS open, SUM(status = 'zur_zahlung') AS queued, SUM(status IN ('in_zahlungsliste')) AS listed, COALESCE(SUM(CASE WHEN status IN ('offen','zur_zahlung','in_zahlungsliste','freigegeben') THEN gross END),0) AS due FROM purchase_invoices");
    const pm = berlinParts(nowMs());
    const mFrom = `${pm.y}-${String(pm.m).padStart(2, '0')}-01`;
    const month = await DB.one(db, "SELECT COALESCE(SUM(net),0) AS net, COUNT(*) AS n FROM invoices WHERE status != 'storniert' AND kind != 'storno' AND issue_date >= ?", mFrom);
    const paidMonth = await DB.val(db, 'SELECT COALESCE(SUM(amount),0) FROM payments WHERE date >= ?', mFrom);
    const payruns = await DB.val(db, "SELECT COUNT(*) FROM payruns WHERE status = 'offen'");
    return out({ ok: true, open: { n: open.n, sum: round2(open.sum) }, overdue: { n: overdue.n, sum: round2(overdue.sum) }, cases: { open: cases.open || 0, collected: cases.collected || 0, cancelled: cases.cancelled || 0, collected_sum: round2(cases.collected_sum) },
      purchase: { open: pi.open || 0, queued: pi.queued || 0, listed: pi.listed || 0, due: round2(pi.due) }, month: { net: round2(month.net), n: month.n, paid: round2(paidMonth) }, payruns });
  }

  /* ---------- Abrechnungsfälle (gewonnene Anfragen) ---------- */
  if (path === '/items' && method === 'GET') {
    const st = q.status || 'aktiv';
    const where = st === 'alle' ? '1=1' : st === 'aktiv' ? "b.status IN ('offen','gesammelt','abgerechnet')" : 'b.status = ?';
    const rows = await DB.all(db, `SELECT b.*, o.name AS org_name, o.billing_mode, o.billing_email, r.vehicle, r.customer_name, r.email AS customer_email, r.phone AS customer_phone, r.plz, r.type, r.created_at AS request_date,
        i.number AS invoice_number, i.status AS invoice_status, i.kind AS invoice_kind, i.paid AS invoice_paid, i.gross AS invoice_gross, (SELECT COUNT(*) FROM billing_items x WHERE x.invoice_id = b.invoice_id) AS invoice_cases, (SELECT COUNT(*) FROM acc_notes an WHERE an.item_id = b.id) + (SELECT COUNT(*) FROM notes rn WHERE rn.request_id = b.request_id AND rn.acc_relevant = 1) AS notes_n, (SELECT COUNT(*) FROM notes rn WHERE rn.request_id = b.request_id AND rn.acc_relevant = 1) AS pinned_n
      FROM billing_items b JOIN orgs o ON o.id = b.org_id LEFT JOIN requests r ON r.id = b.request_id LEFT JOIN invoices i ON i.id = b.invoice_id
      WHERE ${where} ORDER BY CASE b.status WHEN 'offen' THEN 0 WHEN 'gesammelt' THEN 1 WHEN 'abgerechnet' THEN 2 ELSE 3 END, b.id DESC LIMIT 500`, ...(['alle', 'aktiv'].includes(st) ? [] : [st]));
    const counts = Object.fromEntries((await DB.all(db, 'SELECT status, COUNT(*) AS n FROM billing_items GROUP BY status')).map((x) => [x.status, x.n]));
    counts.aktiv = (counts.offen || 0) + (counts.gesammelt || 0) + (counts.abgerechnet || 0);
    counts.alle = counts.aktiv + (counts.storniert || 0);
    return out({ ok: true, counts, items: rows.map((r) => ({ ...r, number: r.request_id ? toNumber(r.request_id) : null })) });
  }
  if ((m = path.match(/^\/items\/(\d+)$/)) && method === 'GET') {
    const it = await DB.one(db, 'SELECT * FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
    const req = it.request_id ? await DB.one(db, 'SELECT * FROM requests WHERE id = ?', it.request_id) : null;
    const org = await DB.one(db, 'SELECT * FROM orgs WHERE id = ?', it.org_id);
    const offer = it.assignment_id ? await DB.one(db, 'SELECT o.*, pu.name AS user_name FROM offers o LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.assignment_id = ?', it.assignment_id) : null;
    const d = req ? jparse(req.data, {}) : {};
    const notes = await accNotesFor(ctx, { itemIds: [it.id], requestIds: [it.request_id] });
    const invRow = it.invoice_id ? await DB.one(db, 'SELECT number, paid, (SELECT COUNT(*) FROM billing_items x WHERE x.invoice_id = invoices.id) AS cases FROM invoices WHERE id = ?', it.invoice_id) : null;
    return out({ ok: true, item: { ...it, number: it.request_id ? toNumber(it.request_id) : null }, notes, invoiceNumber: invRow ? invRow.number : null, invoicePaid: invRow ? invRow.paid : 0, invoiceCases: invRow ? invRow.cases : 0, request: req ? { number: toNumber(req.id), type: req.type, vehicle: req.vehicle, summary: req.summary, created_at: req.created_at, status: req.status, fields: Object.fromEntries(Object.entries(d).filter(([k]) => !/^(_|form$|form_type$|utf8$)/.test(k))) } : null,
      customer: req ? customerContact(req) : null, org: { ...orgRecipient(org), id: org.id, name: org.name, billing_mode: org.billing_mode, payment_terms_days: org.payment_terms_days, dunning_fee_1: org.dunning_fee_1, dunning_fee_2: org.dunning_fee_2 }, offer: offer ? { ...offer, data: jparse(offer.data, {}) } : null });
  }
  if ((m = path.match(/^\/items\/(\d+)\/notes$/)) && method === 'POST') {
    const it = await DB.one(db, 'SELECT id FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
    return out({ ok: true, id: await addAccNote(ctx, { itemId: it.id, text: body.text }) });
  }
  if ((m = path.match(/^\/items\/(\d+)\/(cancel|reopen)$/)) && method === 'POST') {
    requirePerm(u, 'acc_cancel');
    if (m[2] === 'cancel' && body.mode === 'rechnung') {
      // Nur die Rechnung stornieren: Fall (und weitere Fälle der Rechnung) werden wieder abrechenbar
      const it = await DB.one(db, 'SELECT * FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
      need(it.status === 'abgerechnet' && it.invoice_id, 409, 'Für diesen Fall gibt es keine Rechnung zum Stornieren.');
      const reason = str(body.reason, 300); need(reason.length >= 3, 400, 'Bitte gib einen Grund für das Storno an.');
      const sid = await cancelInvoice(ctx, it.invoice_id, reason);
      return out({ ok: true, mode: 'rechnung', stornoInvoiceId: sid, stornoNumber: await DB.val(db, 'SELECT number FROM invoices WHERE id = ?', sid), status: await DB.val(db, 'SELECT status FROM billing_items WHERE id = ?', it.id) });
    }
    if (m[2] === 'cancel') return out({ ok: true, ...(await cancelBillingItem(ctx, +m[1], body.reason)) });
    return out({ ok: true, ...(await reopenBillingItem(ctx, +m[1])) });
  }
  if ((m = path.match(/^\/items\/(\d+)\/(bill|note|amount)$/)) && method === 'POST') {
    manage();
    const it = await DB.one(db, 'SELECT * FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
    if (m[2] === 'note') { await DB.update(db, 'billing_items', it.id, { note: str(body.text, 2000), updated_at: nowIso() }); await audit(ctx, 'fall_notiz', 'abrechnung', it.id, null); return out({ ok: true }); }
    if (m[2] === 'amount') { need(it.status === 'offen' || it.status === 'gesammelt', 409, 'Bereits abgerechnet.'); const a = toNum(body.amount); need(a !== null && a >= 0, 400, 'Ungültiger Betrag.'); await DB.update(db, 'billing_items', it.id, { amount_net: round2(a), description: str(body.description, 500) || it.description, updated_at: nowIso() }); await audit(ctx, 'fall_betrag', 'abrechnung', it.id, { netto: a }); return out({ ok: true }); }
    const r = await billItem(ctx, it.id); await audit(ctx, 'rechnung_versenden', 'abrechnung', it.id, r);
    if (r.invoiceId) { const iv = await DB.one(db, 'SELECT mail_status, mail_error, sent_to FROM invoices WHERE id = ?', r.invoiceId); r.mail = iv.mail_status; r.mailError = iv.mail_error; r.sentTo = iv.sent_to; }
    return out({ ok: true, ...r });
  }

  /* ---------- Rechnungen ---------- */
  if (path === '/invoices' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (q.status) { where.push('i.status = ?'); args.push(q.status); }
    if (q.overdue === '1') { where.push("i.status IN ('offen','teilbezahlt') AND i.due_date < ?"); args.push(berlinDate(nowMs())); }
    if (q.dunned === '1') where.push('i.dunning_level > 0');
    if (q.org) { where.push('i.org_id = ?'); args.push(toInt(q.org)); }
    if (q.kind) { where.push('i.kind = ?'); args.push(q.kind); }
    if (q.from) { where.push('i.issue_date >= ?'); args.push(q.from); }
    if (q.to) { where.push('i.issue_date <= ?'); args.push(q.to); }
    if (q.q) { const like = '%' + q.q + '%'; where.push("(i.number LIKE ? OR i.recipient LIKE ? OR i.lines LIKE ?)"); args.push(like, like, like); }
    const sort = { number: 'i.number', date: 'i.issue_date', due: 'i.due_date', recipient: "json_extract(i.recipient,'$.name')", gross: 'i.gross', status: 'i.status' }[q.sort] || 'i.id';
    const rows = await DB.all(db, `SELECT i.id, i.number, i.org_id, i.kind, i.status, i.issue_date, i.due_date, i.net, i.vat, i.gross, i.paid, i.fees, i.dunning_level, i.last_dunning_at, i.sent_at, i.sent_to, i.mail_status, i.mail_error, i.recipient, (SELECT COUNT(*) FROM acc_notes an WHERE an.invoice_id = i.id OR an.item_id IN (SELECT id FROM billing_items WHERE invoice_id = i.id)) + (SELECT COUNT(*) FROM notes rn WHERE rn.acc_relevant = 1 AND rn.request_id IN (SELECT request_id FROM billing_items WHERE invoice_id = i.id)) AS notes_n FROM invoices i WHERE ${where.join(' AND ')} ORDER BY ${sort} ${q.dir === 'asc' ? 'ASC' : 'DESC'}, i.id DESC LIMIT 1000`, ...args);
    return out({ ok: true, invoices: rows.map((r) => ({ ...r, recipient: jparse(r.recipient, {}), open: round2(r.gross + r.fees - r.paid), overdue: ['offen', 'teilbezahlt'].includes(r.status) && r.due_date < berlinDate(nowMs()) })) });
  }
  if (path === '/invoices' && method === 'POST') {
    manage();
    const org = body.org_id ? await DB.one(db, 'SELECT * FROM orgs WHERE id = ?', toInt(body.org_id)) : null;
    const rc = org ? orgRecipient(org) : { name: str(body.recipient?.name, 160), street: str(body.recipient?.street, 160), zip: str(body.recipient?.zip, 10), city: str(body.recipient?.city, 80), email: str(body.recipient?.email, 200), vat_id: str(body.recipient?.vat_id, 40) };
    const id = await createInvoice(ctx, { org, recipient: rc, lines: body.lines || [], kind: 'manuell', serviceFrom: body.service_from, serviceTo: body.service_to, intro: str(body.intro, 1000) || undefined, send: body.send !== false });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/invoices\/(\d+)(?:\/(pdf|payment|dunning|cancel|resend|notes|dunning-pdf\/\d+))?$/))) {
    const inv = await DB.one(db, 'SELECT * FROM invoices WHERE id = ?', +m[1]); need(inv, 404, 'Rechnung nicht gefunden.');
    const sub = m[2] || '';
    if (!sub && method === 'GET') {
      const lines = jparse(inv.lines, []);
      const itemIds = [...lines.map((l) => l.billing_item_id), ...(await DB.all(db, 'SELECT id FROM billing_items WHERE invoice_id = ?', inv.id)).map((x) => x.id)];
      const notes = await accNotesFor(ctx, { invoiceId: inv.id, itemIds, requestIds: lines.map((l) => l.request_id) });
      return out({ ok: true, notes, invoice: { ...inv, recipient: jparse(inv.recipient, {}), lines, open: round2(inv.gross + inv.fees - inv.paid), mail_to: await invoiceMailTo(ctx, inv) },
        payments: await DB.all(db, 'SELECT p.*, u.name AS author FROM payments p LEFT JOIN users u ON u.id = p.created_by WHERE p.invoice_id = ? ORDER BY p.id', inv.id),
        dunnings: await DB.all(db, 'SELECT d.*, u.name AS author FROM dunnings d LEFT JOIN users u ON u.id = d.created_by WHERE d.invoice_id = ? ORDER BY d.id', inv.id) });
    }
    if (sub === 'pdf' && method === 'GET') return fileResponse(await getFile(ctx, inv.file_id), q.download === '1');
    if (sub.startsWith('dunning-pdf/') && method === 'GET') { const d = await DB.one(db, 'SELECT * FROM dunnings WHERE id = ? AND invoice_id = ?', +sub.split('/')[1], inv.id); need(d, 404, 'Nicht gefunden.'); return fileResponse(await getFile(ctx, d.file_id), q.download === '1'); }
    if (sub === 'payment' && method === 'POST') { manage(); return out({ ok: true, ...(await addPayment(ctx, inv.id, body)) }); }
    if (sub === 'dunning' && method === 'POST') { manage(); return out({ ok: true, ...(await sendDunning(ctx, inv.id)) }); }
    if (sub === 'notes' && method === 'POST') return out({ ok: true, id: await addAccNote(ctx, { invoiceId: inv.id, text: body.text }) });
    if (sub === 'cancel' && method === 'POST') { requirePerm(u, 'acc_cancel'); need(str(body.reason, 300).length >= 3, 400, 'Bitte gib einen Grund für das Storno an.'); return out({ ok: true, id: await cancelInvoice(ctx, inv.id, str(body.reason, 300)) }); }
    if (sub === 'resend' && method === 'POST') { manage(); const r = await sendInvoiceMail(ctx, inv.id, emailOk(body.email) ? body.email : null); await audit(ctx, 'rechnung_erneut_gesendet', 'rechnung', inv.number, { an: body.email || null }); return out({ ok: true, mail: r && r.status, error: r && r.error, to: emailOk(body.email) ? body.email : await invoiceMailTo(ctx, inv) }); }
  }
  if (path === '/monthly-run' && method === 'POST') { manage(); const r = await runMonthlyInvoices(ctx, { max: 1 }); if (r.count) await audit(ctx, 'sammelrechnungen_manuell', 'buchhaltung', null, { anzahl: r.count }); return out({ ok: true, count: r.count, pending: r.pending }); }

  /* ---------- Lieferanten & Eingangsrechnungen ---------- */
  if (path === '/suppliers' && method === 'GET') return out({ ok: true, suppliers: await DB.all(db, 'SELECT s.*, (SELECT COUNT(*) FROM purchase_invoices p WHERE p.supplier_id = s.id) AS invoices FROM suppliers s ORDER BY s.active DESC, s.name') });
  if ((path === '/suppliers' && method === 'POST') || ((m = path.match(/^\/suppliers\/(\d+)$/)) && method === 'PATCH')) {
    manage();
    const o = {};
    for (const k of ['name', 'street', 'zip', 'city', 'country', 'email', 'phone', 'bic', 'vat_id', 'customer_no', 'note']) if (body[k] !== undefined) o[k] = str(body[k], k === 'note' ? 1000 : 160);
    if (body.iban !== undefined) { const ib = ibanClean(body.iban); need(!ib || ibanValid(ib), 400, 'Die IBAN ist ungültig.'); o.iban = ib; }
    if (body.active !== undefined) o.active = body.active ? 1 : 0;
    if (method === 'POST') { need(o.name, 400, 'Bitte einen Namen angeben.'); const id = await DB.insert(db, 'suppliers', { ...o, active: 1, created_at: nowIso() }); await audit(ctx, 'lieferant_angelegt', 'lieferant', id, { name: o.name }); return out({ ok: true, id }); }
    await DB.update(db, 'suppliers', +m[1], o); await audit(ctx, 'lieferant_geaendert', 'lieferant', +m[1], Object.keys(o)); return out({ ok: true });
  }
  if (path === '/purchase' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (q.status) { where.push('p.status = ?'); args.push(q.status); }
    if (q.supplier) { where.push('p.supplier_id = ?'); args.push(toInt(q.supplier)); }
    if (q.q) { const like = '%' + q.q + '%'; where.push('(p.number LIKE ? OR s.name LIKE ?)'); args.push(like, like); }
    return out({ ok: true, invoices: await DB.all(db, `SELECT p.*, s.name AS supplier_name, fa.number AS account_number, fa.name AS account_name, fe.number AS entry_number, fd.number AS doc_number FROM purchase_invoices p JOIN suppliers s ON s.id = p.supplier_id LEFT JOIN fibu_accounts fa ON fa.id = p.account_id LEFT JOIN fibu_entries fe ON fe.id = p.entry_id LEFT JOIN fibu_docs fd ON fd.id = p.doc_id WHERE ${where.join(' AND ')} ORDER BY p.id DESC LIMIT 1000`, ...args) });
  }
  if ((path === '/purchase' && method === 'POST') || ((m = path.match(/^\/purchase\/(\d+)$/)) && method === 'PATCH')) {
    manage();
    const o = {};
    if (body.supplier_id !== undefined) { need(await DB.one(db, 'SELECT id FROM suppliers WHERE id = ?', toInt(body.supplier_id)), 400, 'Bitte einen Lieferanten wählen.'); o.supplier_id = toInt(body.supplier_id); }
    for (const k of ['number', 'category', 'note', 'text']) if (body[k] !== undefined) o[k] = str(body[k], 300);
    if (body.account_id !== undefined && body.account_id !== '') { const acc = await DB.one(db, "SELECT * FROM fibu_accounts WHERE id = ? AND status = 'offen'", toInt(body.account_id)); need(acc, 400, 'Bitte ein offenes Konto wählen.'); need(acc.type === 'aufwand' || acc.type === 'aktiv', 400, 'Eingangsrechnungen werden auf Aufwands- oder Aktivkonten gebucht.'); o.account_id = acc.id; }
    if (body.vat_rate !== undefined && body.vat_rate !== '') { const r = toNum(body.vat_rate); need([0, 7, 19].includes(r), 400, 'Umsatzsteuer: 0, 7 oder 19 %.'); o.vat_rate = r; }
    for (const k of ['date', 'due_date']) if (body[k] !== undefined) { need(!body[k] || /^\d{4}-\d{2}-\d{2}$/.test(body[k]), 400, 'Ungültiges Datum.'); o[k] = body[k] || null; }
    if (body.net !== undefined || body.gross !== undefined || body.vat !== undefined) {
      const rate = o.vat_rate != null ? o.vat_rate : 19;
      let net = toNum(body.net, 0), vat = body.vat !== undefined && body.vat !== '' ? toNum(body.vat, 0) : null, gross = body.gross !== undefined && body.gross !== '' ? toNum(body.gross, 0) : null;
      // Brutto angegeben, Netto leer → Netto und Umsatzsteuer aus dem Steuersatz berechnen
      if (gross && !net) { net = round2(gross / (1 + rate / 100)); if (vat === null) vat = round2(gross - net); }
      if (vat === null) vat = round2(net * rate / 100); if (gross === null) gross = round2(net + vat);
      Object.assign(o, { net: round2(net), vat: round2(vat), gross: round2(gross) });
    }
    if (body.file && body.file.base64) { need(/pdf/i.test(body.file.type || 'application/pdf'), 400, 'Bitte den Beleg als PDF hochladen.'); o.file_id = await putFile(ctx, { name: body.file.name || 'eingangsrechnung.pdf', mime: 'application/pdf', bytes: unb64(body.file.base64), ownerType: 'purchase' }); }
    o.updated_at = nowIso();
    if (method === 'POST') {
      need(o.supplier_id, 400, 'Bitte einen Lieferanten wählen.');
      const id = await DB.insert(db, 'purchase_invoices', { ...o, status: 'offen', created_by: u.id, created_at: nowIso() });
      await audit(ctx, 'eingangsrechnung_erfasst', 'eingangsrechnung', id, { brutto: o.gross });
      // Auf Konto buchen und Beleg archivieren (wenn Konto gewählt)
      let booking = null, bookingError = null;
      if (o.account_id) { try { const eid = await fibuBookPurchase(ctx, id); booking = await DB.val(db, 'SELECT number FROM fibu_entries WHERE id = ?', eid); } catch (e) { bookingError = e.message; } }
      const pi2 = await DB.one(db, 'SELECT doc_id FROM purchase_invoices WHERE id = ?', id);
      return out({ ok: true, id, booking, bookingError, doc: pi2.doc_id ? await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', pi2.doc_id) : null });
    }
    const cur = await DB.one(db, 'SELECT entry_id FROM purchase_invoices WHERE id = ?', +m[1]); need(cur, 404, 'Nicht gefunden.');
    if (cur.entry_id) need(!['supplier_id', 'net', 'vat', 'gross', 'account_id', 'date', 'vat_rate'].some((k) => o[k] !== undefined), 409, 'Die Eingangsrechnung ist bereits gebucht. Beträge, Konto und Datum lassen sich nur über ein Storno der Buchung ändern.');
    await DB.update(db, 'purchase_invoices', +m[1], o); await audit(ctx, 'eingangsrechnung_geaendert', 'eingangsrechnung', +m[1], Object.keys(o)); return out({ ok: true });
  }
  if ((m = path.match(/^\/purchase\/(\d+)\/(schedule|unschedule|paid|file|book)$/))) {
    const pi = await DB.one(db, 'SELECT * FROM purchase_invoices WHERE id = ?', +m[1]); need(pi, 404, 'Nicht gefunden.');
    if (m[2] === 'file' && method === 'GET') { need(pi.file_id, 404, 'Keine Datei.'); return fileResponse(await getFile(ctx, pi.file_id), q.download === '1'); }
    manage();
    if (m[2] === 'schedule') { need(['offen'].includes(pi.status), 409, 'Nur offene Rechnungen können zur Zahlung vorgemerkt werden.'); const sup = await DB.one(db, 'SELECT iban FROM suppliers WHERE id = ?', pi.supplier_id); need(ibanValid(sup && sup.iban), 400, 'Beim Lieferanten ist keine gültige IBAN hinterlegt.'); await DB.update(db, 'purchase_invoices', pi.id, { status: 'zur_zahlung', pay_date: /^\d{4}-\d{2}-\d{2}$/.test(body.pay_date || '') ? body.pay_date : berlinDate(nowMs()), updated_at: nowIso() }); }
    if (m[2] === 'unschedule') { need(pi.status === 'zur_zahlung', 409, 'Nicht vorgemerkt.'); await DB.update(db, 'purchase_invoices', pi.id, { status: 'offen', pay_date: null, updated_at: nowIso() }); }
    if (m[2] === 'paid') { await DB.update(db, 'purchase_invoices', pi.id, { status: 'bezahlt', paid_at: nowIso(), updated_at: nowIso() }); await fibuBookPurchasePaid(ctx, pi.id, /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date : null); }
    if (m[2] === 'book') { requirePerm(u, 'fibu_book'); if (body.account_id) { const acc = await DB.one(db, "SELECT id FROM fibu_accounts WHERE id = ? AND status = 'offen'", toInt(body.account_id)); need(acc, 400, 'Bitte ein offenes Konto wählen.'); await DB.update(db, 'purchase_invoices', pi.id, { account_id: acc.id }); } const eid = await fibuBookPurchase(ctx, pi.id); if (pi.status === 'bezahlt') await fibuBookPurchasePaid(ctx, pi.id, berlinDate(msOf(pi.paid_at || nowIso()))); return out({ ok: true, booking: await DB.val(db, 'SELECT number FROM fibu_entries WHERE id = ?', eid) }); }
    await audit(ctx, 'eingangsrechnung_' + m[2], 'eingangsrechnung', pi.id, null);
    return out({ ok: true });
  }
  if (path === '/payruns' && method === 'GET') return out({ ok: true, payruns: (await DB.all(db, 'SELECT p.*, u.name AS released_name FROM payruns p LEFT JOIN users u ON u.id = p.released_by ORDER BY p.id DESC LIMIT 100')).map((p) => ({ ...p, items: jparse(p.items, []) })) });
  if (path === '/payruns/close' && method === 'POST') { manage(); const id = await runDayClose(ctx, { force: true }); return out({ ok: true, id }); }
  if ((m = path.match(/^\/payruns\/(\d+)\/(release|file|paid)$/))) {
    const pr = await DB.one(db, 'SELECT * FROM payruns WHERE id = ?', +m[1]); need(pr, 404, 'Nicht gefunden.');
    if (m[2] === 'file' && method === 'GET') { need(pr.file_id, 404, 'Noch nicht freigegeben.'); await audit(ctx, 'sepa_heruntergeladen', 'zahlungsliste', pr.id, null); return fileResponse(await getFile(ctx, pr.file_id), true); }
    if (m[2] === 'release' && method === 'POST') { requirePerm(u, 'acc_release'); await releasePayrun(ctx, pr.id, body.exec_date); return out({ ok: true }); }
    if (m[2] === 'paid' && method === 'POST') { manage(); need(pr.status === 'freigegeben', 409, 'Bitte zuerst freigeben.'); for (const i of jparse(pr.items, [])) { await DB.update(db, 'purchase_invoices', i.id, { status: 'bezahlt', paid_at: nowIso() }); await fibuBookPurchasePaid(ctx, i.id, pr.exec_date || null); } await DB.update(db, 'payruns', pr.id, { status: 'ausgefuehrt' }); await audit(ctx, 'zahlungsliste_ausgefuehrt', 'zahlungsliste', pr.id, null); return out({ ok: true }); }
  }
  if (path === '/orgs' && method === 'GET') return out({ ok: true, orgs: await DB.all(db, 'SELECT id, name, billing_mode, billing_email, payment_terms_days, reminder_due_days, dunning_fee_1, dunning_fee_2, dunning_due_days, dunning_due_days_2, lead_price FROM orgs WHERE deleted = 0 ORDER BY name') });
  return fail(404, 'Nicht gefunden.');
}
