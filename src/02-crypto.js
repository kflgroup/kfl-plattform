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
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Das Passwort muss mindestens 10 Zeichen lang sein.';
  if (pw.length > 200) return 'Das Passwort ist zu lang.';
  if (!/[A-Za-zÄÖÜäöüß]/.test(pw) || !/[0-9]/.test(pw)) return 'Bitte verwende Buchstaben und mindestens eine Ziffer.';
  return null;
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
async function sealSecret(env, text) { return JSON.stringify(await encryptBytes(serverKey(env), enc.encode(String(text)))); }
async function openSecret(env, sealed) { if (!sealed) return ''; try { return dec.decode(await decryptBytes(serverKey(env), JSON.parse(sealed))); } catch (e) { return ''; } }
const serverKey = (env) => String(env.APP_SECRET || env.FORM_SECRET || 'kfl-dev-only');

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
