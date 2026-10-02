// Print the planner's output for a stay so it can be read and sanity-checked.
import { createServer } from 'vite';
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true } });
const core = await server.ssrLoadModule('/src/lib/core.js');
const [start, end] = [process.argv[2] || '2026-11-20', process.argv[3] || '2026-11-24'];
const anchors = core.events.filter((e) => e.id.includes(process.argv[4] || 'john-summit'));
const days = core.planStay({ start, end, arrive: 15, depart: 13, wild: 0.65, anchors });
for (const d of days) {
  console.log(`\n${d.date} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.dow]}) sunset ${core.fmtHour(d.sun.set)} ${d.weather?.kind} ${d.weather?.hi}° rain ${d.weather?.rain}%`);
  for (const s of d.slots) console.log(`  ${core.fmtHour(s.at % 24).padEnd(8)} ${s.label.padEnd(9)} ${s.event ? '★ ' + s.event.title + ' @ ' + s.event.venue : s.move.title + ' [' + s.move.category + ', ' + s.move.hood + ', best ' + s.move.best + ']'}`);
}
await server.close();
