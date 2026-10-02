// Miami's sky as a color field, and the sun's real position, for any date and hour.
import { sunFor, MIAMI, TZ } from './core.js';

// ---- color math (OKLab) ------------------------------------------------
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const delin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function toLab(hex) {
  const [r, g, b] = hex2rgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function toHex([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, delin(c))) * 255).toString(16).padStart(2, '0')).join('');
}
export const mixHex = (a, b, t) => { const A = toLab(a), B = toLab(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
export const lightness = (hex) => toLab(hex)[0];

// ---- the seven skies ---------------------------------------------------
export const SKY = {
  dawn: '#F9C5C8', morning: '#AEE6F4', noon: '#FBF2D0', afternoon: '#B0F1DF',
  golden: '#FCA864', dusk: '#834791', night: '#042234',
};
export const PAPER = '#FEFAF1', INK = '#052739', MAMEY = '#F37F5F';

function stops(sun) {
  const r = sun.rise, s = sun.set;
  return [
    [0, SKY.night], [r - 1.1, SKY.night], [r - 0.15, SKY.dawn], [r + 0.6, SKY.dawn], [r + 1.6, SKY.morning], [11, SKY.morning],
    [12.3, SKY.noon], [14.6, SKY.noon], [15.6, SKY.afternoon], [s - 1.3, SKY.afternoon], [s - 0.6, SKY.golden], [s + 0.15, SKY.golden],
    [s + 0.75, SKY.dusk], [s + 1.5, SKY.night], [24, SKY.night],
  ].sort((a, b) => a[0] - b[0]);
}
export function phaseAt(h, sun) {
  if (h < sun.rise - 0.9 || h >= sun.set + 1.3) return 'night';
  if (h < sun.rise + 1.1) return 'dawn';
  if (h < 11.5) return 'morning';
  if (h < 15) return 'noon';
  if (h < sun.set - 1) return 'afternoon';
  if (h < sun.set + 0.25) return 'golden';
  return 'dusk';
}
export function skyAt(h, date) {
  const sun = sunFor(date), st = stops(sun);
  for (let i = 0; i < st.length - 1; i++) {
    const [h0, c0] = st[i], [h1, c1] = st[i + 1];
    if (h >= h0 && h <= h1) return legible(mixHex(c0, c1, h1 === h0 ? 0 : (h - h0) / (h1 - h0)));
  }
  return SKY.night;
}
// Twilight blends can land on a mid-tone where neither ink nor paper reads. Push them out of it.
function legible(c) {
  for (let i = 0; i < 12; i++) {
    const t = textOn(c); if (contrast(c, t) >= 4.6) return c;
    c = mixHex(c, t === INK ? PAPER : SKY.night, 0.08);
  }
  return c;
}
export function skyRibbon(date, n = 48) {
  return Array.from({ length: n + 1 }, (_, i) => skyAt((i / n) * 24, date));
}

// ---- sun position (NOAA-style approximation, good to a fraction of a degree) ----
function utcOffsetHours(date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(new Date(date + 'T12:00:00Z'));
  const m = (p.find((x) => x.type === 'timeZoneName')?.value || 'GMT-5').match(/GMT([+-]\d+)/);
  return m ? +m[1] : -5;
}
export function solarPosition(date, h) {
  const rad = Math.PI / 180;
  const [y, mo, d] = date.split('-').map(Number);
  const utcMs = Date.UTC(y, mo - 1, d) + (h - utcOffsetHours(date)) * 3600e3;
  const n = utcMs / 864e5 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * n) * rad, q = 280.459 + 0.98564736 * n;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * n) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const ha = ((gmst * 15 + MIAMI.lng) * rad - ra);
  const lat = MIAMI.lat * rad;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) / rad + 180;
  return { altitude: alt / rad, azimuth: (az + 360) % 360 };
}

// Sign-painter drop shade: the shadow under the hour falls away from the real sun.
// Treat the sign as a south-facing storefront: sun in the east throws shade left, west throws it right.
export function sunShade(date, h, color) {
  const { altitude, azimuth } = solarPosition(date, h);
  if (altitude <= 0) return { css: 'none', dx: 0, dy: 0, up: false };
  const side = Math.sin(((azimuth - 180) * Math.PI) / 180);
  // viewer faces north at a south-facing sign: a western sun throws shade to the right (east)
  const dx = Math.round(side * 11), dy = Math.round(3 + 9 * Math.sin((altitude * Math.PI) / 180));
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  const steps = Array.from({ length: n }, (_, i) => `${((dx * (i + 1)) / n).toFixed(1)}px ${((dy * (i + 1)) / n).toFixed(1)}px 0 ${color}`);
  return { css: steps.join(','), dx, dy, up: true };
}

// WCAG contrast, to pick ink or paper text over whatever the sky is doing
const relLum = (hex) => { const [r, g, b] = hex2rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const textOn = (sky) => (contrast(sky, INK) >= contrast(sky, PAPER) ? INK : PAPER);
