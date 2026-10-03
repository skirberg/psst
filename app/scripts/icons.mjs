// Every icon from one pineapple: favicon.svg, favicon.ico, apple-touch-icon, PWA icons, manifest.
// Usage: node scripts/icons.mjs            writes app/public/*
//        node scripts/icons.mjs --sheet    also writes a contact sheet to shots/icons/
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const PUB = new URL('../public/', import.meta.url);
const SHEET = new URL('../../shots/icons/', import.meta.url);
const PAPER = '#FEFAF1', MAMEY = '#F37F5F', LEAF = '#117555', RIND = '#BF4922';
export const BG = '#AEE6F4'; // morning sky, same as theme-color

// The wordmark pineapple, 30 x 46 units.
const CROWN = '<path d="M15 17C14 10 15 5 15 0c1 5 2 10 0 17z"/><path d="M15 17c-3-5-7-8-12-9 3 4 7 7 12 9z"/><path d="M15 17c3-5 7-8 12-9-3 4-7 7-12 9z"/><path d="M15 17c-2-6-5-10-9-12 1 5 5 9 9 12z"/><path d="M15 17c2-6 5-10 9-12-1 5-5 9-9 12z"/>';
const BODY = '<ellipse cx="15" cy="31" rx="11" ry="14"/>';
const HATCH = {
  full: ['M6 24l16 16M5 31l12 12M9 19l17 17M15 18l11 11M24 24L8 40M25 31L13 43M21 19L4 36M15 18L4 29', 1.3],
  small: ['M3 25l18 18M10 18l18 18M27 25L9 43M20 18L2 36', 2.4], // fewer, heavier lines that survive 16px
};

function pineapple({ hatch = 'full', outline = 0, id = 'p' } = {}) {
  const [d, w] = HATCH[hatch];
  return `<defs><clipPath id="${id}"><ellipse cx="15" cy="31" rx="11" ry="14"/></clipPath></defs>`
    + (outline ? `<g fill="${PAPER}" stroke="${PAPER}" stroke-width="${outline}" stroke-linejoin="round">${CROWN}${BODY}</g>` : '')
    + `<g fill="${LEAF}">${CROWN}</g><g fill="${MAMEY}">${BODY}</g>`
    + `<path d="${d}" clip-path="url(#${id})" stroke="${RIND}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity=".85"/>`;
}

// Browser tab: the sticker pineapple, tall, on nothing.
export const favicon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -2.5 50 50">${pineapple({ hatch: 'small', outline: 4, id: 'f' })}</svg>`;

// Home screen: the die-cut sticker slapped on the morning sky, tilted like every sticker in the app.
// The maskable version uses scale 1.2 so the art stays inside the safe circle (radius 40).
export const appIcon = (bg = BG, scale = 1.62) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#052739" flood-opacity=".28"/></filter></defs>
  <rect width="100" height="100" fill="${bg}"/>
  <g filter="url(#s)" transform="translate(50 51) rotate(-8) scale(${scale}) translate(-15 -24)">${pineapple({ outline: 3.4, id: 'a' })}</g>
</svg>`;

async function render(page, svg, size, transparent) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
  return Buffer.from(await page.screenshot({ type: 'png', omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } }));
}

// PNG-in-ICO container (supported by every current browser).
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([size, buf], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map(([, b]) => b)]);
}

const manifest = {
  name: 'psst. Miami',
  short_name: 'psst.',
  description: 'The right move at the right hour.',
  id: '/',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: BG,
  theme_color: BG,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
const fav = favicon();
writeFileSync(new URL('favicon.svg', PUB), fav + '\n');
const icoParts = [];
for (const s of [16, 32, 48]) icoParts.push([s, await render(page, fav, s, true)]);
writeFileSync(new URL('favicon.ico', PUB), ico(icoParts));
writeFileSync(new URL('apple-touch-icon.png', PUB), await render(page, appIcon(), 180, false));
writeFileSync(new URL('icon-192.png', PUB), await render(page, appIcon(), 192, false));
writeFileSync(new URL('icon-512.png', PUB), await render(page, appIcon(), 512, false));
writeFileSync(new URL('icon-maskable-512.png', PUB), await render(page, appIcon(BG, 1.2), 512, false));
writeFileSync(new URL('site.webmanifest', PUB), JSON.stringify(manifest, null, 2) + '\n');
console.log('icons written to app/public');

if (process.argv.includes('--sheet')) {
  mkdirSync(SHEET, { recursive: true });
  const tab = (bg, fg) => `<div style="display:flex;align-items:center;gap:8px;background:${bg};color:${fg};padding:10px 14px;border-radius:10px 10px 0 0;font:13px system-ui;width:220px">
    <img src="data:image/svg+xml;base64,${Buffer.from(fav).toString('base64')}" width="16" height="16"> psst. Miami</div>`;
  const home = (src, label) => `<figure style="margin:0;display:grid;justify-items:center;gap:6px;font:12px system-ui;color:#fff">
    <img src="data:image/png;base64,${src}" width="60" height="60" style="border-radius:13.5px"> ${label}</figure>`;
  const mask = (src) => `<img src="data:image/png;base64,${src}" width="96" height="96" style="border-radius:50%">`;
  const p180 = (await render(page, appIcon(), 180, false)).toString('base64');
  const pm = (await render(page, appIcon(BG, 1.2), 512, false)).toString('base64');
  const big = (await render(page, fav, 128, true)).toString('base64');
  const html = `<html><body style="margin:0;padding:24px;background:#888;display:grid;gap:22px;font:13px system-ui">
    <div style="display:flex;gap:16px">${tab('#FFFFFF', '#222')}${tab('#DEE1E6', '#222')}${tab('#35363A', '#EEE')}${tab('#1F1F1F', '#EEE')}</div>
    <div style="display:flex;gap:16px;align-items:end">
      ${[16, 32, 48].map((s, i) => `<img src="data:image/png;base64,${icoParts[i][1].toString('base64')}" width="${s}" height="${s}" style="image-rendering:pixelated;background:#fff">`).join('')}
      <img src="data:image/png;base64,${big}" width="128" height="128" style="background:#fff">
      <img src="data:image/png;base64,${big}" width="128" height="128" style="background:#202124">
    </div>
    <div style="display:flex;gap:26px;padding:22px;border-radius:20px;background:linear-gradient(#1b3a5a,#6d4f86);width:fit-content">
      ${home(p180, 'psst.')}${home(p180, 'psst.')}
    </div>
    <div style="display:flex;gap:16px;align-items:center">${mask(pm)}<img src="data:image/png;base64,${pm}" width="96" height="96" style="border-radius:22px"><img src="data:image/png;base64,${pm}" width="96" height="96"></div>
  </body></html>`;
  await page.setViewport({ width: 1100, height: 560, deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.screenshot({ path: new URL('sheet.png', SHEET).pathname, fullPage: true });
  console.log('sheet written to shots/icons/sheet.png');
}
await browser.close();
