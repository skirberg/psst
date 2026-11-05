// Keeps psst's events running with no one at the keyboard (run by .github/workflows/data-watch.yml, or by hand:
// node app/scripts/events-refresh.ts --report out.md [--dry]).
//  1. Reads the venues' own public calendars: Club Space's events.json (Terrace, The Ground, Floyd) and the
//     WordPress events API of the Miami Beach Bandshell, Ball & Chain and The Bass.
//  2. Adds upcoming shows psst does not have yet. Facts (title, date, time, venue, price, link) come only from
//     the feed. With ANTHROPIC_API_KEY set, Claude picks the ones that fit psst and writes the one-line "why";
//     without it, a fixed rule keeps the clear fits (Space's Terrace and Ground, the Bandshell) with a plain
//     factual line, so the calendar never runs dry.
//  3. A feed event that disappears from its feed (while the feed still covers its date) is marked cancelled.
//  4. Events that ended more than 30 days ago are dropped from the file.
// A feed that cannot be read is skipped and reported; it never removes anything.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import type { EventCategory, HHMM, ISODate, PsstEvent } from '../src/lib/types.ts';

const ROOT = process.env.PSST_DATA_DIR ? pathToFileURL(process.env.PSST_DATA_DIR.replace(/\/?$/, '/')) : new URL('../../data/', import.meta.url);
const FILE = new URL('events.json', ROOT);
const HORIZON_DAYS = 75; // how far ahead to keep the calendar filled
const MAX_NEW = 30; // per run, so one bad feed day cannot flood the app
const KEEP_PAST_DAYS = 30;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const dry = process.argv.includes('--dry');
const reportPath = process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1] : null;
const TZ = 'America/New_York';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()) as ISODate;
const addDays = (d: string, n: number): ISODate => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10) as ISODate;
const horizon = addDays(today, HORIZON_DAYS);

interface Venue { venue: string; address: string; hood: string; lat: number; lng: number }
const SPACE = { address: '34 NE 11th St, Miami, FL 33132', hood: 'Downtown', lat: 25.784555, lng: -80.193153 };
const VENUES: Record<string, Venue> = {
  Terrace: { venue: 'Club Space (Terrace)', ...SPACE },
  'The Ground': { venue: 'The Ground (Club Space)', ...SPACE },
  Floyd: { venue: 'Floyd (Club Space)', ...SPACE },
  'Full building': { venue: 'Club Space', ...SPACE },
  bandshell: { venue: 'Miami Beach Bandshell', address: '7275 Collins Ave, Miami Beach, FL 33141', hood: 'North Beach', lat: 25.858123, lng: -80.120481 },
  ballandchain: { venue: 'Ball & Chain', address: '1513 SW 8th St, Miami, FL 33135', hood: 'Little Havana', lat: 25.765889, lng: -80.2197791 },
  bass: { venue: 'The Bass', address: '2100 Collins Ave, Miami Beach, FL 33139', hood: 'Miami Beach', lat: 25.7975852, lng: -80.1301531 },
};

interface Candidate {
  feed: string; // name:id
  title: string; date: ISODate; time?: HHMM; doors?: HHMM;
  where: Venue; category: EventCategory; energy: number;
  price?: string; url: string; sources: string[];
  about: string; // feed text the picker reads; never shown as-is
  ruleFit: boolean; // kept without an API key
  plainWhy: string;
}

// No dashes in psst copy: in titles a dash becomes a colon, in sentences a comma.
const clean = (s: string, dash = ','): string => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#0?38;|&amp;/g, '&').replace(/\s*(&#8211;|&#8212;|&ndash;|&mdash;|[\u2013\u2014])\s*/g, dash === ':' ? ': ' : ', ').replace(/&#8217;|&rsquo;/g, "'")
  .replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
  .replace(/\s+/g, ' ').replace(/\s+([,.:!?])/g, '$1').trim();
const local = (iso: string): { date: ISODate; time: HHMM } => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const g = (t: string): string => p.find((x) => x.type === t)?.value ?? '';
  return { date: `${g('year')}-${g('month')}-${g('day')}` as ISODate, time: `${g('hour')}:${g('minute')}` as HHMM };
};
const slug = (s: string): string => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const words = (s: string): Set<string> => new Set(s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
const overlap = (a: string, b: string): number => { const A = words(a), B = words(b); let n = 0; for (const w of A) if (B.has(w)) n++; return A.size ? n / A.size : 0; };
const firstSentence = (s: string, max = 150): string => {
  const parts = clean(s).split(/(?<=[.!?])\s/);
  let t = parts[0] ?? '';
  if (t.length < 30 && parts[1]) t += ' ' + parts[1];
  return t.length > max ? t.slice(0, t.lastIndexOf(' ', max)).replace(/[,;:]$/, '') + '.' : t;
};
// Titles that say the show is off, and listings that are not a night out.
const OFF = /\b(cancel+ed|postponed)\b/i;
const FILLER = /\b(kids?|family|families|camp|cleanup|clean-up|workshop|class|classes|tour|members?|private|babies|toddlers?|open studio|yoga)\b/i;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

// ---- Feeds -------------------------------------------------------------------------------------------------
interface FeedResult { name: string; ok: boolean; covers: ISODate | null; items: Candidate[] }

interface SpaceShow { id: string; type: string; title: string; artists: { name: string }[]; room: string; age?: string; start: string; doors?: string; price?: string; status: string; url: string; description?: string }
async function clubSpace(): Promise<FeedResult> {
  const src = 'https://www.clubspace.com/events.json';
  const j = await getJson<{ events: SpaceShow[] }>(src);
  if (!j?.events?.length) return { name: 'clubspace', ok: false, covers: null, items: [] };
  const items: Candidate[] = [];
  let covers: ISODate | null = null;
  for (const s of j.events) {
    const where = VENUES[s.room];
    if (!where || s.type === 'pass') continue;
    const d = local(s.doors || s.start);
    if (!covers || d.date > covers) covers = d.date;
    const artists = s.artists.map((a) => a.name).filter(Boolean);
    if (OFF.test(s.title)) continue;
    const room = s.room === 'Full building' ? 'across every room at Space' : s.room === 'Terrace' ? "on Space's Terrace" : s.room === 'Floyd' ? 'at Floyd, upstairs at Space' : "in The Ground, Space's downstairs room";
    const who = artists.length ? artists.map((a) => a.trim()).slice(0, 3).join(', ') + (artists.length > 3 ? ' and more' : '') : clean(s.title);
    items.push({
      feed: `clubspace:${s.id}`, title: clean(s.title, ':'), date: d.date, doors: d.time, where, category: 'club',
      energy: s.room === 'Terrace' || s.room === 'Full building' ? 5 : 4,
      price: s.status === 'sold-out' ? 'Sold out' : s.price ? `from ${s.price}` : undefined,
      url: s.url, sources: ['https://www.clubspace.com/shows', src],
      about: `${s.room}. Artists: ${artists.join(', ') || 'TBA'}. ${s.age ?? ''} ${clean(s.description ?? '').slice(0, 300)}`,
      ruleFit: (s.room === 'Terrace' || s.room === 'The Ground' || s.room === 'Full building') && !/^tba$/i.test(s.title.trim()),
      plainWhy: `${who} ${room}. Doors ${fmt(d.time)}${s.age ? `, ${s.age}` : ''}.`,
    });
  }
  return { name: 'clubspace', ok: true, covers, items };
}

interface TribeEvent { id: number; title: string; url: string; start_date: string; all_day: boolean; cost?: string; description?: string; excerpt?: string; categories?: { name: string }[] }
async function tribe(name: string, base: string, venueKey: string, category: EventCategory, energy: number, rule: (e: TribeEvent) => boolean): Promise<FeedResult> {
  const items: Candidate[] = [];
  let covers: ISODate | null = null;
  let url: string | null = `${base}/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}&end_date=${horizon}`;
  let ok = false;
  for (let page = 0; url && page < 6; page++) {
    const j: { events: TribeEvent[]; next_rest_url?: string } | null = await getJson(url);
    if (!j?.events) break;
    ok = true;
    for (const e of j.events) {
      if (OFF.test(e.title)) continue;
      const date = e.start_date.slice(0, 10) as ISODate;
      if (!covers || date > covers) covers = date;
      const time = e.all_day ? undefined : (e.start_date.slice(11, 16) as HHMM);
      const cats = (e.categories ?? []).map((c) => clean(c.name)).join(', ');
      items.push({
        feed: `${name}:${e.id}-${date}`, title: clean(e.title, ':'), date, time, where: VENUES[venueKey], category, energy,
        price: e.cost ? clean(e.cost) : undefined, url: e.url, sources: [e.url, `${base}/events/`],
        about: `${cats ? `Categories: ${cats}. ` : ''}${clean(e.excerpt || e.description || '').slice(0, 400)}`,
        ruleFit: rule(e) && !FILLER.test(`${e.title} ${cats} ${firstSentence(e.excerpt || e.description || '')}`), plainWhy: firstSentence(e.excerpt || e.description || '') || `${clean(e.title)} at ${VENUES[venueKey].venue}.`,
      });
    }
    url = j.next_rest_url ?? null;
  }
  return { name, ok, covers: ok ? (covers ?? horizon) : null, items };
}
function fmt(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

// ---- Picking ----------------------------------------------------------------------------------------------
interface Pick { feed: string; why: string; energy: number }
async function pickWithClaude(cands: Candidate[], examples: PsstEvent[]): Promise<Pick[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || !cands.length) return null;
  const client = new Anthropic();
  const system = `You curate events for psst., a Miami guide whose promise is "the right move at the right hour". It is for people who want the non-obvious, good version of a night: the DJ worth staying up for, the band too left-field for an arena, the free concert under the stars. It skips filler: kids' programs, recurring daily house sets, tours, member-only events, private events, anything that reads like a listing nobody would text a friend about.

Write each "why" as one or two short sentences, at most 140 characters, in psst's voice: specific, dry, insider, no hype words, no exclamation marks, no emoji, no dashes of any kind. Say what makes the night worth it. Only use facts present in the candidate text; never invent a genre, an origin, or a detail you were not given.

Here is how psst writes:
${examples.map((e) => `- ${e.title} (${e.venue}): ${e.why}`).join('\n')}`;
  const list = cands.map((c) => ({ feed: c.feed, title: c.title, date: c.date, venue: c.where.venue, time: c.time ?? c.doors, price: c.price, about: c.about }));
  try {
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { picks: { type: 'array', items: { type: 'object', properties: { feed: { type: 'string' }, why: { type: 'string' }, energy: { type: 'integer' } }, required: ['feed', 'why', 'energy'], additionalProperties: false } } },
            required: ['picks'], additionalProperties: false,
          },
        },
      },
      system,
      messages: [{ role: 'user', content: `Pick the events psst should list, at most ${MAX_NEW}, and skip the rest. Energy is 1 (calm) to 5 (all night). Candidates:\n${JSON.stringify(list)}` }],
    });
    if (res.stop_reason === 'refusal') { console.warn('picker: refused, using the rule'); return null; }
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const out = JSON.parse(text) as { picks: Pick[] };
    const known = new Set(cands.map((c) => c.feed));
    return out.picks.filter((p) => known.has(p.feed) && p.why.trim()).map((p) => ({ ...p, why: clean(p.why).slice(0, 180), energy: Math.min(5, Math.max(1, Math.round(p.energy))) }));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) console.warn('picker: ANTHROPIC_API_KEY was rejected, using the rule');
    else if (e instanceof Anthropic.RateLimitError) console.warn('picker: rate limited, using the rule');
    else if (e instanceof Anthropic.APIError) console.warn(`picker: API error ${e.status}, using the rule`);
    else console.warn(`picker: ${(e as Error).message}, using the rule`);
    return null;
  }
}

// ---- Run ---------------------------------------------------------------------------------------------------
const events = JSON.parse(readFileSync(FILE, 'utf8')) as PsstEvent[];
const feeds = await Promise.all([
  clubSpace(),
  tribe('bandshell', 'https://www.miamibeachbandshell.com', 'bandshell', 'concert', 3, (e) => !(e.categories ?? []).some((c) => /kids/i.test(c.name))),
  tribe('ballandchain', 'https://ballandchainmiami.com', 'ballandchain', 'concert', 3, () => false),
  tribe('bass', 'https://thebass.org', 'bass', 'art', 2, () => false),
]);

const lines: string[] = [];
const added: string[] = [], cancelled: string[] = [];
// Cancelled: a feed event that left a feed which still covers its date.
for (const f of feeds) {
  if (!f.ok || !f.covers) continue;
  const live = new Set(f.items.map((c) => c.feed));
  for (const e of events) {
    if (!e.feed?.startsWith(f.name + ':') || e.status || e.date < today || e.date > f.covers) continue;
    if (!live.has(e.feed)) {
      e.status = 'cancelled';
      e.statusSource = f.items[0]?.sources[1] ?? f.items[0]?.url ?? 'https://psst.miami';
      cancelled.push(`- **${e.title}** (${e.date}) left the ${f.name} feed, so it is hidden.`);
    }
  }
}
// New: upcoming, inside the horizon, not already listed (by feed id, or same venue and day with a matching name).
// Within a day either side: feeds sometimes keep the old listing of a show that moved by a night.
const near = (a: string, b: string): boolean => Math.abs(Date.parse(a) - Date.parse(b)) <= 864e5;
const have = (c: Candidate): boolean => events.some((e) => e.feed === c.feed
  || (near(e.date, c.date) && Math.abs(e.lat - c.where.lat) < 0.001 && Math.abs(e.lng - c.where.lng) < 0.001 && (overlap(c.title, e.title) >= 0.5 || overlap(e.title, c.title) >= 0.5)));
const fresh: Candidate[] = [];
for (const c of feeds.flatMap((f) => f.items)) {
  if (c.date < today || c.date > horizon || have(c)) continue;
  if (fresh.some((x) => x.where.venue === c.where.venue && near(x.date, c.date) && Math.max(overlap(x.title, c.title), overlap(c.title, x.title)) >= 0.8)) continue;
  fresh.push(c);
}
const examples = events.filter((e) => e.why && !e.feed).slice(0, 14);
const picked = await pickWithClaude(fresh, examples);
const mode = picked ? 'Claude picked' : 'rule picked';
const chosen: { c: Candidate; why: string; energy: number }[] = picked
  ? picked.map((p) => { const c = fresh.find((x) => x.feed === p.feed)!; return { c, why: p.why, energy: p.energy }; })
  : fresh.filter((c) => c.ruleFit).map((c) => ({ c, why: c.plainWhy, energy: c.energy }));
const ids = new Set(events.map((e) => e.id));
for (const { c, why, energy } of chosen.sort((a, b) => a.c.date.localeCompare(b.c.date)).slice(0, MAX_NEW)) {
  let id = `${slug(c.title)}-${slug(c.where.venue).slice(0, 20)}-${c.date}`.replace(/-+/g, '-');
  while (ids.has(id)) id += '-x';
  ids.add(id);
  const e: PsstEvent = {
    id, title: c.title, date: c.date, venue: c.where.venue, address: c.where.address, hood: c.where.hood,
    lat: c.where.lat, lng: c.where.lng, category: c.category, url: c.url, why, energy,
    sources: [...new Set(c.sources)], verifiedOn: today, feed: c.feed,
  };
  if (c.price) e.price = c.price;
  if (c.time) e.time = c.time;
  if (c.doors) e.doors = c.doors;
  events.push(e);
  added.push(`- ${c.date} **${c.title}** at ${c.where.venue}: ${why}`);
}
// Drop what ended long ago.
const cutoff = addDays(today, -KEEP_PAST_DAYS);
const kept = events.filter((e) => (e.endDate || e.date) >= cutoff);
const dropped = events.length - kept.length;
kept.sort((a, b) => (a.date + (a.time || a.doors || '')).localeCompare(b.date + (b.time || b.doors || '')) || a.id.localeCompare(b.id));

const changed = added.length || cancelled.length || dropped;
if (changed && !dry) writeFileSync(FILE, JSON.stringify(kept, null, 2) + '\n');

const upcoming = kept.filter((e) => !e.status && (e.endDate || e.date) >= today);
const lastDay = upcoming.map((e) => e.endDate || e.date).sort().at(-1) ?? 'none';
lines.push(`### Events refresh`);
lines.push(`Feeds: ${feeds.map((f) => `${f.name} ${f.ok ? `${f.items.length} shows` : 'unreadable'}`).join(', ')}. ${mode}${process.env.ANTHROPIC_API_KEY ? '' : ' (add an ANTHROPIC_API_KEY secret to let Claude choose and write them)'}.`);
lines.push(`Added ${added.length}, hid ${cancelled.length} cancelled, dropped ${dropped} long past. psst now lists ${upcoming.length} upcoming events, through ${lastDay}.${dry ? ' Dry run: nothing written.' : ''}`);
if (added.length) lines.push('', ...added);
if (cancelled.length) lines.push('', ...cancelled);
const unreadable = feeds.filter((f) => !f.ok).map((f) => f.name);
if (unreadable.length) lines.push('', `Could not read: ${unreadable.join(', ')}. Nothing was removed because of it.`);
const report = lines.join('\n');
console.log(report);
if (reportPath) appendFileSync(reportPath, report + '\n\n');
