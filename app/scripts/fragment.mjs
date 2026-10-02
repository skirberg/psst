// Turn Vite's single-file build into an artifact page fragment (no doctype/html/head/body).
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const head = (src.match(/<head>([\s\S]*?)<\/head>/) || [,''])[1]
  .replace(/<meta charset[^>]*>/i, '').replace(/<meta name="viewport"[^>]*>/i, '');
const body = (src.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [,''])[1];
const out = head.trim() + '\n' + body.trim() + '\n';
writeFileSync(new URL('../dist/psst.html', import.meta.url), out);
console.log('fragment bytes', out.length);
