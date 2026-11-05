// App state. Per-viewer bits (kept, went, unlocked) persist in localStorage when available.
import { track } from '@vercel/analytics';
import { replaceState } from '$app/navigation';
import { miamiNow, moves, events, rankNow, planStay, eventsBetween, openAt, hm, dowOf, rainAt, sunFor, addDays, km } from './core';
import { skyAt, phaseAt, sunShade, mixHex, textOn, PAPER } from './sky';
import type { Move, Ranked, ISODate, LatLng } from './types';

interface Saved { kept?: string[]; went?: string[]; unlocked?: string[]; heldEvents?: string[] }
interface TripSaved { start?: ISODate; end?: ISODate; arrive?: number; depart?: number; wild?: number; anchors?: string[] }
export type Tab = 'today' | 'trip' | 'wall' | 'stay' | 'book';
export type Mood = 'all' | 'secret' | 'drink' | 'eat' | 'coffee' | 'dance' | 'outside' | 'art';
export type PadItem = Ranked & { sealed?: boolean };

const KEY = 'psst.v2';
function load(): Saved { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch { return {}; } }
const saved = load();
const TABS: Tab[] = ['today', 'trip', 'wall', 'stay', 'book'];
const hashTab = (): Tab | null => { try { const h = location.hash.slice(1) as Tab; return TABS.includes(h) ? h : null; } catch { return null; } };
// Miami's middle, and how far out still counts as being here (Homestead to Aventura, the beaches, the Keys bridge).
const MIAMI: LatLng = { lat: 25.77, lng: -80.2 };
const NEAR_KM = 45;
export const MOODS: [Mood, string, string[] | 'secret' | null][] = [
  ['all', 'All', null], ['secret', 'Secret', 'secret'], ['drink', 'Drink', ['bar', 'speakeasy']], ['eat', 'Eat', ['food', 'market']],
  ['coffee', 'Coffee', ['coffee']], ['dance', 'Dance', ['music', 'nightlife']], ['outside', 'Outside', ['outdoors', 'water']], ['art', 'Art', ['art', 'shop']],
];

class AppState {
  tab = $state<Tab>(hashTab() || 'today');
  now = $state(miamiNow());
  hour = $state(miamiNow().hour);
  following = $state(true);
  padIndex = $state(0);
  flipped = $state<string | null>(null);
  selectedEvent = $state<string | null>(null);
  where = $state<string | null>(null);          // move id shown full-screen on the map
  whereHotel = $state<string | null>(null);     // hotel id shown full-screen on the map
  stayFocus = $state<string | null>(null);
  stayTier = $state<0 | 1 | 2 | 3 | 4>(0);            // Stay price filter, shared by the rack and the map
  mood = $state<Mood>('all');
  kept = $state<string[]>(saved.kept || []);
  went = $state<string[]>(saved.went || []);
  unlocked = $state<string[]>(saved.unlocked || []);
  heldEvents = $state<string[]>(saved.heldEvents || []);
  toast = $state('');
  // Where the viewer is, only after they tap Near me (or already allowed it). Never stored, never sent anywhere.
  here = $state<LatLng | null>(null);
  locating = $state(false);
  inMiami = $derived(!!this.here && km(this.here, MIAMI) <= NEAR_KM);

  sun = $derived(sunFor(this.now.date));
  sky = $derived(skyAt(this.hour, this.now.date));
  phase = $derived(phaseAt(this.hour, this.sun));
  text = $derived(textOn(this.sky));
  dark = $derived(this.text === PAPER);
  shade = $derived(sunShade(this.now.date, this.hour, mixHex(this.sky, '#052739', this.dark ? 0.5 : 0.38)));
  dow = $derived(dowOf(this.now.date));
  wet = $derived(rainAt(this.now.date, this.hour) >= 50);

  qHour = $derived(Math.floor(this.hour * 4) / 4);
  ranked = $derived(rankNow({ dow: this.dow, h: this.qHour, date: this.now.date, band: 'all', rainSafe: this.wet }));
  padId = $state<string | null>(null);
  // The pad never runs out: everything good right now (closest first when you're in Miami),
  // then the rest of the day in the order it gets good, then round again.
  pad = $derived.by((): PadItem[] => {
    const cats = MOODS.find((x) => x[0] === this.mood)?.[2];
    const fits = (m: Move): boolean => !cats || (cats === 'secret' ? m.secret === 2 || m.category === 'speakeasy' : cats.includes(m.category));
    const here = this.inMiami ? this.here : null;
    const near = (x: Ranked): number => (here ? x.s * (0.3 + 0.7 * Math.exp(-km(here, x.m) / 5)) : x.s);
    const list = this.ranked.filter((x) => fits(x.m)).map((x) => ({ ...x, s: near(x) })).sort((a, b) => b.s - a.s);
    const open: PadItem[] = [], sealed: PadItem[] = [];
    for (const x of list) (x.m.secret === 2 && !this.unlocked.includes(x.m.id) ? sealed : open).push(x);
    const pad: PadItem[] = [...open];
    if (sealed.length && (this.mood === 'all' || this.mood === 'secret' || this.mood === 'drink')) pad.splice(Math.min(2, pad.length), 0, { ...sealed[0], sealed: true });
    const h = this.qHour, seen = new Set(pad.map((x) => x.m.id));
    const rest = moves
      .filter((m) => !seen.has(m.id) && fits(m) && !(m.secret === 2 && !this.unlocked.includes(m.id)))
      .map((m) => ({ m, s: 0, open: false, soon: null, t: (hm(m.best) - h + 24) % 24 }))
      // A best hour already past today means tonight after midnight or tomorrow: check that day's hours, and the rain then.
      .filter((x) => { const b = hm(x.m.best), day = h + x.t >= 24 ? (this.dow + 1) % 7 : this.dow; return openAt(x.m, day, b) && (x.m.rainOk || h + x.t >= 24 || rainAt(this.now.date, b) < 50); })
      .sort((a, b) => a.t - b.t)
      .map(({ t: _t, ...x }): PadItem => x);
    return [...pad, ...rest];
  });
  // Minutes from where you are: walking when it's close (4.8 km/h), otherwise city driving (about 25 km/h, plus 8 minutes to get going and park; the two meet at 0.8 km, so a farther place never reads faster).
  awayFrom(p: LatLng): string | null {
    if (!this.inMiami || !this.here) return null;
    const d = km(this.here, p);
    return d < 0.8 ? `${Math.max(1, Math.round((d / 4.8) * 60))} min walk` : `${Math.round(8 + (d / 25) * 60)} min away`;
  }
  locate(ask = true): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation || this.locating) return;
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        this.locating = false; this.here = { lat: p.coords.latitude, lng: p.coords.longitude }; if (ask) { this.padId = null; this.flipped = null; }
        if (ask) { this.say(this.inMiami ? 'Closest first.' : 'You’re not in Miami yet. Here’s the whole city.'); track('Located', { inMiami: String(this.inMiami) }); }
      },
      () => { this.locating = false; if (ask) this.say('Location is off. Here’s the whole city.'); },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }
  padPos = $derived.by(() => { const i = this.pad.findIndex((x) => x.m.id === this.padId); return i >= 0 ? i : 0; });
  later = $derived.by(() => {
    const h = this.hour, ids = new Set(this.ranked.filter((x) => x.open).map((x) => x.m.id));
    // On a show day, nothing that clashes with the show (an hour before doors to four after).
    const shows = trip.days.find((d) => d.date === this.now.date)?.slots.filter((s) => s.event && ['concert', 'sports', 'club'].includes(s.event.category)).map((s) => s.at) ?? [];
    return moves
      .map((m) => { const b = hm(m.best); return { m, b, t: b + (b < h ? 24 : 0) }; })
      .filter((x) => !ids.has(x.m.id) && x.t > h + 1 && x.t < 24 && openAt(x.m, (this.dow + (x.t >= 24 ? 1 : 0)) % 7, x.b) && !(x.m.secret === 2 && !this.unlocked.includes(x.m.id)))
      .filter((x) => !shows.some((st) => x.t >= st - 1 && x.t < st + 4))
      .sort((a, b) => a.t - b.t)
      .filter((x, i, arr) => i === 0 || Math.floor(x.t) !== Math.floor(arr[i - 1].t))
      .slice(0, 8);
  });

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ kept: this.kept, went: this.went, unlocked: this.unlocked, heldEvents: this.heldEvents })); } catch {}
  }
  unlock(id: string): boolean {
    if (this.unlocked.includes(id)) return true;
    this.unlocked = [...this.unlocked, id]; this.padId = id; this.persist(); track('Secret unlocked'); return true;
  }
  toggle(list: 'kept' | 'went' | 'unlocked' | 'heldEvents', id: string): void { this[list] = this[list].includes(id) ? this[list].filter((x) => x !== id) : [...this[list], id]; this.persist(); }
  keep(id: string): void { if (!this.kept.includes(id)) { this.kept = [...this.kept, id]; this.persist(); track('Move kept'); } }
  setTab(t: Tab, source = 'tabbar'): void { if (t !== this.tab && /^[a-z]{1,16}$/.test(t)) track('Tab opened', { tab: t, source }); this.tab = t; this.flipped = null; this.selectedEvent = null; this.where = null; this.whereHotel = null; try { replaceState('#' + t, {}); } catch { try { history.replaceState(null, '', '#' + t); } catch {} } } // native only before SvelteKit's router starts (a shared link at load)
  scrubTo(h: number, id: string | null = null): void { this.hour = ((h % 24) + 24) % 24; this.following = false; this.padId = id; this.flipped = null; }
  backToNow() { this.following = true; this.hour = this.now.hour; this.padId = null; }
  private _t: ReturnType<typeof setTimeout> | undefined;
  say(msg: string): void { this.toast = msg; clearTimeout(this._t); this._t = setTimeout(() => (this.toast = ''), 2600); }
}
export const app = new AppState();
// A friend's plan link carries the stay as &trip=START_END&a=EVENT_IDS (older links also carry ?code=, now ignored).
// Open the friend's dates only if this viewer has no trip of their own.
export function codeFromUrl() {
  try {
    const u = new URL(location.href), code = u.searchParams.get('code'), span = u.searchParams.get('trip');
    if (!code && !span) return;
    let msg = '';
    // ?trip=summit is the John Summit weekend, both nights.
    const summit = span === 'summit';
    const m = summit ? [span, '2026-11-20', '2026-11-24'] : span?.match(/^(\d{4}-\d\d-\d\d)_(\d{4}-\d\d-\d\d)$/);
    const real = (d: string): boolean => { try { return addDays(d, 0) === d; } catch { return false; } };
    // Same bounds as the date inputs: real dates, from today, through Dec 31.
    if (m && real(m[1]) && real(m[2]) && m[2] >= m[1] && m[1] >= app.now.date && m[2] <= '2026-12-31' && !trip.saved) {
      const ids = summit ? events.filter((e) => e.id.includes('john-summit')).map((e) => e.id) : (u.searchParams.get('a') || '').split(',').filter((id) => events.some((e) => e.id === id));
      trip.start = m[1]; trip.end = m[2]; trip.anchors = ids; trip.persist();
      app.setTab('trip', 'link'); msg = 'Your friend\'s plan.';
    }
    if (msg) app.say(msg);
    for (const k of ['code', 'trip', 'a']) u.searchParams.delete(k);
    history.replaceState(null, '', u.pathname + u.search + location.hash);
  } catch {}
}

// The visitor's stay. Inputs are state; the plan is derived from them. Inputs persist per viewer.
// A stranger starts with no dates; a friend's link (?trip=summit, or ?trip=START_END&a=IDS) fills them in.
const tripSaved: TripSaved = (() => { try { return JSON.parse(localStorage.getItem('psst.trip.v1') || 'null') || {}; } catch { return {}; } })();
class TripState {
  saved = !!tripSaved.start; // this viewer has set a trip before
  start = $state<ISODate>(tripSaved.start || '');
  end = $state<ISODate>(tripSaved.end || '');
  arrive = $state(tripSaved.arrive ?? 15);
  depart = $state(tripSaved.depart ?? 13);
  wild = $state(tripSaved.wild ?? 0.65);
  anchors = $state<string[]>(tripSaved.anchors || []);
  swaps = $state<Record<string, number>>({});
  focusDay = $state(0);
  hasDates = $derived(!!this.start && !!this.end && this.end >= this.start);
  inRange = $derived(this.hasDates ? eventsBetween(this.start, this.end) : []);
  days = $derived(this.hasDates ? planStay({ start: this.start, end: this.end, arrive: this.arrive, depart: this.depart, wild: this.wild, anchors: this.inRange.filter((e) => this.anchors.includes(e.id)), swaps: this.swaps, kept: app.kept }) : []);
  swap(date: ISODate, key: string): void { const k = `${date}:${key}`; this.swaps = { ...this.swaps, [k]: (this.swaps[k] || 0) + 1 }; }
  toggleAnchor(id: string): void { this.anchors = this.anchors.includes(id) ? this.anchors.filter((x) => x !== id) : [...this.anchors, id]; this.persist(); }
  persist() { this.saved = true; try { localStorage.setItem('psst.trip.v1', JSON.stringify({ start: this.start, end: this.end, arrive: this.arrive, depart: this.depart, wild: this.wild, anchors: this.anchors })); } catch {} }
}
export const trip = new TripState();
