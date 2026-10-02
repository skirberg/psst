import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800 });
p.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 300)));
p.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 300)));
await p.goto('http://localhost:5179/#now', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500));
await b.close();
