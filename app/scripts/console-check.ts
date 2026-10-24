// Print every console message and page error from a fresh load of the dev server.
import { chrome, DEV, sleep } from './chrome.ts';
const b = await chrome();
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800 });
p.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 300)));
p.on('pageerror', (e) => console.log('pageerror', (e as Error).message.slice(0, 300)));
await p.goto(DEV + '#today', { waitUntil: 'networkidle0' });
await sleep(2500);
await b.close();
