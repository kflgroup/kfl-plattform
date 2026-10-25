// Baut dist/worker.js aus src/*.js und ui/* (ohne Fremdpakete).
// Aufruf: node build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('.', import.meta.url).pathname;
const read = (p) => readFileSync(root + p, 'utf8');
const ui = (name) => (existsSync(root + 'ui/' + name) ? read('ui/' + name) : '');

// ui/<kind>.js oder alle Teile aus ui/<kind>/*.js (sortiert)
const js = (kind) => existsSync(root + 'ui/' + kind) ? readdirSync(root + 'ui/' + kind).filter((f) => f.endsWith('.js')).sort().map((f) => read(`ui/${kind}/${f}`)).join('\n') : ui(kind + '.js');
function page(kind) {
  const tpl = ui(kind + '.html');
  const out = tpl.replace('/*COMMON_CSS*/', () => ui('common.css')).replace('/*CSS*/', () => ui(kind + '.css'))
    .replace('/*COMMON_JS*/', () => ui('common.js')).replace('/*JS*/', () => js(kind));
  if (out.includes('</script') && out.indexOf('</script') < out.lastIndexOf('</script')) throw new Error(kind + ': "</script" im Skript gefunden');
  return out;
}
const files = readdirSync(root + 'src').filter((f) => f.endsWith('.js')).sort();
let code = `/* KFL Plattform 2.0 – automatisch gebaut aus src/ und ui/ (node build.mjs). Nicht direkt bearbeiten. */\n`;
for (const f of files) {
  if (f === '99-index.js') continue;
  code += `\n/* ===== ${f} ===== */\n` + read('src/' + f) + '\n';
}
code += `\n/* ===== Oberflächen ===== */\nconst STAFF_HTML = ${JSON.stringify(page('staff'))};\nconst PARTNER_HTML = ${JSON.stringify(page('partner'))};\n`;
code += `\n/* ===== 99-index.js ===== */\n` + read('src/99-index.js');
// nur ASCII ausgeben (Umlaute als \\u-Escapes), damit beim Kopieren nichts verloren geht
code = [...code].map((c) => { const n = c.codePointAt(0); return n < 128 ? c : n > 0xffff ? c.split('').map((x) => '\\u' + x.charCodeAt(0).toString(16).padStart(4, '0')).join('') : '\\u' + n.toString(16).padStart(4, '0'); }).join('');
mkdirSync(root + 'dist', { recursive: true });
// TCP-Sockets (SMTP): im Worker aus 'cloudflare:sockets', in den Tests ein Platzhalter
const testCode = 'const SMTP_CONNECT = (...a) => globalThis.__kflConnect(...a);\n' + code;
code = "import { connect as SMTP_CONNECT } from 'cloudflare:sockets';\n" + code;
// Syntaxprüfung der Oberflächen-Skripte
for (const k of ['staff', 'partner']) { const h = page(k); const m = h.match(/<script[^>]*>([\s\S]*)<\/script>/); writeFileSync(root + `dist/${k}.check.js`, m ? m[1] : ''); }
writeFileSync(root + 'dist/worker.js', code);
writeFileSync(root + 'dist/worker.test.mjs', testCode);
console.log('dist/worker.js', code.length, 'Zeichen, sha256', createHash('sha256').update(code).digest('hex').slice(0, 16));
