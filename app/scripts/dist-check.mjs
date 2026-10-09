// Checks on the production file itself, for bugs the dev server cannot show.
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const fails = [];
const script = html.match(/<script type="module"[^>]*>[\s\S]*?<\/script>/)?.[0] || '';
if (!script) fails.push('no inlined module script');
if (!html.trimEnd().endsWith(script + '</body></html>')) fails.push('module script is not the last thing in <body>');
for (const s of ['"$$$$"', '$$events']) if (!script.includes(s)) fails.push(`script lost ${s} (a '$$' got rewritten)`);
if (html.indexOf('class="boot"') > html.indexOf('<script type="module"')) fails.push('boot screen comes after the script');
if (/__SITE__/.test(html)) fails.push('__SITE__ placeholder left in the page');
console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'OK: dist script intact and last, boot first, no placeholders');
if (fails.length) process.exitCode = 1;
