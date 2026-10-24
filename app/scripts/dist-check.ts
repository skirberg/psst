// Checks on the production build itself, for bugs the dev server cannot show.
// Usage: node scripts/dist-check.ts [buildDir]   (default app/build)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { FRAME } from '../src/lib/geo-frame.ts';

const dir = process.argv[2] || fileURLToPath(new URL('../build', import.meta.url));
const fails: string[] = [];
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const js = walk(join(dir, '_app')).filter((f) => f.endsWith('.js'));
const all = [html, ...js.map((f) => readFileSync(f, 'utf8'))].join('\n'); // code is inlined in the page; any split files too

// the page
if (/__SITE__|%sveltekit\./.test(html)) fails.push('template placeholder left in index.html');
if (!html.includes('id="boot"')) fails.push('no boot screen');
if (html.indexOf('id="boot"') > html.indexOf('<script>', html.indexOf('<body'))) fails.push('boot screen comes after the app script');
if (process.env.VERCEL && !/property="og:image" content="https:\/\//.test(html)) fails.push('og:image is not absolute on Vercel');
if (!/<style[^>]*>[\s\S]{20000,}<\/style>/.test(html)) fails.push('app stylesheet is not inlined');
if (/fonts\.(googleapis|gstatic)\.com/.test(html)) fails.push('page still loads Google Fonts (fonts are self-hosted)');
for (const m of html.matchAll(/href="\/fonts\/([^"]+)"/g)) if (!existsSync(join(dir, 'fonts', m[1]))) fails.push(`preloaded font missing: ${m[1]}`);
const fontCss = html.match(/id="fonts" rel="stylesheet" href="\/fonts\/(fonts\.[0-9a-f]+\.css)"/)?.[1];
if (!fontCss || !existsSync(join(dir, 'fonts', fontCss))) fails.push('font stylesheet missing');
else for (const m of readFileSync(join(dir, 'fonts', fontCss), 'utf8').matchAll(/url\(\/fonts\/([^)]+)\)/g)) if (!existsSync(join(dir, 'fonts', m[1]))) fails.push(`@font-face file missing: ${m[1]}`);
// the code: '$$' survives (once lost to a string replace), the map data is split out, the frame matches it
if (!/[`'"]\$\$\$\$[`'"]/.test(all)) fails.push("code lost the '$$$$' price tier");
// the first screen is one request: the page with its code and styles inlined (bundleStrategy 'inline')
if (/<script[^>]+src="[^"]*_app\/immutable/.test(html) || /rel="modulepreload"/.test(html)) fails.push('page loads code files instead of inlining them');
const firstKb = Math.round(gzipSync(html).length / 1024);
if (all.includes('"coast"')) fails.push('map data is in the first load, not fetched after paint');
if (firstKb > 130) fails.push(`first load is ${firstKb} KB gzipped (budget 130)`);
const geo = JSON.parse(readFileSync(join(dir, 'geo.json'), 'utf8'));
if (geo.w !== FRAME.w || geo.h !== FRAME.h || geo.k !== FRAME.k || geo.bbox.join() !== FRAME.bbox.join()) fails.push('geo-frame.ts disagrees with geo.json: rerun scripts/geo.ts');
// offline
const sw = join(dir, 'service-worker.js');
if (!existsSync(sw)) fails.push('no service worker');
else if (!readFileSync(sw, 'utf8').includes('/_vercel/')) fails.push('service worker would cache analytics');
for (const f of ['404.html', 'site.webmanifest', 'favicon.svg', 'og.png', 'geo.json']) if (!existsSync(join(dir, f))) fails.push(`missing ${f}`);

console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : `OK: placeholders filled, boot first, CSS inlined, fonts self-hosted, '$$' intact, map split out, first load one ${firstKb} KB gzipped request, service worker`);
if (fails.length) process.exitCode = 1;
