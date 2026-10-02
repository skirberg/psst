import { createServer } from 'vite';
const server = await createServer({ configFile: false, root: '/Users/sami/dev/psst/app', logLevel: 'silent', server: { middlewareMode: true } });
const sky = await server.ssrLoadModule('/src/lib/sky.js');
const core = await server.ssrLoadModule('/src/lib/core.js');
for (const [d, h] of [['2026-10-02', 7.2], ['2026-10-02', 13.3], ['2026-10-02', 19.0], ['2026-11-20', 17.4], ['2026-11-20', 12.2], ['2026-06-21', 13.5]]) {
  const p = sky.solarPosition(d, h); const s = core.sunFor(d);
  console.log(d, h, 'alt', p.altitude.toFixed(1), 'az', p.azimuth.toFixed(1), '| sunrise', core.fmtHour(s.rise), 'sunset', core.fmtHour(s.set), '| sky', sky.skyAt(h, d), sky.phaseAt(h, s), '| shade', sky.sunShade(d, h, '#000').dx, sky.sunShade(d, h, '#000').dy);
}
await server.close();
