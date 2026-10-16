// Fails the build if any field marked "private": true leaks into dist/.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const resume = JSON.parse(readFileSync('content/resume.json', 'utf8'));
const secrets = [];
// content/private.json is gitignored (absent in CI); locally, every value in it is a secret.
if (existsSync('content/private.json')) {
  const priv = JSON.parse(readFileSync('content/private.json', 'utf8'));
  (function grab(n) {
    if (typeof n === 'string') return void secrets.push(n);
    if (n && typeof n === 'object') Object.entries(n).forEach(([k, v]) => k !== '_note' && k !== 'private' && grab(v));
  })(priv);
}
(function collect(node) {
  if (Array.isArray(node)) return node.forEach(collect);
  if (node && typeof node === 'object') {
    if (node.private === true) {
      for (const [k, v] of Object.entries(node)) if (k !== 'private' && typeof v === 'string') secrets.push(v);
    }
    Object.values(node).forEach(collect);
  }
})(resume);
// Also catch the phone number in other formats (digits only).
const digitSecrets = secrets.map((s) => s.replace(/\D/g, '')).filter((d) => d.length >= 7);

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})('dist');

let leaks = 0;
for (const f of files) {
  if (/\.(png|jpe?g|webp|avif|gif|mp3|m4a|ogg|woff2?)$/i.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  const digits = text.replace(/\D/g, '');
  for (const s of secrets) if (text.includes(s)) { console.error(`PRIVATE FIELD LEAK in ${f}: ${s}`); leaks++; }
  for (const d of digitSecrets) if (digits.includes(d)) { console.error(`PRIVATE NUMBER LEAK in ${f}`); leaks++; }
}
if (leaks) process.exit(1);
console.log(`Privacy check passed (${files.length} files scanned).`);
