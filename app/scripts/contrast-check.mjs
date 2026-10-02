import { createServer } from 'vite';
const server = await createServer({ configFile: false, root: '/Users/sami/dev/psst/app', logLevel: 'silent', server: { middlewareMode: true } });
const sky = await server.ssrLoadModule('/src/lib/sky.js');
let worst = 99, at = 0;
for (const d of ['2026-10-02', '2026-11-20', '2026-12-21']) for (let h = 0; h < 24; h += 1 / 12) { const c = sky.skyAt(h, d), t = sky.textOn(c), r = sky.contrast(c, t); if (r < worst) { worst = r; at = d + ' ' + h.toFixed(2) + ' ' + c; } }
console.log('worst text contrast across the day:', worst.toFixed(2), at);
await server.close();
