// Self-host the four OFL fonts from Google Fonts: one origin instead of three. The @font-face rules live in their own small
// stylesheet that the page switches on only after its first paint (src/routes/+page.svelte, src/lib/paint.ts), so no font download
// competes with the first screen (measured 2026-10-24: preloading or inlining them delayed first paint). Text shows in a fallback, then swaps.
// Downloads the latin and latin-ext woff2 files into static/fonts/ (content-hashed names, cached for a year)
// writes the @font-face rules to static/fonts/fonts.<hash>.css, and links it between the fonts markers in src/app.html. Rerun to update.
import { writeFileSync, readFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const SHEETS = [
  'https://fonts.googleapis.com/css2?family=Tilt+Warp:XROT,YROT@-45..45,-45..45&family=Recursive:CASL,MONO,wght@0..1,0..1,400..800&family=League+Gothic:wdth@75..100&display=swap',
  // the night hour only: just the clock's characters
  'https://fonts.googleapis.com/css2?family=Tilt+Neon:XROT,YROT@-45..45,-45..45&text=0123456789%3Aapm&display=swap',
];
const KEEP = new Set(['latin', 'latin-ext', 'text']); // psst is English with Spanish names
const DIR = new URL('../static/fonts/', import.meta.url), HTML = new URL('../src/app.html', import.meta.url);

mkdirSync(DIR, { recursive: true });
for (const f of readdirSync(DIR)) if (/\.(woff2|css)$/.test(f)) rmSync(new URL(f, DIR)); // OFL.txt, the licence, stays
const faces: string[] = [];
for (const sheet of SHEETS) {
  const css = await (await fetch(sheet, { headers: { 'User-Agent': UA } })).text();
  for (const m of css.matchAll(/(?:\/\* ([\w-]+) \*\/\s*)?@font-face \{([^}]+)\}/g)) {
    const subset = m[1] ?? 'text', body = m[2];
    if (!KEEP.has(subset)) continue;
    const family = body.match(/font-family: '([^']+)'/)?.[1], url = body.match(/url\(([^)]+)\)/)?.[1];
    if (!family || !url) throw new Error('unexpected @font-face in ' + sheet);
    const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
    const name = `${family.toLowerCase().replace(/\s+/g, '-')}-${subset}.${createHash('sha256').update(buf).digest('hex').slice(0, 8)}.woff2`;
    writeFileSync(new URL(name, DIR), buf);
    faces.push('@font-face{' + body.replace(/url\([^)]+\)/, `url(/fonts/${name})`).replace(/\s*\n\s*/g, '').replace(/: /g, ':') + '}');
    console.log(name, Math.round(buf.length / 1024) + ' KB');
  }
}
const css = faces.join('\n') + '\n', file = `fonts.${createHash('sha256').update(css).digest('hex').slice(0, 8)}.css`;
writeFileSync(new URL(file, DIR), css);
const block = `<!-- fonts:start (written by scripts/fonts.ts) -->\n<link id="fonts" rel="stylesheet" href="/fonts/${file}" media="print">\n<!-- fonts:end -->`;
const html = readFileSync(HTML, 'utf8');
if (!/<!-- fonts:start[\s\S]*?<!-- fonts:end -->/.test(html)) throw new Error('fonts markers missing in app.html');
writeFileSync(HTML, html.replace(/<!-- fonts:start[\s\S]*?<!-- fonts:end -->/, () => block));
console.log(`${faces.length} faces in ${file}`);
