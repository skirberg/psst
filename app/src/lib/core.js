// Core logic: Miami time, sun, opening hours, ranking, weather lookup, stay planning.
import movesRaw from './moves.json';
import eventsRaw from './events.json';
import weather from './weather.json';

export const TZ = 'America/New_York';
export const MIAMI = { lat: 25.7617, lng: -80.1918 };

export const moves = movesRaw.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
export const events = eventsRaw
  .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))
  .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
export { weather };

export const hm = (s) => { if (!s) return 0; const [h, m] = s.split(':').map(Number); return h + (m || 0) / 60; };
export const fmtHour = (h, compact = false) => {
  h = ((h % 24) + 24) % 24;
  let H = Math.floor(h), M = Math.round((h - H) * 60);
  if (M === 60) { H = (H + 1) % 24; M = 0; }
  const ap = H < 12 ? 'am' : 'pm', h12 = H % 12 === 0 ? 12 : H % 12;
  if (compact && M === 0) return h12 + ap;
  return `${h12}:${String(M).padStart(2, '0')}${ap}`;
};

// --- Miami clock -------------------------------------------------------
export function miamiNow() {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value;
  const dows = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: (+g('hour') % 24) + +g('minute') / 60, dow: dows[g('weekday')] };
}
export const dowOf = (date) => new Date(date + 'T12:00:00Z').getUTCDay();
export const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daySpan = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
export const fmtDate = (date, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

// --- Sun ---------------------------------------------------------------
function miamiHourOf(d) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(d);
  return (+p.find((x) => x.type === 'hour').value % 24) + +p.find((x) => x.type === 'minute').value / 60;
}
export function sunFor(date) {
  const fc = weather.days.find((d) => d.date === date);
  if (fc) return { rise: hm(fc.sunrise), set: hm(fc.sunset), source: 'forecast' };
  const [y, m, d] = date.split('-').map(Number);
  const rad = Math.PI / 180, J = Date.UTC(y, m - 1, d, 17) / 864e5 + 2440587.5;
  const n = Math.round(J - 2451545.0 + 0.0008), Js = n - MIAMI.lng / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const sd = Math.sin(L * rad) * Math.sin(23.4397 * rad), cd = Math.cos(Math.asin(sd));
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(MIAMI.lat * rad) * sd) / (Math.cos(MIAMI.lat * rad) * cd)) / rad;
  const toD = (Jd) => new Date((Jd - 2440587.5) * 864e5);
  return { rise: miamiHourOf(toD(Jt - w / 360)), set: miamiHourOf(toD(Jt + w / 360)), source: 'calc' };
}

// Sky phase 0 (deep night) .. 1 (full day), smooth around sunrise/sunset.
export function daylight(h, sun) {
  const ramp = (x) => Math.min(1, Math.max(0, x));
  if (h < 12) return ramp((h - sun.rise + 0.6) / 1.4);
  return ramp((sun.set + 0.7 - h) / 1.4);
}

// --- Weather -----------------------------------------------------------
const WMO = (c) => (c >= 95 ? 'storms' : c >= 80 ? 'showers' : c >= 61 ? 'rain' : c >= 51 ? 'drizzle' : c >= 45 ? 'fog' : c >= 3 ? 'cloudy' : c >= 1 ? 'some clouds' : 'clear');
export function weatherFor(date) {
  const fc = weather.days.find((d) => d.date === date);
  if (fc) return { kind: 'forecast', hi: fc.hi, lo: fc.lo, rain: fc.rain, sky: WMO(fc.code), uv: fc.uv, hourly: weather.hourly[date] };
  const t = weather.typical[date.slice(5)];
  if (t) return { kind: 'typical', hi: t.hi, lo: t.lo, rain: t.wet, sky: 'typical' };
  return null;
}
export const rainAt = (date, h) => { const w = weatherFor(date); return w?.hourly ? w.hourly[Math.floor(h) % 24]?.[1] ?? w.rain : w?.rain ?? 0; };

// --- Opening hours -----------------------------------------------------
export function openAt(m, dow, h) {
  h = ((h % 24) + 24) % 24;
  for (const w of m.windows || []) {
    const f = hm(w.from), t = hm(w.to), days = w.days || [];
    if (f === t) { if (days.includes(dow)) return true; continue; }
    if (t > f) { if (days.includes(dow) && h >= f && h < t) return true; }
    else {
      if (days.includes(dow) && h >= f) return true;
      if (days.includes((dow + 6) % 7) && h < t) return true;
    }
  }
  return false;
}
// The real closing hour of the window that contains h (handles past-midnight closes).
export function closesAt(m, dow, h) {
  h = ((h % 24) + 24) % 24;
  for (const w of m.windows || []) {
    const f = hm(w.from), t = hm(w.to), days = w.days || [];
    if (f === t && days.includes(dow)) return null; // open all day
    if (t > f && days.includes(dow) && h >= f && h < t) return t;
    if (t <= f && ((days.includes(dow) && h >= f) || (days.includes((dow + 6) % 7) && h < t))) return t;
  }
  return null;
}
export function nextOpen(m, dow, h) {
  for (let s = 0.25; s <= 24; s += 0.25) { const hh = h + s; if (openAt(m, (dow + Math.floor(hh / 24)) % 7, hh % 24)) return hh % 24; }
  return null;
}
const circ = (a, b) => { const d = Math.abs(a - b) % 24; return d > 12 ? 24 - d : d; };
export const bestFit = (m, h) => Math.exp(-Math.pow(circ(h, hm(m.best)), 2) / (2 * 2.2 * 2.2));

// Glow for the map: how alive this spot is at hour h.
export function glow(m, dow, h) {
  let o = 0;
  for (const d of [-0.5, 0, 0.5]) { const hh = h + d; if (openAt(m, (dow + (hh < 0 ? 6 : hh >= 24 ? 1 : 0)) % 7, (hh + 24) % 24)) o += 1 / 3; }
  if (!o) return 0;
  return o * (0.3 + 0.7 * bestFit(m, h)) * (0.55 + m.energy / 10);
}

export const BANDS = { all: [1, 5], chill: [1, 2], social: [3, 3], wild: [4, 5] };

export function rankNow({ dow, h, date, band = 'all', rainSafe = false, cheap = false }) {
  const [lo, hi] = BANDS[band];
  const wet = rainAt(date, h) >= 50;
  return moves
    .map((m) => {
      const open = openAt(m, dow, h);
      const soon = !open ? nextOpen(m, dow, h) : null;
      const soonIn = soon == null ? 99 : ((soon - h + 24) % 24);
      const fit = bestFit(m, h);
      let s = (0.7 * fit + 0.15 + 0.03 * m.energy) * (m.secret === 2 ? 1.12 : m.secret === 1 ? 1.1 : 0.85);
      if (open && fit < 0.25) s *= 0.3;
      if (wet && !m.rainOk) s *= 0.45;
      if (!open) s *= soonIn <= 1.5 ? 0.55 : 0;
      if (m.energy < lo || m.energy > hi) s = 0;
      if (rainSafe && !m.rainOk) s = 0;
      if (cheap && m.cost > 1) s = 0;
      return { m, s, open, soon: soonIn <= 1.5 ? soon : null };
    })
    .filter((x) => x.s > 0.08)
    .sort((a, b) => b.s - a.s);
}

export function eventsBetween(a, b) { return events.filter((e) => (e.endDate || e.date) >= a && e.date <= b); }

// --- Distance ------------------------------------------------------------
export const km = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};

// --- Stay planner ----------------------------------------------------------
// Builds a day-by-day plan shaped like a DJ set: warm-up, build, peak, cool-down.
// What kind of move belongs in each part of the day.
const SLOT_FIT = {
  morning: { coffee: 1, outdoors: 0.9, water: 0.9, market: 0.8, food: 0.5, art: 0.5, shop: 0.4 },
  afternoon: { food: 0.9, art: 0.9, shop: 0.8, water: 0.8, outdoors: 0.7, market: 0.7, coffee: 0.6, music: 0.3 },
  sunset: { water: 1, outdoors: 0.9, bar: 0.7, food: 0.3 },
  dinner: { food: 1, bar: 0.25, music: 0.2 },
  night: { bar: 1, speakeasy: 1, music: 0.9, food: 0.2, nightlife: 0.5 },
  late: { nightlife: 1, music: 0.9, speakeasy: 0.7, bar: 0.6, food: 0.3 },
};
// Moves whose title names a day ("A Saturday beer", "on a weeknight") only go on those days.
const DAY_WORDS = [[/\bsundays?\b/i, [0]], [/\bmondays?\b/i, [1]], [/\btuesdays?\b/i, [2]], [/\bwednesdays?\b/i, [3]], [/\bthursdays?\b/i, [4]], [/\bfridays?\b/i, [5]], [/\bsaturdays?\b/i, [6]], [/\bweeknights?\b/i, [1, 2, 3, 4]], [/\bweekends?\b/i, [5, 6, 0]]];
export function titleDays(m) { const hit = DAY_WORDS.filter(([re]) => re.test(m.title)); return hit.length ? hit.flatMap(([, d]) => d) : null; }
const MAX_STOPS = 4;
const SLOT_DEFS = [
  { key: 'morning', label: 'Morning', at: 9.5, base: 1.4 },
  { key: 'afternoon', label: 'Afternoon', at: 13.5, base: 2.1 },
  { key: 'sunset', label: 'Sunset', at: null, base: 2.5 },
  { key: 'dinner', label: 'Dinner', at: 20, base: 3 },
  { key: 'night', label: 'Night', at: 22.5, base: 3.7 },
  { key: 'late', label: 'Late', at: 25, base: 4.4 },
];

export function planStay({ start, end, arrive = 15, depart = 13, wild = 0.6, anchors = [], swaps = {} }) {
  const days = [], used = new Set();
  const n = daySpan(start, end);
  for (let i = 0; i <= n; i++) {
    const date = addDays(start, i), dow = dowOf(date), sun = sunFor(date), w = weatherFor(date);
    const wet = (w?.rain ?? 0) >= 45;
    // Events block out their real time window.
    const spans = anchors.filter((e) => e.date <= date && (e.endDate || e.date) >= date && (e.date === date || !['concert', 'club', 'sports'].includes(e.category))).map((e) => {
      const club = e.category === 'club', show = ['concert', 'sports'].includes(e.category);
      const st = e.time ? hm(e.time) : club ? 23.5 : show ? 19.5 : 14;
      return { e, st, en: st + (club ? 4.5 : show ? 4 : 3) };
    }).filter((sp) => !(i === 0 && sp.en < arrive + 0.75) && !(i === n && sp.st > depart - 2.5));
    const items = [];
    const order = wild >= 0.6 ? ['afternoon', 'sunset', 'dinner', 'night', 'late', 'morning'] : ['morning', 'afternoon', 'sunset', 'dinner', 'night', 'late'];
    const keepKeys = new Set(order.slice(0, MAX_STOPS + 1)); if (i === n || i === 0) keepKeys.add('morning');
    for (const def of SLOT_DEFS) {
      if (!keepKeys.has(def.key)) continue;
      let at = def.at ?? sun.set - 0.4;
      if (i === 0 && at < arrive + 1.25) continue;
      if (i === n && at > depart - 2.5) continue;
      if (def.key === 'late' && wild < 0.45 && !spans.length) continue;
      const clash = spans.find((sp) => at >= sp.st - 1 && at < sp.en);
      if (clash) {
        if (def.key === 'dinner' && clash.st - 1.75 > (i === 0 ? arrive + 1 : 0)) at = clash.st - 1.75;
        else continue;
      }
      items.push({ def, at });
    }
    for (const sp of spans) items.push({ def: { key: 'event-' + sp.e.id, label: sp.e.time && ['concert', 'sports'].includes(sp.e.category) ? 'Doors' : sp.e.category === 'club' ? 'Late' : 'All day' }, at: sp.st, event: sp.e });
    items.sort((a, b) => a.at - b.at);

    const slots = [];
    const MIA_AIRPORT = { lat: 25.7959, lng: -80.287 };
    let prev = i === 0 ? MIA_AIRPORT : null;
    let free = i === 0 ? arrive + 0.75 : 0; // earliest hour we can be somewhere new
    const travel = (a, b) => (a && b ? 0.25 + km(a, b) / 28 : 0); // hours, Miami traffic
    const DWELL = 1.1;
    for (const [idx, it] of items.entries()) {
      if (it.event) {
        const sp = spans.find((x) => x.e === it.event);
        slots.push({ ...it.def, at: it.at, event: it.event, energy: it.event.energy || 4 });
        prev = it.event; used.add(it.event.id); free = sp ? sp.en : it.at + 2; continue;
      }
      const def = it.def, at = it.at;
      const afterShow = spans.some((sp) => at >= sp.en - 0.5);
      const target = Math.min(5, (afterShow && def.key === 'late' ? 4.6 : def.base) + (wild - 0.5) * 1.6);
      const dowAt = at >= 24 ? (dow + 1) % 7 : dow, hAt = at % 24;
      const fitOf = (m) => SLOT_FIT[def.key]?.[m.category] ?? 0;
      if (slots.filter((x) => !x.event).length >= MAX_STOPS) continue;
      if (def.key === 'dinner' && slots.some((x) => x.label === 'Early dinner')) continue;
      let pool = moves.filter((m) => {
        if (used.has(m.id) || m.secret === 2 || (wet && !m.rainOk) || fitOf(m) <= 0) return false;
        const td = titleDays(m); if (td && !td.includes(dowAt)) return false;
        // snap to the move's best time when it is near the slot, and require it to be open then
        const b = hm(m.best), when = def.key !== 'sunset' && Math.abs(b - hAt) <= 1.75 ? b : hAt;
        const whenAbs = (at >= 24 ? 24 : 0) + when;
        if (whenAbs < free + travel(prev, m)) return false;            // can't get there in time
        const nextEv = items.slice(idx + 1).find((x) => x.event);
        if (nextEv && whenAbs + DWELL + travel(m, nextEv.event) > nextEv.at) return false; // would miss the show
        if (nextEv && nextEv.at - whenAbs < 4 && km(m, nextEv.event) > 9) return false;   // stay near the venue before a show
        if (def.key === 'sunset' && nextEv && items.some((x) => x.def.key === 'dinner' && x.at < nextEv.at) && km(m, nextEv.event) > 3) return false; // dinner near the show beats a far sunset
        const off = Math.min(Math.abs(b - when), 24 - Math.abs(b - when));
        return openAt(m, dowAt, when) && off <= 1.5;
      });
      if (pool.some((m) => fitOf(m) >= 0.5)) pool = pool.filter((m) => fitOf(m) >= 0.5);
      const ranked = pool
        .map((m) => {
          let sc = 1 - Math.abs(m.energy - target) / 4;
          sc += 1.3 * bestFit(m, hAt) + 0.8 * (SLOT_FIT[def.key]?.[m.category] ?? 0);
          if (prev) sc -= Math.min(1.1, km(prev, m) / 12);
          const nextEv = items.slice(idx + 1).find((x) => x.event)?.event;
          if (nextEv) sc -= Math.min(1.6, km(nextEv, m) / 6);
          if (i === n) sc -= Math.min(0.9, km(MIA_AIRPORT, m) / 14);
          if (slots.some((x) => x.move?.category === m.category)) sc -= 0.35;
          if (m.secret === 2 && def.key !== 'morning') sc += 0.12;
          return { m, sc };
        })
        .sort((a, b) => b.sc - a.sc);
      if (!ranked.length) continue;
      const k = `${date}:${def.key}`, pick = ranked[(swaps[k] || 0) % ranked.length].m;
      used.add(pick.id); prev = pick;
      const b = hm(pick.best), base = at >= 24 ? 24 : 0;
      const sunsetFood = def.key === 'sunset' && pick.category === 'food';
      const snapped = (def.key !== 'sunset' || sunsetFood) && Math.abs(b - hAt) <= 1.75 ? base + b : at;
      const label = sunsetFood ? 'Early dinner' : def.key === 'dinner' && fitOf(pick) < 0.5 ? 'Evening' : def.label;
      slots.push({ ...def, label, at: snapped, target, move: pick, energy: pick.energy, options: ranked.length });
      free = snapped + DWELL;
    }
    slots.sort((a, b) => a.at - b.at);
    days.push({ date, dow, sun, weather: w, wet, slots });
  }
  return days;
}
