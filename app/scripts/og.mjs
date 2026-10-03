// Render the link-preview image: the app at golden hour, 1200x630.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto('http://localhost:5179/#today', { waitUntil: 'networkidle0' });
await p.evaluate(async () => { await document.fonts.ready; const a = window.__psst; a.scrubTo(18.55); });
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: 'public/og.png' });
await b.close(); console.log('og.png written');
