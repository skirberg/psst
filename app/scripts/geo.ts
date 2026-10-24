// Compress OSM coastline + roads into a small quantized polyline set for the map.
// Run from the repo root: node app/scripts/geo.ts   (reads data/raw/coast.json and roads.json, writes app/static/geo.json and geo-frame.ts)
import { readFileSync, writeFileSync } from 'node:fs';
import type { Geo } from '../src/lib/types.ts';

type XY = [number, number];
interface LatLon { lat: number; lon: number }
interface Way { geometry?: LatLon[]; tags?: { highway?: string } }
const S = 25.60, W = -80.33, N = 25.90, E = -80.11, LAT0 = (S + N) / 2, K = Math.cos((LAT0 * Math.PI) / 180);
const Q = 4000; // grid units across the width
const wDeg = (E - W) * K, hDeg = N - S;
const H = Math.round((Q * hDeg) / wDeg);
const px = (lng: number): number => Math.round((((lng - W) * K) / wDeg) * Q), py = (lat: number): number => Math.round(((N - lat) / hDeg) * H);

// Douglas-Peucker
function dp(pts: XY[], eps: number): XY[] {
  if (pts.length < 3) return pts;
  let dmax = 0, idx = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const L = Math.hypot(bx - ax, by - ay) || 1;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / L; if (d > dmax) { dmax = d; idx = i; } }
  if (dmax > eps) { const a = dp(pts.slice(0, idx + 1), eps), b = dp(pts.slice(idx), eps); return a.slice(0, -1).concat(b); }
  return [pts[0], pts[pts.length - 1]];
}
function pack(ways: Way[], eps: number, minLen: number): number[][] {
  const out: number[][] = [];
  for (const w of ways) {
    if (!w.geometry) continue;
    const pts = dp(w.geometry.map((g): XY => [px(g.lon), py(g.lat)]), eps);
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len >= minLen) out.push(pts.flat());
  }
  return out;
}
const read = (f: string): Way[] => (JSON.parse(readFileSync(f, 'utf8')) as { elements: Way[] }).elements;
const coast = read('data/raw/coast.json'), roads = read('data/raw/roads.json');
const cls: Record<string, 'major' | 'primary' | 'secondary' | null> = { motorway: 'major', trunk: 'major', motorway_link: null, primary: 'primary', secondary: 'secondary' };
const groups: Record<'major' | 'primary' | 'secondary', Way[]> = { major: [], primary: [], secondary: [] };
for (const r of roads) { const c = cls[r.tags?.highway ?? '']; if (c) groups[c].push(r); }

// Land polygons from the coastline (land is on the left of each way): join ways end to start, then close open chains along a far frame.
const key = (g: LatLon): string => g.lat.toFixed(7) + ',' + g.lon.toFixed(7);
const chains: LatLon[][] = coast.flatMap((w) => (w.geometry ? [w.geometry.slice()] : []));
let merged = true;
while (merged) {
  merged = false;
  outer: for (let i = 0; i < chains.length; i++) for (let j = 0; j < chains.length; j++) {
    if (i !== j && key(chains[i][chains[i].length - 1]) === key(chains[j][0])) { chains[i] = chains[i].concat(chains[j].slice(1)); chains.splice(j, 1); merged = true; break outer; }
  }
}
const FS = S - 1, FN = N + 1, FW = W - 1, FE = E + 1; // far frame
const ring: XY[] = [[FW, FN], [FE, FN], [FE, FS], [FW, FS]]; // clockwise in lng/lat (y up): NW, NE, SE, SW
const nearestEdge = (g: LatLon): number => ([[Math.abs(g.lat - FN), 0], [Math.abs(g.lon - FE), 1], [Math.abs(g.lat - FS), 2], [Math.abs(g.lon - FW), 3]] as XY[]).sort((a, b) => a[0] - b[0])[0][1];
const snap = (g: LatLon, e: number): XY => (e === 0 ? [g.lon, FN] : e === 1 ? [FE, g.lat] : e === 2 ? [g.lon, FS] : [FW, g.lat]);
function area(pts: XY[]): number { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return a / 2; }
const land: XY[][] = [];
for (const c of chains) {
  let pts = c.map((g): XY => [g.lon, g.lat]);
  const first = c[0], last = c[c.length - 1];
  if (key(first) !== key(last)) {
    const eA = nearestEdge(first), eB = nearestEdge(last), a = snap(first, eA), b = snap(last, eB);
    // two closures: walk the frame corners clockwise or counter-clockwise from B's edge to A's edge
    const cw: XY[] = [b], ccw: XY[] = [b];
    for (let e = eB; ; e = (e + 1) % 4) { cw.push(ring[(e + 1) % 4]); if ((e + 1) % 4 === eA) break; }
    for (let e = eB; ; e = (e + 3) % 4) { ccw.push(ring[e]); if ((e + 3) % 4 === eA || e === eA) break; }
    const P1 = pts.concat(eA === eB ? [b, a] : cw.concat([a])), P2 = pts.concat(eA === eB ? [b, ...ring, a] : ccw.concat([a]));
    pts = area(P1) > 0 ? P1 : P2;
    if (area(pts) <= 0) continue;
  } else if (area(pts) <= 0) continue;
  land.push(pts);
}
const ringDp = (pts: XY[], eps: number): XY[] => { const m = Math.floor(pts.length / 2); if (pts.length < 6) return pts; const a = dp(pts.slice(0, m + 1), eps), b = dp(pts.slice(m), eps); return a.slice(0, -1).concat(b); };
const packPoly = (polys: XY[][], eps: number): number[][] => polys.map((p) => ringDp(p.map(([lon, lat]): XY => [px(lon), py(lat)]), eps).flat()).filter((a) => a.length >= 6);
const geo: Geo = {
  w: Q, h: H, k: K, bbox: [S, W, N, E], land: packPoly(land, 1.2),
  coast: pack(coast, 1.2, 6), major: pack(groups.major, 1.5, 8), primary: pack(groups.primary, 1.8, 10), secondary: pack(groups.secondary, 2.2, 14),
};
const s = JSON.stringify(geo);
writeFileSync('app/static/geo.json', s);
writeFileSync('app/src/lib/geo-frame.ts', readFileSync('app/src/lib/geo-frame.ts', 'utf8').replace(/export const FRAME = .*/, `export const FRAME = { w: ${Q}, h: ${H}, k: ${K}, bbox: [${S}, ${W}, ${N}, ${E}] as [number, number, number, number] };`));
console.log('chains', chains.length, 'land', geo.land.length, 'H', H, 'coast', geo.coast.length, 'major', geo.major.length, 'primary', geo.primary.length, 'secondary', geo.secondary.length, 'bytes', s.length);
