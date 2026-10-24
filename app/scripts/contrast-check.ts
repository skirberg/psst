// The worst text contrast the sky reaches across three days, sampled every five minutes.
import { modules } from './chrome.ts';
const { sky, server } = await modules();
let worst = 99, at = '';
for (const d of ['2026-10-02', '2026-11-20', '2026-12-21']) for (let h = 0; h < 24; h += 1 / 12) { const c = sky.skyAt(h, d), t = sky.textOn(c), r = sky.contrast(c, t); if (r < worst) { worst = r; at = d + ' ' + h.toFixed(2) + ' ' + c; } }
console.log('worst text contrast across the day:', worst.toFixed(2), at);
await server.close();
if (worst < 4.5) process.exitCode = 1;
