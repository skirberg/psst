// Screenshot harness: drives the dev server in headless Chrome and saves a fixed set of views.
// Usage: node scripts/shots.mjs <outDir> [baseUrl]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = pos[0] || '../shots/latest';
const base = pos[1] || 'http://localhost:5179/';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const views = [
  ['today-dawn', { hour: 7.25, tab: 'today' }], ['today-noon', { hour: 13, tab: 'today' }], ['today-golden', { hour: 18.6, tab: 'today' }],
  ['today-night', { hour: 22.5, tab: 'today' }], ['today-flip', { hour: 21, tab: 'today', flip: true }], ['today-sealed', { hour: 21, tab: 'today', sealed: true }],
  ['where', { hour: 20, tab: 'today', where: true }], ['trip', { hour: 15, tab: 'trip' }], ['wall', { hour: 16, tab: 'wall' }], ['stay', { hour: 17, tab: 'stay' }], ['stay-open', { hour: 17, tab: 'stay', hotel: 'the-elser' }], ['book', { hour: 12, tab: 'book' }], ['mood', { hour: 21, tab: 'today', mood: 'drink' }],
];
const sizes = [['desktop', { width: 1440, height: 900, deviceScaleFactor: 1 }], ['mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]];
const motion = process.argv.includes('--motion');
for (const [sname, vp] of sizes) {
  for (const [vname, v] of views) {
    
    const page = await browser.newPage();
    await page.setViewport(vp);
    if (!motion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    page.on('pageerror', (e) => console.log('pageerror', sname, vname, e.message.slice(0, 200)));
    await page.goto(base + '#' + v.tab, { waitUntil: 'networkidle0' });
    if (motion) await sleep(2600);
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate((v) => {
      const a = window.__psst; a.setTab(v.tab); a.scrubTo(v.hour);
      if (v.flip) a.flipped = a.pad[0]?.m.id;
      if (v.sealed) { const x = a.pad.find((x) => x.sealed); if (x) a.padId = x.m.id; }
      if (v.mood) a.mood = v.mood;
      if (v.hotel) a.stayFocus = v.hotel;
      if (v.where) a.where = a.pad.find((x) => !x.sealed)?.m.id;
    }, v);
    await sleep(1100);
    await page.screenshot({ path: `${out}/${sname}-${vname}.png` });
    if (sname === 'mobile' && ['today-noon', 'trip', 'book'].includes(vname)) {
      await page.evaluate(() => { const s = document.querySelector('.col'); s && (s.scrollTop = 760); });
      await sleep(300);
      await page.screenshot({ path: `${out}/${sname}-${vname}-scrolled.png` });
    }
    await page.close();
  }
}
await browser.close();
console.log('saved to', out);
