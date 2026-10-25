/* ============================================================
   SEPA-Überweisungsdatei (pain.001.001.09) für den Bank-Import
   ============================================================ */

function sepaText(s, max = 70) {
  return String(s ?? '').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^A-Za-z0-9 /\-?:().,'+]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const xmlEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const ibanClean = (i) => String(i || '').replace(/\s+/g, '').toUpperCase();
function ibanValid(iban) {
  const s = ibanClean(iban);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0; for (const ch of r) m = (m * 10 + +ch) % 97; return m === 1;
}

function buildSepaXml(s, { msgId, execDate, items }) {
  const total = round2(items.reduce((a, i) => a + i.amount, 0));
  const created = new Date(nowMs()).toISOString().slice(0, 19);
  const bic = s.company_bic ? `<DbtrAgt><FinInstnId><BICFI>${xmlEsc(s.company_bic.replace(/\s+/g, ''))}</BICFI></FinInstnId></DbtrAgt>` : '<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>';
  const tx = items.map((i, n) => `
      <CdtTrfTxInf>
        <PmtId><EndToEndId>${xmlEsc(sepaText(i.endToEnd || (msgId + '-' + (n + 1)), 35))}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${i.amount.toFixed(2)}</InstdAmt></Amt>
        ${i.bic ? `<CdtrAgt><FinInstnId><BICFI>${xmlEsc(i.bic.replace(/\s+/g, ''))}</BICFI></FinInstnId></CdtrAgt>` : ''}
        <Cdtr><Nm>${xmlEsc(sepaText(i.name))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${xmlEsc(ibanClean(i.iban))}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${xmlEsc(sepaText(i.purpose, 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xmlEsc(sepaText(msgId, 35))}</MsgId>
      <CreDtTm>${created}</CreDtTm>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${total.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${xmlEsc(sepaText(s.company_name))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xmlEsc(sepaText(msgId + '-P', 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${total.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>${execDate}</Dt></ReqdExctnDt>
      <Dbtr><Nm>${xmlEsc(sepaText(s.company_name))}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${xmlEsc(ibanClean(s.company_iban))}</IBAN></Id></DbtrAcct>
      ${bic}
      <ChrgBr>SLEV</ChrgBr>${tx}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}
