// Spot-check sun position, sunrise and sunset, and the sky phase for a few known moments.
import { modules } from './chrome.ts';
const { core, sky, server } = await modules();
for (const [d, h] of [['2026-10-02', 7.2], ['2026-10-02', 13.3], ['2026-10-02', 19.0], ['2026-11-20', 17.4], ['2026-11-20', 12.2], ['2026-06-21', 13.5]] as const) {
  const p = sky.solarPosition(d, h), s = core.sunFor(d), shade = sky.sunShade(d, h, '#000');
  console.log(d, h, 'alt', p.altitude.toFixed(1), 'az', p.azimuth.toFixed(1), '| sunrise', core.fmtHour(s.rise), 'sunset', core.fmtHour(s.set), '| sky', sky.skyAt(h, d), sky.phaseAt(h, s), '| shade', shade.dx, shade.dy);
}
await server.close();
