// App state. Per-viewer bits (kept, went, unlocked, leans) persist in localStorage when available.
import { miamiNow, moves, events, rankNow, planStay, eventsBetween, openAt, hm, dowOf, rainAt, sunFor } from './core.js';
import { skyAt, phaseAt, lightness, sunShade, mixHex, textOn, INK, PAPER } from './sky.js';

const KEY = 'psst.v2';
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
const saved = load();
const TABS = ['today', 'trip', 'wall', 'stay', 'book'];
const hashTab = () => { try { const h = location.hash.slice(1); return TABS.includes(h) ? h : null; } catch { return null; } };
export const LEANS_PER_WEEK = 3;
const weekKey = (date) => { const d = new Date(date + 'T12:00:00Z'); const j = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return d.getUTCFullYear() + '-' + Math.ceil(((d - j) / 864e5 + j.getUTCDay() + 1) / 7); };
export const serialOf = (m) => moves.indexOf(m) + 1;
export const MOODS = [
  ['all', 'All', null], ['secret', 'Secret', 'secret'], ['drink', 'Drink', ['bar', 'speakeasy']], ['eat', 'Eat', ['food', 'market']],
  ['coffee', 'Coffee', ['coffee']], ['dance', 'Dance', ['music', 'nightlife']], ['outside', 'Outside', ['outdoors', 'water']], ['art', 'Art', ['art', 'shop']],
];

class AppState {
  tab = $state(hashTab() || 'today');
  now = $state(miamiNow());
  hour = $state(miamiNow().hour);
  following = $state(true);
  padIndex = $state(0);
  flipped = $state(null);
  selectedEvent = $state(null);
  where = $state(null);          // move id shown full-screen on the map
  whereHotel = $state(null);     // hotel id shown full-screen on the map
  stayFocus = $state(null);
  mood = $state('all');
  kept = $state(saved.kept || []);
  went = $state(saved.went || []);
  unlocked = $state(saved.unlocked || []);
  leanWeek = $state(saved.leanWeek || '');
  leansUsed = $state(saved.leansUsed || 0);
  heldEvents = $state(saved.heldEvents || []);
  bonusLeans = $state(saved.bonusLeans || 0);
  redeemed = $state(saved.redeemed || []);
  toast = $state('');

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
  padId = $state(null);
  pad = $derived.by(() => {
    const cats = MOODS.find((x) => x[0] === this.mood)?.[2];
    const list = this.ranked.filter((x) => !cats || (cats === 'secret' ? x.m.secret >= 1 || x.m.category === 'speakeasy' : cats.includes(x.m.category)));
    const open = [], sealed = [];
    for (const x of list) (x.m.secret === 2 && !this.unlocked.includes(x.m.id) ? sealed : open).push(x);
    const pad = open.slice(0, 8);
    if (sealed.length && (this.mood === 'all' || this.mood === 'secret' || this.mood === 'drink')) pad.splice(Math.min(2, pad.length), 0, { ...sealed[0], sealed: true });
    return pad.slice(0, 9);
  });
  padPos = $derived.by(() => { const i = this.pad.findIndex((x) => x.m.id === this.padId); return i >= 0 ? i : 0; });
  later = $derived.by(() => {
    const h = this.hour, ids = new Set(this.pad.map((x) => x.m.id));
    return moves
      .map((m) => { const b = hm(m.best); return { m, b, t: b + (b < h ? 24 : 0) }; })
      .filter((x) => !ids.has(x.m.id) && x.t > h + 1 && x.t < 24 && openAt(x.m, (this.dow + (x.t >= 24 ? 1 : 0)) % 7, x.b) && !(x.m.secret === 2 && !this.unlocked.includes(x.m.id)))
      .sort((a, b) => a.t - b.t)
      .filter((x, i, arr) => i === 0 || Math.floor(x.t) !== Math.floor(arr[i - 1].t))
      .slice(0, 8);
  });

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ kept: this.kept, went: this.went, unlocked: this.unlocked, leanWeek: this.leanWeek, leansUsed: this.leansUsed, heldEvents: this.heldEvents, bonusLeans: this.bonusLeans, redeemed: this.redeemed })); } catch {}
  }
  leansLeft() { return (this.leanWeek !== weekKey(this.now.date) ? LEANS_PER_WEEK : Math.max(0, LEANS_PER_WEEK - this.leansUsed)) + this.bonusLeans; }
  redeem(code) {
    code = code.trim().toUpperCase();
    if (!/^PINA-[A-Z2-9]{5}$/.test(code)) return 'bad';
    if (this.redeemed.includes(code)) return 'used';
    this.redeemed = [...this.redeemed, code]; this.bonusLeans += 1; this.persist(); return 'ok';
  }
  unlock(id) {
    if (this.unlocked.includes(id)) return true;
    const wk = weekKey(this.now.date);
    if (this.leanWeek !== wk) { this.leanWeek = wk; this.leansUsed = 0; }
    if (this.leansUsed >= LEANS_PER_WEEK) { if (this.bonusLeans <= 0) return false; this.bonusLeans -= 1; }
    else this.leansUsed += 1;
    this.unlocked = [...this.unlocked, id]; this.padId = id; this.persist(); return true;
  }
  toggle(list, id) { this[list] = this[list].includes(id) ? this[list].filter((x) => x !== id) : [...this[list], id]; this.persist(); }
  keep(id) { if (!this.kept.includes(id)) { this.kept = [...this.kept, id]; this.persist(); } }
  setTab(t) { this.tab = t; this.flipped = null; this.selectedEvent = null; this.where = null; this.whereHotel = null; try { history.replaceState(null, '', '#' + t); } catch {} }
  scrubTo(h, id = null) { this.hour = ((h % 24) + 24) % 24; this.following = false; this.padId = id; this.flipped = null; }
  backToNow() { this.following = true; this.hour = this.now.hour; this.padId = null; }
  say(msg) { this.toast = msg; clearTimeout(this._t); this._t = setTimeout(() => (this.toast = ''), 2600); }
}
export const app = new AppState();
// A friend's plan link carries ?code=PINA-XXXXX. Redeem it once on arrival.
export function codeFromUrl() {
  try {
    const u = new URL(location.href), code = u.searchParams.get('code');
    if (!code) return;
    const r = app.redeem(code);
    if (r === 'ok') app.say('+1 secret from a friend.');
    u.searchParams.delete('code'); history.replaceState(null, '', u.pathname + u.search + u.hash);
  } catch {}
}

// The visitor's stay. Inputs are state; the plan is derived from them. Inputs persist per viewer.
const tripSaved = (() => { try { return JSON.parse(localStorage.getItem('psst.trip.v1')) || {}; } catch { return {}; } })();
class TripState {
  start = $state(tripSaved.start || '2026-11-20');
  end = $state(tripSaved.end || '2026-11-24');
  arrive = $state(tripSaved.arrive ?? 15);
  depart = $state(tripSaved.depart ?? 13);
  wild = $state(tripSaved.wild ?? 0.65);
  anchors = $state(tripSaved.anchors || events.filter((e) => e.id.includes('john-summit')).map((e) => e.id));
  swaps = $state({});
  focusDay = $state(0);
  inRange = $derived(this.end >= this.start ? eventsBetween(this.start, this.end) : []);
  days = $derived(this.end >= this.start ? planStay({ start: this.start, end: this.end, arrive: this.arrive, depart: this.depart, wild: this.wild, anchors: this.inRange.filter((e) => this.anchors.includes(e.id)), swaps: this.swaps }) : []);
  swap(date, key) { const k = `${date}:${key}`; this.swaps = { ...this.swaps, [k]: (this.swaps[k] || 0) + 1 }; }
  toggleAnchor(id) { this.anchors = this.anchors.includes(id) ? this.anchors.filter((x) => x !== id) : [...this.anchors, id]; this.persist(); }
  persist() { try { localStorage.setItem('psst.trip.v1', JSON.stringify({ start: this.start, end: this.end, arrive: this.arrive, depart: this.depart, wild: this.wild, anchors: this.anchors })); } catch {} }
}
export const trip = new TripState();
