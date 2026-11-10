/* ============================================================
   Kryptografie: Hashes, HMAC, Passwörter (PBKDF2), AES-GCM
   ============================================================ */

const enc = new TextEncoder();
const dec = new TextDecoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array((hex.match(/.{1,2}/g) || []).map((h) => parseInt(h, 16)));
const randomHex = (bytes = 32) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));
const b64 = (u8) => { let s = ''; const a = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

async function sha256Hex(text) { return toHex(await crypto.subtle.digest('SHA-256', typeof text === 'string' ? enc.encode(text) : text)); }
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}

const PBKDF2_ITERATIONS = 100000;
async function hashPassword(password, saltHex) {
  const salt = saltHex || randomHex(16);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS }, key, 256);
  return { hash: toHex(bits), salt };
}
async function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const h = await hashPassword(String(password || ''), salt);
  return safeEqual(h.hash, hash);
}
// Passwortregel (alle Konten): mindestens 10 Zeichen, eine Zahl, ein Großbuchstabe und ein Sonderzeichen
const PASSWORD_RULE = 'Mindestens 10 Zeichen mit mindestens einer Zahl, einem Großbuchstaben und einem Sonderzeichen.';
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Das Passwort muss mindestens 10 Zeichen lang sein.';
  if (pw.length > 200) return 'Das Passwort ist zu lang.';
  const miss = [!/[0-9]/.test(pw) && 'eine Zahl', !/[A-ZÄÖÜ]/.test(pw) && 'einen Großbuchstaben', !/[^A-Za-z0-9ÄÖÜäöüß\s]/.test(pw) && 'ein Sonderzeichen (z. B. ! ? # %)'].filter(Boolean);
  if (miss.length) return `Das Passwort braucht noch ${miss.join(', ').replace(/, ([^,]*)$/, ' und $1')}.`;
  return null;
}
// Zufälliges vorläufiges Passwort, das die Passwortregel erfüllt (ohne verwechselbare Zeichen wie 0/O, 1/l)
function randomPassword(len = 12) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!#%+?@*'];
  const all = sets.join(''), rnd = crypto.getRandomValues(new Uint32Array(len + 4));
  const chars = sets.map((s, i) => s[rnd[i] % s.length]);
  for (let i = chars.length; i < len; i++) chars.push(all[rnd[i] % all.length]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd[len + (i % 4)] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

// AES-GCM mit Schlüssel aus Passwort (für Backups und geschützte Einstellungen)
// Cloudflare Workers erlauben höchstens 100.000 PBKDF2-Runden
const AES_PBKDF2_ITERATIONS = 100000;
async function aesKeyFromPassword(password, saltU8, iterations = AES_PBKDF2_ITERATIONS) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: saltU8, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptBytes(password, bytes) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKeyFromPassword(password, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  return { salt: b64(salt), iv: b64(iv), data: b64(ct), alg: 'AES-256-GCM/PBKDF2-SHA256-' + AES_PBKDF2_ITERATIONS };
}
async function decryptBytes(password, box) {
  const it = toInt(String(box.alg || '').split('-').pop(), AES_PBKDF2_ITERATIONS) || AES_PBKDF2_ITERATIONS;
  const key = await aesKeyFromPassword(password, unb64(box.salt), it);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data)));
}
// Geheimnisse in den Einstellungen mit dem Server-Schlüssel verschlüsseln
// Server-Schlüssel: APP_SECRET (eigener Zufallsschlüssel). Ohne APP_SECRET wird FORM_SECRET genutzt (Altbestand).
// Nach dem Setzen von APP_SECRET bleibt FORM_SECRET als „alter Schlüssel“ lesbar: verschlüsselte Einstellungen werden
// automatisch neu verschlüsselt (rotateServerKey) und Links aus älteren E-Mails bleiben gültig.
const serverKey = (env) => String(env.APP_SECRET || env.FORM_SECRET || 'kfl-dev-only');
const serverKeys = (env) => uniq([env.APP_SECRET, env.FORM_SECRET].filter(Boolean).map(String)).concat(env.APP_SECRET || env.FORM_SECRET ? [] : ['kfl-dev-only']);
async function sealSecret(env, text) { return JSON.stringify(await encryptBytes(serverKey(env), enc.encode(String(text)))); }
// Entschlüsseln mit dem aktuellen, sonst mit dem alten Schlüssel; { text, old } verrät, ob neu verschlüsselt werden sollte
async function openSecretInfo(env, sealed) {
  if (!sealed) return { text: '', old: false };
  let box; try { box = JSON.parse(sealed); } catch (e) { return { text: '', old: false }; }
  const keys = serverKeys(env);
  for (let i = 0; i < keys.length; i++) { try { return { text: dec.decode(await decryptBytes(keys[i], box)), old: i > 0 }; } catch (e) { /* nächster Schlüssel */ } }
  return { text: '', old: false };
}
async function openSecret(env, sealed) { return (await openSecretInfo(env, sealed)).text; }

async function gzip(bytes) {
  if (typeof CompressionStream === 'undefined') return bytes;
  const cs = new CompressionStream('gzip');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(cs));
  return new Uint8Array(await out.arrayBuffer());
}
async function gunzip(bytes) {
  const ds = new DecompressionStream('gzip');
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer());
}

/* ---------- Zwei-Faktor-Anmeldung (TOTP, RFC 6238: 6 Stellen, 30 s, SHA-1 – kompatibel mit allen Authenticator-Apps) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32enc(bytes) { let bits = 0, val = 0, out = ''; for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out; }
function b32dec(s) { const c = String(s || '').toUpperCase().replace(/[^A-Z2-7]/g, ''); let bits = 0, val = 0; const out = []; for (const ch of c) { val = ((val << 5) | B32.indexOf(ch)) & 0xffffff; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }
const newTotpSecret = () => b32enc(crypto.getRandomValues(new Uint8Array(20)));
async function totpAt(secret, step) {
  const key = await crypto.subtle.importKey('raw', b32dec(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8); let x = step; for (let i = 7; i >= 0; i--) { msg[i] = x & 255; x = Math.floor(x / 256); }
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)), o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}
// Prüft den Code (±30 s Toleranz). Liefert den Zeitschritt (gegen Wiederverwendung speichern) oder 0
async function totpCheck(secret, code, lastStep = 0) {
  const c = String(code || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(c) || !secret) return 0;
  const now = Math.floor(nowMs() / 30000);
  for (const d of [0, -1, 1]) { const st = now + d; if (st > lastStep && safeEqual(await totpAt(secret, st), c)) return st; }
  return 0;
}
