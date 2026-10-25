/* ============================================================
   E-Mail-Versand über SMTP (z. B. IONOS-Postfach von kfl-group.com)
   Secrets: SMTP_USER (Postfach, z. B. noreplay@kfl-group.com), SMTP_PASS
   optional: SMTP_HOST (Standard smtp.ionos.de), SMTP_PORT (587 = STARTTLS, 465 = TLS)
   optional je Absender eigenes Postfach: SMTP_PASS_<NAME> (z. B. SMTP_PASS_RECHNUNG für rechnung@)
   Darf das Postfach eine Absenderadresse nicht verwenden, wird mit dem Hauptpostfach
   gesendet und die gewünschte Adresse als Antwortadresse (Reply-To) gesetzt.
   ============================================================ */

const smtpConfigured = (env) => !!(env.SMTP_USER && env.SMTP_PASS);
const mailProvider = (env) => (smtpConfigured(env) ? 'smtp' : env.BREVO_API_KEY ? 'brevo' : null);

const utf8b64 = (s) => { const bytes = new TextEncoder().encode(String(s)); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const wrap76 = (b) => b.replace(/.{1,76}/g, (x) => x + '\r\n');
const encWord = (s) => (/^[\x20-\x7e]*$/.test(String(s)) ? String(s) : `=?UTF-8?B?${utf8b64(s)}?=`);
const addr = (email, name) => (name ? `${encWord(String(name).replace(/[\r\n"]/g, ''))} <${email}>` : `<${email}>`);
function htmlToText(html) {
  return String(html).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)').replace(/<(br|\/p|\/div|\/h\d|\/tr|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function buildMime({ from, fromName, to, toName, subject, html, replyTo, attachments, domain }) {
  const rnd = () => randomHex(12);
  const alt = 'alt_' + rnd(), mix = 'mix_' + rnd();
  const head = [
    `From: ${addr(from, fromName)}`, `To: ${to.map((t, i) => addr(t, i === 0 ? toName : '')).join(', ')}`, `Subject: ${encWord(subject)}`,
    `Date: ${new Date(nowMs()).toUTCString().replace('GMT', '+0000')}`, `Message-ID: <${rnd()}.${Date.now()}@${domain}>`, 'MIME-Version: 1.0'
  ];
  if (replyTo) head.push(`Reply-To: ${addr(replyTo.email || replyTo, replyTo.name)}`);
  const altPart = [`--${alt}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(utf8b64(htmlToText(html))),
    `--${alt}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(utf8b64(html)), `--${alt}--`, ''].join('\r\n');
  if (!attachments || !attachments.length) return [...head, `Content-Type: multipart/alternative; boundary="${alt}"`, '', altPart].join('\r\n');
  const parts = [`--${mix}`, `Content-Type: multipart/alternative; boundary="${alt}"`, '', altPart];
  for (const a of attachments) parts.push(`--${mix}`, `Content-Type: ${a.type || 'application/pdf'}; name="${encWord(a.name)}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${encWord(a.name)}"`, '', wrap76(String(a.base64).replace(/\s+/g, '')));
  parts.push(`--${mix}--`, '');
  return [...head, `Content-Type: multipart/mixed; boundary="${mix}"`, '', parts.join('\r\n')].join('\r\n');
}

// Minimaler SMTP-Client (STARTTLS/TLS, AUTH LOGIN) über Cloudflare TCP-Sockets
async function smtpSession(env, user, pass, fn) {
  const host = env.SMTP_HOST || 'smtp.ionos.de', port = toInt(env.SMTP_PORT, 587), secure = port === 465;
  let socket = SMTP_CONNECT({ hostname: host, port }, { secureTransport: secure ? 'on' : 'starttls', allowHalfOpen: false });
  let reader = socket.readable.getReader(), writer = socket.writable.getWriter();
  const enc = new TextEncoder(), dec = new TextDecoder(); let buf = '';
  const read = async () => {
    for (;;) {
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) if (/^\d{3}( |$)/.test(lines[i])) { buf = lines.slice(i + 1).join('\r\n'); return { code: +lines[i].slice(0, 3), text: lines.slice(0, i + 1).join(' | ') }; }
      const { value, done } = await reader.read();
      if (done) throw new Error('SMTP-Verbindung wurde vom Server geschlossen');
      buf += dec.decode(value, { stream: true });
    }
  };
  const send = async (line, expect, label) => {
    await writer.write(enc.encode(line + '\r\n'));
    const r = await read();
    if (expect && !expect.includes(r.code)) { const e = new Error(`SMTP ${label || line.split(' ')[0]}: ${r.text}`); e.smtp = r.code; throw e; }
    return r;
  };
  try {
    let r = await read(); if (r.code !== 220) throw new Error('SMTP-Begrüßung: ' + r.text);
    await send('EHLO kfl-group.com', [250]);
    if (!secure) {
      await send('STARTTLS', [220]);
      reader.releaseLock(); writer.releaseLock();
      socket = socket.startTls();
      reader = socket.readable.getReader(); writer = socket.writable.getWriter(); buf = '';
      await send('EHLO kfl-group.com', [250]);
    }
    await send('AUTH LOGIN', [334]);
    await send(utf8b64(user), [334], 'AUTH');
    await send(utf8b64(pass), [235], 'AUTH (Benutzername oder Passwort falsch?)');
    const res = await fn({ send, write: (s) => writer.write(enc.encode(s)), read });
    try { await send('QUIT'); } catch (e) { /* egal */ }
    return res;
  } finally { try { socket.close(); } catch (e) { /* bereits zu */ } }
}
async function smtpSendMail(env, mail) {
  const main = String(env.SMTP_USER).toLowerCase(), want = String(mail.from).toLowerCase();
  const local = want.split('@')[0].replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const own = want !== main && env['SMTP_PASS_' + local] ? { user: want, pass: env['SMTP_PASS_' + local] } : null;
  const domain = (want.split('@')[1] || 'kfl-group.com');
  const deliver = async (user, pass, from, replyTo) => smtpSession(env, user, pass, async ({ send, write, read }) => {
    await send(`MAIL FROM:<${from}>`, [250]);
    for (const t of mail.to) await send(`RCPT TO:<${t}>`, [250, 251]);
    await send('DATA', [354]);
    const mime = buildMime({ ...mail, from, replyTo, domain }).replace(/\r\n\./g, '\r\n..');
    await write(mime + (mime.endsWith('\r\n') ? '' : '\r\n') + '.\r\n');
    const r = await read();
    if (r.code !== 250) { const e = new Error('SMTP DATA: ' + r.text); e.smtp = r.code; throw e; }
    return r.text;
  });
  const timeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('SMTP-Zeitüberschreitung')), 25000))]);
  if (own) return timeout(deliver(own.user, own.pass, want, mail.replyTo));
  try { return await timeout(deliver(main, env.SMTP_PASS, want, mail.replyTo)); }
  catch (e) {
    // Absenderadresse für dieses Postfach nicht erlaubt → mit Hauptpostfach senden, gewünschte Adresse als Antwortadresse
    if (want !== main && e.smtp >= 500) return timeout(deliver(main, env.SMTP_PASS, main, mail.replyTo || { email: want, name: mail.fromName }));
    throw e;
  }
}
