// Checks every place, event and hotel in src/lib against the shapes in types.ts, so bad data fails the build
// instead of reaching a phone. Runs in npm run build before Vite. Exits 1 with one line per problem.
import { readFileSync } from 'node:fs';
import { FRAME } from '../src/lib/geo-frame.ts';
import { MOVE_CATEGORIES, EVENT_CATEGORIES } from '../src/lib/types.ts';

type Row = Record<string, unknown>;
const load = (name: string): Row[] => JSON.parse(readFileSync(new URL(`../src/lib/${name}.json`, import.meta.url), 'utf8')) as Row[];
const fails: string[] = [];
const [S, W, N, E] = FRAME.bbox;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const isDate = (v: unknown): boolean => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + 'T12:00:00Z').toISOString().startsWith(v);
const str = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
const int = (v: unknown, lo: number, hi: number): boolean => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const urls = (v: unknown): boolean => Array.isArray(v) && v.length > 0 && v.every((u) => typeof u === 'string' && /^https?:\/\/\S+$/.test(u));

// Places and hotels are pins on the map, so they must sit inside it; events only need to be in Miami-Dade (Hard Rock Stadium is north of the map).
const inMap = (r: Row): boolean => typeof r.lat === 'number' && typeof r.lng === 'number' && r.lat > S && r.lat < N && r.lng > W && r.lng < E;
const inCounty = (r: Row): boolean => typeof r.lat === 'number' && typeof r.lng === 'number' && r.lat > 25.1 && r.lat < 26.0 && r.lng > -80.9 && r.lng < -80.0;

function common(kind: string, r: Row, ids: Set<string>): (what: string, ok: boolean) => void {
  const id = String(r.id);
  const need = (what: string, ok: boolean): void => { if (!ok) fails.push(`${kind} ${id}: ${what}`); };
  need('id is kebab-case and unique', /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) && !ids.has(id)); ids.add(id);
  for (const f of ['address', 'hood']) need(`${f} is set`, str(r[f]));
  need(kind === 'event' ? 'lat/lng in Miami-Dade' : 'lat/lng inside the map', kind === 'event' ? inCounty(r) : inMap(r));
  return need;
}

const moveIds = new Set<string>();
for (const m of load('moves')) {
  const need = common('move', m, moveIds);
  for (const f of ['title', 'place', 'theMove', 'why']) need(`${f} is set`, str(m[f]));
  need('category is known', (MOVE_CATEGORIES as readonly unknown[]).includes(m.category));
  need('best is HH:MM', typeof m.best === 'string' && HHMM.test(m.best));
  need('energy 1 to 5', int(m.energy, 1, 5)); need('cost 1 to 4', int(m.cost, 1, 4)); need('secret 0, 1 or 2', int(m.secret, 0, 2));
  need('rainOk is true or false', typeof m.rainOk === 'boolean');
  need('sources are web links', urls(m.sources)); need('verifiedOn is a date', isDate(m.verifiedOn));
  const ws = m.windows;
  need('has opening windows', Array.isArray(ws) && ws.length > 0);
  if (Array.isArray(ws)) for (const w of ws as Row[]) need('windows have days 0 to 6 and HH:MM times', Array.isArray(w.days) && w.days.length > 0 && w.days.every((d) => int(d, 0, 6)) && HHMM.test(String(w.from)) && HHMM.test(String(w.to)));
}

const eventIds = new Set<string>();
for (const e of load('events')) {
  const need = common('event', e, eventIds);
  for (const f of ['title', 'venue']) need(`${f} is set`, str(e[f]));
  need('category is known', (EVENT_CATEGORIES as readonly unknown[]).includes(e.category));
  need('date is a date', isDate(e.date));
  need('endDate is empty or on/after date', e.endDate == null || (isDate(e.endDate) && String(e.endDate) >= String(e.date)));
  for (const f of ['time', 'doors']) need(`${f} is HH:MM`, e[f] == null || HHMM.test(String(e[f])));
  need('sources are web links', urls(e.sources)); need('verifiedOn is a date', isDate(e.verifiedOn));
  need('url is https', e.url == null || /^https:\/\//.test(String(e.url)));
}

const hotelIds = new Set<string>();
for (const h of load('hotels')) {
  const need = common('hotel', h, hotelIds);
  for (const f of ['name', 'price', 'theMove', 'why', 'word']) need(`${f} is set`, str(h[f]));
  need('tier 1 to 4', int(h.tier, 1, 4)); need('url is https', /^https:\/\//.test(String(h.url)));
  need('nightly is a whole number', h.nightly == null || int(h.nightly, 1, 20000));
}

console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : `OK: ${moveIds.size} places, ${eventIds.size} events, ${hotelIds.size} hotels match their types`);
if (fails.length) process.exitCode = 1;
