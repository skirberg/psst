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
// Rules that must hold for every plan.
const fails = [];
for (const d of days) for (const s of d.slots) {
  if (!s.move) continue;
  const dow = (d.dow + (s.at >= 24 ? 1 : 0)) % 7, nd = core.noteDays(s.move), td = core.titleDays(s.move);
  if (nd && !nd.includes(dow)) fails.push(`${d.date} ${s.move.id}: its note names other days`);
  if (td && !td.includes(dow)) fails.push(`${d.date} ${s.move.id}: its title names other days`);
  if (!core.openAt(s.move, dow, s.at % 24)) fails.push(`${d.date} ${s.move.id}: closed at ${core.fmtHour(s.at % 24)}`);
}
if (!process.argv[2]) {
  const summit = core.events.filter((e) => e.id.includes('john-summit'));
  if (summit.length !== 2) fails.push(`expected 2 John Summit nights, found ${summit.length}`);
  for (const e of summit) if (!days.some((d) => d.slots.some((s) => s.event?.id === e.id))) fails.push(`${e.id} missing from the default plan`);
}
// Kept places: a kept move that fits a slot should usually take it.
if (!process.argv[2]) {
  const base = new Set(days.flatMap((d) => d.slots.filter((s) => s.move).map((s) => s.move.id)));
  let tried = 0, won = 0;
  for (const m of core.moves.filter((x) => !base.has(x.id) && x.secret !== 2)) {
    const withKept = core.planStay({ start, end, arrive: 15, depart: 13, wild: 0.65, anchors, kept: [m.id] });
    if (withKept.some((d) => d.slots.some((s) => s.move?.id === m.id))) won++;
    tried++;
  }
  console.log(`\nKept bonus: ${won} of ${tried} places not in the default plan get in once kept`);
  if (!won) fails.push('the kept bonus never changes a plan');
  // Keeping everything must not break any rule.
  const all = core.planStay({ start, end, arrive: 15, depart: 13, wild: 0.65, anchors, kept: core.moves.map((m) => m.id) });
  for (const d of all) {
    if (d.slots.filter((s) => s.move).length > 4) fails.push(`${d.date}: more than 4 stops with everything kept`);
    for (const s of d.slots) if (s.move && !core.openAt(s.move, (d.dow + (s.at >= 24 ? 1 : 0)) % 7, s.at % 24)) fails.push(`${d.date} ${s.move.id}: closed, with everything kept`);
  }
  for (const e of anchors) if (!all.some((d) => d.slots.some((s) => s.event?.id === e.id))) fails.push(`${e.id} dropped with everything kept`);
}
console.log(fails.length ? `\nFAIL\n  ${fails.join('\n  ')}` : '\nOK: note days, title days, opening hours, both John Summit nights');
await server.close();
if (fails.length) process.exitCode = 1;
