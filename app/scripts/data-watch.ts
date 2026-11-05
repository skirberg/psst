// Weekly data watch (run by .github/workflows/data-watch.yml, or by hand: node app/scripts/data-watch.ts --report out.md).
// Picks stay hand-curated; this keeps them honest between curation passes.
//  1. Every upcoming event: reads schema.org eventStatus from its own pages, and asks the Ticketmaster Discovery API
//     when TICKETMASTER_KEY is set. A cancelled or postponed status from a structured source is written to
//     data/events.json (status + statusSource) and the app hides that event. Rescheduled dates are only reported.
//  2. Every place, event and hotel source link: reports the ones whose links are all dead.
//  3. Reports anything not re-checked in STALE_DAYS, and (with the Ticketmaster key) upcoming Miami shows that
//     psst does not have yet, as candidates for a human to judge. Nothing is added automatically.
// Network trouble never fails the run: a page that cannot be read is reported, never treated as a cancellation.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Hotel, Move, PsstEvent } from '../src/lib/types.ts';

// PSST_DATA_DIR points the watch at a scratch copy (used to test it without touching data/).
const ROOT = process.env.PSST_DATA_DIR ? pathToFileURL(process.env.PSST_DATA_DIR.replace(/\/?$/, '/')) : new URL('../../data/', import.meta.url);
const STALE_DAYS = 45;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const reportPath = process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1] : null;
const tmKey = process.env.TICKETMASTER_KEY || '';

const read = <T>(name: string): T[] => JSON.parse(readFileSync(new URL(`${name}.json`, ROOT), 'utf8')) as T[];
const events = read<PsstEvent>('events');
const moves = read<Move>('moves');
const hotels = read<Hotel & { sources?: string[]; verifiedOn?: string }>('hotels');

interface Page { status: number; html: string }
const pages = new Map<string, Promise<Page>>();
let active = 0;
const queue: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 6) await new Promise<void>((r) => queue.push(r));
  active++;
  try { return await fn(); } finally { active--; queue.shift()?.(); }
}
function page(url: string): Promise<Page> {
  let p = pages.get(url);
  if (!p) {
    p = slot(async () => {
      try {
        const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
        return { status: r.status, html: r.ok ? await r.text() : '' };
      } catch { return { status: 0, html: '' }; }
    });
    pages.set(url, p);
  }
  return p;
}
// 404 and 410 mean gone, 0 means DNS or connection failure. 403/406/429 are bot walls, so they count as unknown, not dead.
const dead = (s: number): boolean => s === 404 || s === 410 || s === 0;

interface LdEvent { name?: string; startDate?: string; eventStatus?: string }
function ldEvents(html: string): LdEvent[] {
  const out: LdEvent[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    const t = o['@type'];
    if ((Array.isArray(t) ? t : [t]).some((x) => typeof x === 'string' && /Event$/.test(x))) out.push(o as LdEvent);
    if (o['@graph']) walk(o['@graph']);
  };
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1].trim())); } catch { /* malformed JSON-LD is common; skip it */ }
  }
  return out;
}
const words = (s: string): Set<string> => new Set(s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
const overlap = (a: string, b: string): number => { const A = words(a), B = words(b); let n = 0; for (const w of A) if (B.has(w)) n++; return A.size ? n / A.size : 0; };
type Verdict = 'cancelled' | 'postponed' | 'rescheduled' | 'scheduled';
const fromLd = (s: string): Verdict | null => /Cancel/i.test(s) ? 'cancelled' : /Postpone/i.test(s) ? 'postponed' : /Reschedul/i.test(s) ? 'rescheduled' : /Scheduled/i.test(s) ? 'scheduled' : null;

interface TmEvent { name: string; url: string; dates: { start: { localDate: string; localTime?: string }; status?: { code: string } }; _embedded?: { venues?: { name: string }[] } }
async function tm(params: Record<string, string>): Promise<TmEvent[]> {
  if (!tmKey) return [];
  const q = new URLSearchParams({ apikey: tmKey, ...params });
  try {
    const r = await slot(() => fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${q}`, { signal: AbortSignal.timeout(20000) }));
    if (!r.ok) return [];
    const j = (await r.json()) as { _embedded?: { events?: TmEvent[] } };
    return j._embedded?.events ?? [];
  } catch { return []; }
}
const tmVerdict = (c?: string): Verdict | null => c === 'canceled' ? 'cancelled' : c === 'postponed' ? 'postponed' : c === 'rescheduled' ? 'rescheduled' : c ? 'scheduled' : null;

const lines: string[] = [];
const say = (s = ''): void => { lines.push(s); };
const upcoming = events.filter((e) => (e.endDate || e.date) >= today);
const changes: string[] = [], reschedules: string[] = [], unreadable: string[] = [];

await Promise.all(upcoming.map(async (e) => {
  const urls = [...new Set([e.url, ...e.sources].filter((u): u is string => !!u))];
  const found: { verdict: Verdict; source: string; when?: string }[] = [];
  for (const u of urls) {
    const p = await page(u);
    for (const ld of ldEvents(p.html)) {
      const v = fromLd(String(ld.eventStatus || ''));
      if (!v || !ld.startDate) continue;
      const d = ld.startDate.slice(0, 10);
      const inRange = d >= e.date && d <= (e.endDate || e.date);
      // A venue calendar lists many shows: only trust the one on this date whose name matches.
      // The event's own page (url) is about this event even when it now shows a new date.
      if ((inRange || u === e.url) && overlap(e.title.split(/[:(]/)[0], String(ld.name || '')) >= 0.5) found.push({ verdict: v, source: u, when: ld.startDate.slice(0, 16) });
    }
  }
  const head = e.title.split(/[:(\[]/)[0].trim();
  for (const t of await tm({ keyword: head, city: 'Miami', stateCode: 'FL', startDateTime: `${e.date}T00:00:00Z`, endDateTime: `${e.endDate || e.date}T23:59:59Z` })) {
    if (overlap(head, t.name) < 0.5) continue;
    const v = tmVerdict(t.dates.status?.code);
    if (v) found.push({ verdict: v, source: t.url, when: `${t.dates.start.localDate}T${(t.dates.start.localTime || '').slice(0, 5)}` });
  }
  const bad = found.find((f) => f.verdict === 'cancelled') || found.find((f) => f.verdict === 'postponed');
  if (bad && e.status !== bad.verdict) {
    e.status = bad.verdict as 'cancelled' | 'postponed';
    e.statusSource = bad.source;
    changes.push(`- **${e.title}** (${e.date}) marked **${bad.verdict}** and hidden. Source: ${bad.source}`);
  }
  // Sites keep the "rescheduled" label after the move is settled, so only report one whose date or time differs from ours.
  const ours = [e.time, e.doors].filter(Boolean);
  const moved = found.find((f) => f.verdict === 'rescheduled' && f.when && (f.when.slice(0, 10) !== e.date || (f.when.length > 11 && f.when.slice(11) && ours.length > 0 && !ours.includes(f.when.slice(11)))));
  if (moved) reschedules.push(`- **${e.title}** (psst says ${e.date} ${ours.join('/')}) is listed as rescheduled to ${moved.when?.replace('T', ' ')}. Check: ${moved.source}`);
  if (!found.length) {
    const st = await Promise.all(urls.map(async (u) => (await page(u)).status));
    if (st.every(dead)) unreadable.push(`- **${e.title}** (${e.date}): every source link is dead (${st.join(', ')})`);
  }
}));

// Places and hotels: dead links and age.
const deadPlaces: string[] = [], stale: string[] = [];
const ageDays = (d?: string): number => d ? Math.round((Date.parse(today) - Date.parse(d)) / 864e5) : Infinity;
await Promise.all([...moves.map((m) => ({ kind: 'Place', name: m.title, sources: m.sources, verifiedOn: m.verifiedOn })),
  ...hotels.map((h) => ({ kind: 'Hotel', name: h.name, sources: h.sources ?? [], verifiedOn: h.verifiedOn }))].map(async (r) => {
  if (r.sources.length) {
    const st = await Promise.all(r.sources.map(async (u) => (await page(u)).status));
    if (st.every(dead)) deadPlaces.push(`- ${r.kind} **${r.name}**: every source link is dead (${st.join(', ')}). It may have closed.`);
  }
  if (ageDays(r.verifiedOn) > STALE_DAYS) stale.push(`${r.name} (${r.verifiedOn ?? 'never'})`);
}));
for (const e of upcoming) if (ageDays(e.verifiedOn) > STALE_DAYS) stale.push(`${e.title} (${e.verifiedOn})`);

// Candidates: upcoming Miami music the API knows about that psst does not list.
const candidates: string[] = [];
if (tmKey) {
  const end = new Date(Date.parse(today) + 60 * 864e5).toISOString().slice(0, 10);
  const have = events.map((e) => e.title);
  const seen = new Set<string>();
  for (const t of await tm({ city: 'Miami', stateCode: 'FL', classificationName: 'Music', startDateTime: `${today}T00:00:00Z`, endDateTime: `${end}T23:59:59Z`, size: '100', sort: 'date,asc' })) {
    const key = t.name.toLowerCase();
    if (seen.has(key) || have.some((h) => overlap(t.name, h) >= 0.5)) continue;
    seen.add(key);
    candidates.push(`- ${t.dates.start.localDate} **${t.name}** at ${t._embedded?.venues?.[0]?.name ?? 'Miami'}: ${t.url}`);
  }
}

if (changes.length) writeFileSync(new URL('events.json', ROOT), JSON.stringify(events, null, 2) + '\n');

say(`Checked ${today}: ${upcoming.length} upcoming events, ${moves.length} places, ${hotels.length} hotels, ${pages.size} pages read.`);
say(tmKey ? 'Ticketmaster: on.' : 'Ticketmaster: off. Add a free key as the TICKETMASTER_KEY repository secret to turn on status checks and candidates.');
say();
say('### Changed automatically'); say(changes.length ? changes.join('\n') : 'Nothing. Every upcoming event still reads as on.');
say(); say('### Needs a look');
const look = [...reschedules, ...unreadable, ...deadPlaces];
say(look.length ? look.join('\n') : 'Nothing.');
say(); say(`### Not re-checked in ${STALE_DAYS} days (${stale.length})`); say(stale.length ? stale.join(', ') : 'Nothing.');
if (tmKey) { say(); say(`### Miami shows psst does not list, next 60 days (${candidates.length})`); say(candidates.slice(0, 40).join('\n') || 'None.'); }

const report = lines.join('\n');
if (reportPath) writeFileSync(reportPath, report + '\n');
console.log(report);
