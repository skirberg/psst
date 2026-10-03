<script>
  // Real OSM coastline and roads. Daytime: tone-on-tone under the sky color.
  // After sunset the streetlights come on in a wave from the coast inland, headlights flow,
  // and only the moves that are actually open at the chosen hour glow. One mamey point marks the move.
  import { onMount } from 'svelte';
  import geo from '../lib/geo.json';
  import { moves, glow } from '../lib/core.js';
  import { lightness } from '../lib/sky.js';
  import { app } from '../lib/state.svelte.js';
  import Sticker from './Sticker.svelte';

  let { inset = { left: 0, top: 0, bottom: 0, right: 0 }, pins = [], route = [], focus = null, interactive = true, labels = true, quiet = false } = $props();

  const [S, W, N, E] = geo.bbox;
  const wDeg = (E - W) * geo.k, hDeg = N - S;
  const project = (lat, lng) => [((lng - W) * geo.k / wDeg) * geo.w, ((N - lat) / hDeg) * geo.h];
  const HOODS = [
    ['Little River', 25.849, -80.188], ['Little Haiti', 25.828, -80.197], ['Design District', 25.8125, -80.193], ['Wynwood', 25.8, -80.2],
    ['Allapattah', 25.811, -80.224], ['Edgewater', 25.792, -80.187], ['Downtown', 25.776, -80.194], ['Brickell', 25.759, -80.194],
    ['Little Havana', 25.766, -80.222], ['Coral Gables', 25.722, -80.27], ['Coconut Grove', 25.729, -80.241], ['Virginia Key', 25.738, -80.155],
    ['Key Biscayne', 25.692, -80.163], ['South Beach', 25.78, -80.132], ['Mid-Beach', 25.817, -80.124], ['North Beach', 25.858, -80.121], ['MiMo', 25.838, -80.184],
  ].map(([n, la, lo]) => ({ n, p: project(la, lo) }));
  const pts = moves.map((m) => ({ m, p: project(m.lat, m.lng) }));

  // traffic along real highways and causeways (illustrative)
  const ROADS = [...geo.major.map((l) => ({ l, w: 1 })), ...geo.primary.map((l) => ({ l, w: 0.3 }))]
    .map(({ l, w }) => { const cum = [0]; for (let i = 2; i < l.length; i += 2) cum.push(cum.at(-1) + Math.hypot(l[i] - l[i - 2], l[i + 1] - l[i - 1])); return { l, cum, len: cum.at(-1), w }; })
    .filter((r) => r.len > 40);
  const totalW = ROADS.reduce((a, r) => a + r.len * r.w, 0);
  let seed = 1234567; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pickRoad = (x) => { x *= totalW; for (const r of ROADS) { x -= r.len * r.w; if (x <= 0) return r; } return ROADS[0]; };
  let CARS = [];
  const TRAFFIC = [0.35, 0.28, 0.22, 0.14, 0.12, 0.2, 0.45, 0.8, 0.95, 0.7, 0.6, 0.62, 0.66, 0.62, 0.62, 0.72, 0.9, 1, 0.92, 0.75, 0.62, 0.58, 0.55, 0.45];
  const trafficAt = (h) => { const a = Math.floor(h) % 24, f = h - Math.floor(h); return TRAFFIC[a] * (1 - f) + TRAFFIC[(a + 1) % 24] * f; };
  function carPos(c) {
    const { l, cum } = c.r; let lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= c.d) lo = mid; else hi = mid; }
    const f = (c.d - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return [l[lo * 2] + (l[hi * 2] - l[lo * 2]) * f, l[lo * 2 + 1] + (l[hi * 2 + 1] - l[lo * 2 + 1]) * f];
  }

  let canvas, wrap, ctx, dpr = 1, cw = 0, ch = 0, raf = 0;
  let view = { cx: 0, cy: 0, s: 1, user: false };
  const L = {}; let layerKey = '';
  let sprites = null;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pinEls = $state([]);

  function fit() {
    const narrow = cw / dpr < 760;
    const span = narrow ? [-80.255, -80.118] : [-80.31, -80.11];
    const usable = cw - ((inset.left || 0) + (inset.right || 0)) * dpr;
    const a = project(25.78, span[0]), b = project(25.78, span[1]);
    view.s = usable / (b[0] - a[0]);
    const c = project(25.782, (span[0] + span[1]) / 2);
    view.cx = c[0] - (((inset.left || 0) - (inset.right || 0)) * dpr) / 2 / view.s;
    view.cy = c[1] - (((inset.top || 0) - (inset.bottom || 0)) * dpr) / 2 / view.s;
  }
  const toScreen = (p) => [(p[0] - view.cx) * view.s + cw / 2, (p[1] - view.cy) * view.s + ch / 2];

  function path(c, set, close) {
    c.beginPath();
    for (const line of set) {
      for (let i = 0; i < line.length; i += 2) { const x = (line[i] - view.cx) * view.s + cw / 2, y = (line[i + 1] - view.cy) * view.s + ch / 2; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      if (close) c.closePath();
    }
  }
  function layer(name, draw) {
    const off = L[name] || document.createElement('canvas'); off.width = cw; off.height = ch;
    const c = off.getContext('2d'); c.clearRect(0, 0, cw, ch); c.lineCap = 'round'; c.lineJoin = 'round'; draw(c); L[name] = off;
  }
  let built = null, lastInteract = 0;
  // While the view is moving, reuse the cached layers with a transform; rebuild once it settles.
  function layerTransform() {
    if (!built) return null;
    const k = view.s / built.s;
    return [k, (cw / 2) * (1 - k) + (built.cx - view.cx) * view.s, (ch / 2) * (1 - k) + (built.cy - view.cy) * view.s];
  }
  function buildLayers(ts) {
    const key = `${cw}x${ch}:${view.cx.toFixed(1)},${view.cy.toFixed(1)},${view.s.toFixed(5)}`;
    if (key === layerKey) return;
    if (built && built.cw === cw && built.ch === ch && performance.now() - lastInteract < 180) return;
    layerKey = key; built = { cx: view.cx, cy: view.cy, s: view.s, cw, ch };
    const z = Math.min(2.2, Math.max(0.6, Math.sqrt(view.s / 0.25)));
    layer('land', (c) => { c.fillStyle = '#fff'; path(c, geo.land, true); c.fill(); });
    layer('roadsInk', (c) => {
      c.strokeStyle = 'rgba(5,39,57,0.55)'; c.lineWidth = 0.6 * dpr * z; path(c, geo.secondary); c.stroke();
      c.strokeStyle = 'rgba(5,39,57,0.8)'; c.lineWidth = 0.9 * dpr * z; path(c, geo.primary); c.stroke();
      c.strokeStyle = 'rgba(5,39,57,1)'; c.lineWidth = 1.5 * dpr * z; path(c, geo.major); c.stroke();
    });
    layer('coastInk', (c) => { c.strokeStyle = '#052739'; c.lineWidth = 1.3 * dpr * z; path(c, geo.coast); c.stroke(); });
    layer('sodium', (c) => {
      c.strokeStyle = 'rgba(255,176,98,0.22)'; c.lineWidth = 0.6 * dpr * z; path(c, geo.secondary); c.stroke();
      c.strokeStyle = 'rgba(255,170,90,0.42)'; c.lineWidth = 0.9 * dpr * z; path(c, geo.primary); c.stroke();
      c.shadowColor = 'rgba(255,150,70,0.85)'; c.shadowBlur = 6 * dpr;
      c.strokeStyle = 'rgba(255,200,130,0.75)'; c.lineWidth = 1.4 * dpr * z; path(c, geo.major); c.stroke();
      c.shadowBlur = 0;
    });
    layer('coastLight', (c) => { c.strokeStyle = 'rgba(254,250,241,0.55)'; c.lineWidth = 1.1 * dpr * z; path(c, geo.coast); c.stroke(); });
    placeLabels();
  }

  // neighborhood labels, placed greedily so none overlap
  let placed = [];
  function placeLabels() {
    placed = []; const boxes = [];
    const fs = 10.5 * dpr; ctx.font = `600 ${fs}px Recursive, ui-monospace, monospace`;
    for (const { n, p } of HOODS) {
      const [x, y] = toScreen(p); const text = n.toUpperCase();
      const w = ctx.measureText(text).width + text.length * 1.6 * dpr, h = fs * 1.3;
      const box = [x - w / 2 - 4, y - h, x + w / 2 + 4, y + 4];
      if (box[0] < 6 || box[2] > cw - 6 || box[1] < (inset.top || 0) * dpr + 6 || box[3] > ch - (inset.bottom || 0) * dpr - 6) continue;
      if (inset.left && box[0] < inset.left * dpr) continue;
      if (boxes.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
      boxes.push(box); placed.push({ text, x, y });
    }
  }

  function makeSprites() {
    const mk = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, inner); r.addColorStop(0.25, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; };
    return { head: mk('rgba(255,244,214,1)', 'rgba(255,200,120,0)'), tail: mk('rgba(255,70,70,1)', 'rgba(255,40,60,0)'), glow: mk('rgba(255,214,140,0.95)', 'rgba(255,90,60,0)') };
  }

  // lights-on wave when the city crosses into night
  let wasDark = false, waveStart = 0, lastTs = 0, slow = 0; // starts false so a night-time first open plays the wave once
  function frame(ts) {
    if (!ctx || !cw) return;
    const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0); lastTs = ts;
    buildLayers(ts);
    const T = layerTransform();
    const blit = (img) => { if (T && (T[0] !== 1 || T[1] || T[2])) { ctx.setTransform(T[0], 0, 0, T[0], T[1], T[2]); ctx.drawImage(img, 0, 0); ctx.setTransform(1, 0, 0, 1, 0, 0); } else ctx.drawImage(img, 0, 0); };
    const d = Math.min(1, Math.max(0, (0.72 - lightness(app.sky)) / 0.42)); // 0 day .. 1 night
    const dark = d > 0.5;
    if (dark && !wasDark && !reduce) waveStart = ts;
    wasDark = dark;
    const wave = waveStart ? Math.min(1, (ts - waveStart) / 1300) : 1; if (wave >= 1) waveStart = 0;
    ctx.clearRect(0, 0, cw, ch);
    if (!quiet) { ctx.globalAlpha = 0.3 * (1 - d) + 0.06 * d; blit(L.land); }
    ctx.globalAlpha = (quiet ? 0.1 : 0.17) * (1 - d); blit(L.roadsInk);
    ctx.globalAlpha = (quiet ? 0.22 : 0.38) * (1 - d); blit(L.coastInk);
    if (d > 0) {
      ctx.save();
      if (wave < 1) { const e = 1 - Math.pow(1 - wave, 3); ctx.beginPath(); ctx.rect(cw * (1 - e * 1.1), 0, cw * 1.2, ch); ctx.clip(); }
      ctx.globalAlpha = d * (quiet ? 0.55 : 1); blit(L.sodium);
      ctx.globalAlpha = d; blit(L.coastLight);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const z = Math.min(1.7, Math.max(0.7, Math.sqrt(view.s / 0.25)));
    const h = app.hour, dow = app.dow;
    if (d > 0.25 && sprites) {
      const share = trafficAt(h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, (d - 0.25) * 1.6) * (quiet ? 0.6 : 1);
      for (const c of CARS) {
        if (!reduce) { c.d += c.v * dt; if (c.d > c.r.len) c.d -= c.r.len; if (c.d < 0) c.d += c.r.len; }
        if (c.k > share) continue;
        const [x, y] = toScreen(carPos(c)); if (x < -8 || y < -8 || x > cw + 8 || y > ch + 8) continue;
        const r = 4.5 * dpr * z;
        ctx.drawImage(c.v > 0 ? sprites.head : sprites.tail, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    for (const { m, p } of pts) {
      const g = glow(m, dow, h % 24) * (quiet ? 0.6 : 1); if (g <= 0.02) continue;
      const [x, y] = toScreen(p); if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
      const locked = m.secret === 2 && !app.unlocked.includes(m.id);
      if (d > 0.4 && sprites) {
        ctx.globalCompositeOperation = 'lighter';
        const r = Math.min(46 * dpr, (10 + 26 * g) * dpr * z); ctx.globalAlpha = Math.min(1, 0.35 + g) * (locked ? 0.5 : 1);
        ctx.drawImage(sprites.glow, x - r, y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFF6E2'; ctx.beginPath(); ctx.arc(x, y, 1.8 * dpr, 0, Math.PI * 2); ctx.fill();
      } else if (!quiet) {
        ctx.fillStyle = locked ? 'rgba(5,39,57,0.35)' : 'rgba(5,39,57,0.75)';
        ctx.beginPath(); ctx.arc(x, y, (locked ? 2.2 : 3) * dpr, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (route.length > 1) {
      const P = route.map((r) => toScreen(project(r.lat, r.lng)));
      ctx.save(); ctx.strokeStyle = d > 0.5 ? '#FEFAF1' : '#052739'; ctx.lineWidth = 2.2 * dpr; ctx.setLineDash([6 * dpr, 6 * dpr]); ctx.lineDashOffset = reduce ? 0 : -((ts || 0) / 45) % 1000;
      ctx.beginPath();
      P.forEach(([x, y], i) => { if (!i) return ctx.moveTo(x, y); const [px, py] = P[i - 1], dx = x - px, dy = y - py; ctx.quadraticCurveTo((px + x) / 2 - dy * 0.15, (py + y) / 2 + dx * 0.15, x, y); });
      ctx.stroke(); ctx.restore();
    }
    if (labels) {
      ctx.font = `600 ${10.5 * dpr}px Recursive, ui-monospace, monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = d > 0.5 ? 'rgba(254,250,241,0.5)' : 'rgba(5,39,57,0.5)';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${1.6 * dpr}px`;
      for (const l of placed) ctx.fillText(l.text, l.x, l.y);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    const f = !quiet && focus && pts.find((x) => x.m.id === focus);
    if (f) {
      const [x, y] = toScreen(f.p), pulse = reduce ? 0.5 : (Math.sin(ts / 420) + 1) / 2;
      ctx.strokeStyle = d > 0.5 ? 'rgba(254,250,241,0.85)' : 'rgba(5,39,57,0.8)'; ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath(); ctx.arc(x, y, (11 + 7 * pulse) * dpr, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#F37F5F'; ctx.beginPath(); ctx.arc(x, y, 6.5 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#052739'; ctx.stroke();
    }
    const boxes = [], topEdge = (inset.top || 0) + 60, order = pins.map((p, i) => i).sort((a, b) => (pins[b].active ? 1 : 0) - (pins[a].active ? 1 : 0));
    for (const i of order) {
      const el = pinEls[i]; if (!el) continue; let [x, y] = toScreen(project(pins[i].lat, pins[i].lng));
      x /= dpr; y /= dpr;
      const off = x < (inset.left || 0) + 10 || x > cw / dpr - 10 || y < topEdge || y > ch / dpr - 10;
      el.style.visibility = off ? 'hidden' : 'visible';
      el.style.transform = `translate(${x}px, ${y}px)`;
      const box = [x - 30, y - 70, x + 30, y + 4], hit = boxes.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]));
      el.classList.toggle('crowded', hit && !pins[i].active);
      if (!hit || pins[i].active) boxes.push(box);
    }
  }
  function loop(ts) {
    const t0 = performance.now();
    try { frame(ts); } catch (e) { if (!loop.warned) { console.warn('map frame', e); loop.warned = true; } }
    slow = performance.now() - t0 > 20 ? slow + 1 : 0;
    if (slow >= 3 && CARS.length > 80) { CARS = CARS.filter((_, i) => i % 2 === 0); slow = 0; }
    raf = requestAnimationFrame(loop);
  }
  function resize() {
    const r = wrap.getBoundingClientRect(); if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1); cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr);
    canvas.width = cw; canvas.height = ch; if (!view.user) fit(); layerKey = '';
  }

  const ptrs = new Map(); let moved = 0, pinch0 = null, downAt = null;
  function zoomAt(sx, sy, k) {
    const ns = Math.min(3, Math.max(0.12, view.s * k)); const gx = (sx - cw / 2) / view.s + view.cx, gy = (sy - ch / 2) / view.s + view.cy;
    view.s = ns; view.cx = gx - (sx - cw / 2) / ns; view.cy = gy - (sy - ch / 2) / ns; view.user = true; lastInteract = performance.now();
  }
  function onDown(e) { if (!interactive) return; canvas.setPointerCapture?.(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; downAt = [e.clientX, e.clientY]; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } }
  function onMove(e) {
    if (!ptrs.has(e.pointerId)) return; const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()], dd = Math.hypot(a[0] - b[0], a[1] - b[1]); const r = canvas.getBoundingClientRect(); zoomAt(((a[0] + b[0]) / 2 - r.left) * dpr, ((a[1] + b[1]) / 2 - r.top) * dpr, dd / pinch0); pinch0 = dd; moved += 10; return; }
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; moved += Math.abs(dx) + Math.abs(dy); view.cx -= (dx * dpr) / view.s; view.cy -= (dy * dpr) / view.s; view.user = true; lastInteract = performance.now();
  }
  function onUp(e) {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null;
    if (moved < 6 && downAt) {
      const r = canvas.getBoundingClientRect(), sx = (e.clientX - r.left) * dpr, sy = (e.clientY - r.top) * dpr;
      let best = null, bd = 24 * dpr; for (const { m, p } of pts) { const [x, y] = toScreen(p), dd = Math.hypot(x - sx, y - sy); if (dd < bd) { bd = dd; best = m; } }
      if (best && !(best.secret === 2 && !app.unlocked.includes(best.id))) app.where = best.id;
    }
    downAt = null;
  }
  function onWheel(e) { if (!interactive) return; e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, Math.exp(-e.deltaY * 0.0015)); }

  export function flyTo(lat, lng, scale) {
    if (!cw) return;
    const [tx0, ty0] = project(lat, lng), s1 = scale ?? Math.max(view.s, 0.5);
    const off = (((inset.left || 0) - (inset.right || 0)) * dpr) / 2 / s1, offY = (((inset.top || 0) - (inset.bottom || 0)) * dpr) / 2 / s1;
    const from = { ...view }, to = { cx: tx0 - off, cy: ty0 - offY, s: s1 }, t0 = performance.now(), dur = reduce ? 1 : 700;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; view.cx = from.cx + (to.cx - from.cx) * e; view.cy = from.cy + (to.cy - from.cy) * e; view.s = from.s + (to.s - from.s) * e; view.user = true; lastInteract = performance.now(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  export function fitPoints(list) {
    if (!cw || !list.length) return;
    const P = list.map((r) => project(r.lat, r.lng)); const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const bw = Math.max(120, Math.max(...xs) - Math.min(...xs)), bh = Math.max(120, Math.max(...ys) - Math.min(...ys));
    const availW = cw - ((inset.left || 0) + (inset.right || 0) + 90) * dpr, availH = ch - ((inset.top || 0) + (inset.bottom || 0) + 90) * dpr;
    const s = Math.max(0.12, Math.min(1.2, Math.min(availW / bw, availH / bh)));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    flyTo(N - (cy / geo.h) * hDeg, W + ((cx / geo.w) * wDeg) / geo.k, s);
  }
  export function recenter() { view.user = false; fit(); layerKey = ''; }

  onMount(() => {
    ctx = canvas.getContext('2d'); sprites = makeSprites();
    const n = matchMedia('(max-width: 760px)').matches ? 280 : 600;
    CARS = Array.from({ length: n }, (_, i) => { const r = pickRoad(rnd()); return { r, d: rnd() * r.len, v: (14 + rnd() * 16) * (rnd() < 0.5 ? 1 : -1), k: i / n }; });
    const ro = new ResizeObserver(resize); ro.observe(wrap); resize();
    raf = requestAnimationFrame(loop);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { lastTs = 0; raf = requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', vis);
    if (document.fonts?.ready) document.fonts.ready.then(() => { layerKey = ''; });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); };
  });
</script>

<div class="map" bind:this={wrap} role="img" aria-label="Miami map. Lit spots are open at this hour.">
  <canvas bind:this={canvas} class:interactive onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp}></canvas>
  {#if labels}<p class="credit">Map <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></p>{/if}
  <div class="pins">
    {#each pins as p, i (p.id)}
      <button class="pin" bind:this={pinEls[i]} class:active={p.active} onclick={() => p.onclick?.()} aria-label={p.label} tabindex={p.onclick ? 0 : -1}>
        <span class="lift"><Sticker move={p.move} size={p.active ? 52 : 38} />{#if p.tag}<b>{p.tag}</b>{/if}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .map { position: absolute; inset: 0; overflow: hidden; }
  canvas { width: 100%; height: 100%; display: block; }
  canvas.interactive { touch-action: none; cursor: grab; }
  canvas.interactive:active { cursor: grabbing; }
  .pins { position: absolute; inset: 0; pointer-events: none; }
  .credit { position: absolute; right: 10px; bottom: 6px; margin: 0; font: 500 10.5px var(--body); color: var(--text); opacity: 0.7; z-index: 2; }
  .credit a { color: inherit; }
  .pin { all: unset; position: absolute; left: 0; top: 0; pointer-events: auto; cursor: pointer; will-change: transform; }
  .lift { position: absolute; transform: translate(-50%, -100%); display: grid; justify-items: center; gap: 2px; transition: transform 0.24s cubic-bezier(.3, 1.4, .5, 1); }
  .pin:hover .lift, .pin.active .lift { transform: translate(-50%, -100%) translateY(-6px); }
  .pin:global(.crowded) .lift b { display: none; }
  .pin:global(.crowded) { opacity: 0.85; }
  .lift b { font: 600 11px var(--mono); font-variation-settings: 'MONO' 1; background: var(--ink); color: var(--paper); padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
  .pin:focus-visible { outline: none; }
  .pin:focus-visible .lift { outline: 3px solid var(--text); outline-offset: 2px; border-radius: 8px; }
</style>
