// Render the link-preview image, 1200x630: the phone view of Today at golden hour on the golden sky,
// with the wordmark and the promise big enough to read in a chat bubble. Wordmark, line and phone all sit
// inside the central 630x630 square, so square crops still show them. Needs the dev server on :5179.
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
const GOLD = '#FCA864';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
try {
  // 1. The phone: Today at 6:33pm, with nothing in it that dates the picture.
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('http://localhost:5179/#today', { waitUntil: 'networkidle0' });
  await p.evaluate(async () => { await document.fonts.ready; window.__psst.scrubTo(18.55); });
  await p.addStyleTag({ content: '.top .today, .nowchip, .toast { visibility: hidden !important; }' });
  await new Promise((r) => setTimeout(r, 1500));
  const phone = Buffer.from(await p.screenshot({ type: 'png' })).toString('base64');

  // 2. The card.
  const mark = readFileSync(new URL('../src/components/Wordmark.svelte', import.meta.url), 'utf8').match(/<svg viewBox="0 0 30 46"[\s\S]*?<\/svg>/)[0];
  const card = await b.newPage();
  await card.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await card.setContent(`<!doctype html><html><head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tilt+Warp&family=Recursive:CASL,wght@0..1,400..800&display=block">
    <style>
      body { margin: 0; width: 1200px; height: 630px; background: ${GOLD}; color: #052739; position: relative; overflow: hidden; }
      .words { position: absolute; left: 300px; top: 168px; width: 330px; }
      .mark { display: flex; align-items: flex-end; font: 400 132px/0.9 'Tilt Warp'; letter-spacing: -0.02em; }
      .mark svg { width: 48px; height: 74px; margin: 0 0 4px 6px; }
      .line { margin: 26px 0 0; font: 650 33px/1.15 'Recursive'; font-variation-settings: 'CASL' 1; }
      .phone { position: absolute; left: 660px; top: 34px; width: 260px; height: 563px; border-radius: 30px; overflow: hidden;
        box-shadow: 0 0 0 7px #052739, 0 30px 50px -16px rgba(5, 39, 57, 0.55); }
      .phone img { width: 100%; height: 100%; display: block; }
    </style></head><body>
    <div class="words"><div class="mark"><span>psst</span>${mark}</div><p class="line">The right move at the right hour.</p></div>
    <div class="phone"><img src="data:image/png;base64,${phone}"></div>
  </body></html>`, { waitUntil: 'networkidle0' });
  await card.evaluate(async () => { await document.fonts.ready; });
  await card.screenshot({ path: 'public/og.png', type: 'png' });
  console.log('og.png written');
} finally { await b.close(); }
