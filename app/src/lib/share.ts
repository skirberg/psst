// "Send the stub": one move drawn as a 1080x1350 card on the current sky, for the group chat.
// Everything on it comes from the stub on screen (its top line, title, note, meta and sticker),
// so the card never claims anything the app does not show. Canvas cannot set Recursive's MONO axis,
// so the printer lines use Recursive's default cut in caps with tracking.

export interface StubCardInput {
  front: HTMLElement; // the stub's front face, read for its text and sticker
  tint: string; // the move's sticker ink
  sky: string; skyText: string; // the page's sky and the text color on it
  file: string; // file name, e.g. psst-venetian-pool.png
}

const W = 1080, H = 1350;
const PAPER = '#FEFAF1', INK = '#052739', MUTED = '#485E6C', LINE = '#D8D0C3', MAMEY = '#F37F5F';

function mix(a: string, b: string, t: number): string {
  const p = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v * t + y[i] * (1 - t))).join(',')})`;
}

function wrap(c: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (c.measureText(next).width > width && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s*\S*$/, '') + '...'; }
  return out;
}

function spaced(c: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

// Redraw the on-screen sticker from its own shapes and words, so it keeps Tilt Warp (an SVG drawn as an image cannot use page fonts).
function drawSticker(c: CanvasRenderingContext2D, svg: SVGSVGElement, cx: number, cy: number, size: number): void {
  const rot = /rotate\((-?[\d.]+)deg\)/.exec(svg.style.transform)?.[1];
  const s = size / 112;
  c.save();
  c.translate(cx, cy); c.rotate(((Number(rot) || 0) * Math.PI) / 180); c.scale(s, s); c.translate(-50, -50);
  c.shadowColor = 'rgba(5,39,57,0.28)'; c.shadowOffsetY = 4 / s; c.shadowBlur = 6 / s;
  for (const p of svg.querySelectorAll('path')) {
    const d = new Path2D(p.getAttribute('d') ?? '');
    const fill = p.getAttribute('fill'), stroke = p.getAttribute('stroke');
    if (stroke && stroke !== 'none') { c.strokeStyle = stroke; c.lineWidth = Number(p.getAttribute('stroke-width')) || 1; c.lineJoin = 'round'; c.stroke(d); }
    if (fill && fill !== 'none') { c.fillStyle = fill; c.fill(d); }
    c.shadowColor = 'transparent';
  }
  for (const t of svg.querySelectorAll('text')) {
    c.fillStyle = t.getAttribute('fill') ?? INK;
    c.font = `400 ${t.getAttribute('font-size')}px "Tilt Warp"`;
    c.textAlign = 'center';
    c.fillText(t.textContent ?? '', Number(t.getAttribute('x')), Number(t.getAttribute('y')));
  }
  c.restore();
}

export async function drawStubCard(o: StubCardInput): Promise<Blob> {
  await Promise.all(['400 88px "Tilt Warp"', '500 42px Recursive', '650 30px Recursive'].map((f) => document.fonts.load(f).catch(() => [])));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  if (!c) throw new Error('no canvas');
  const text = (sel: string): string => o.front.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const top = [...o.front.querySelectorAll('.top span')].map((x) => x.textContent?.trim()).filter(Boolean).join(' · ');
  const meta = [...o.front.querySelectorAll('.meta span')].map((x) => x.textContent?.trim()).filter(Boolean).join(' · ');

  // Lay out first, so the stub is as tall as what it says (no empty band under a short note).
  const x = 72, w = W - 144, inner = w - 96;
  c.font = '400 88px "Tilt Warp"';
  const title = wrap(c, text('.title'), inner - 250, 4);
  c.font = '500 42px Recursive';
  const note = wrap(c, text('.note'), inner, 5);
  const titleTop = 210, titleH = title.length * 86;
  const noteTop = Math.max(titleTop + titleH - 40, 360);
  const bodyH = noteTop + note.length * 56 + 100; // to the meta line and the perforation
  const h = bodyH + 210;
  const y = Math.round(160 + (H - 160 - 40 - h) / 2), perfY = y + bodyH;

  // The sky, and the wordmark on it.
  c.fillStyle = o.sky; c.fillRect(0, 0, W, H);
  c.fillStyle = o.skyText; c.font = '400 64px "Tilt Warp"'; c.textBaseline = 'alphabetic';
  const my = Math.min(124, y - 40);
  c.fillText('psst', 84, my);
  const wm = c.measureText('psst').width;
  c.fillStyle = MAMEY; c.beginPath(); c.arc(84 + wm + 16, my - 8, 10, 0, Math.PI * 2); c.fill();
  c.fillStyle = o.skyText; c.font = '650 28px Recursive'; spaced(c, 3); c.textAlign = 'right'; c.fillText('MIAMI', W - 84, my - 4); spaced(c, 0); c.textAlign = 'left';

  // The stub: paper with notched corners, sitting on the sky.
  c.save(); c.shadowColor = 'rgba(5,39,57,0.35)'; c.shadowBlur = 40; c.shadowOffsetY = 24;
  c.fillStyle = PAPER; c.fillRect(x, y, w, h); c.restore();
  c.fillStyle = mix(o.tint, PAPER, 0.16); c.fillRect(x, perfY, w, y + h - perfY);
  c.fillStyle = o.sky;
  for (const [cx, cy, r] of [[x, y, 22], [x + w, y, 22], [x, y + h, 22], [x + w, y + h, 22], [x, perfY, 26], [x + w, perfY, 26]] as const) { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = LINE; c.lineWidth = 4; c.setLineDash([14, 14]); c.beginPath(); c.moveTo(x + 40, perfY); c.lineTo(x + w - 40, perfY); c.stroke(); c.setLineDash([]);

  // Front of the stub: the printer line, the hour bar, sticker, title, note, meta.
  c.fillStyle = MUTED; c.font = '650 30px Recursive'; spaced(c, 2.5);
  c.fillText(top.toUpperCase(), x + 48, y + 78); spaced(c, 0);
  // The hour bar, read from the stub: open half hours, the best hour, and now (the one mamey mark).
  const bar = o.front.querySelector<HTMLElement>('.bar');
  if (bar) {
    const bx = x + 48, by = y + 104, bw = inner - 250, bh = 16;
    c.fillStyle = '#ECE7DE'; c.beginPath(); c.roundRect(bx, by, bw, bh, 8); c.fill();
    c.save(); c.beginPath(); c.roundRect(bx, by, bw, bh, 8); c.clip();
    c.fillStyle = mix(INK, PAPER, 0.18);
    for (const i of bar.querySelectorAll<HTMLElement>('i')) c.fillRect(bx + (parseFloat(i.style.left) / 100) * bw, by, bw / 48 + 1, bh);
    const at = (sel: string): number | null => { const e = bar.querySelector<HTMLElement>(sel); return e ? bx + (parseFloat(e.style.left) / 100) * bw : null; };
    const best = at('.best'); if (best != null) { c.fillStyle = INK; c.fillRect(best - 2, by, 4, bh); }
    c.restore();
    const now = at('.now'); if (now != null) { c.fillStyle = MAMEY; c.beginPath(); c.roundRect(now - 3, by - 3, 6, bh + 6, 3); c.fill(); }
  }
  const svg = o.front.querySelector<SVGSVGElement>('.emblem svg');
  if (svg) drawSticker(c, svg, x + w - 150, y + 200, 240);
  c.fillStyle = INK; c.font = '400 88px "Tilt Warp"';
  let ty = y + titleTop;
  for (const l of title) { c.fillText(l, x + 48, ty); ty += 86; }
  c.font = '500 42px Recursive';
  ty = y + noteTop;
  for (const l of note) { c.fillText(l, x + 48, ty); ty += 56; }
  c.fillStyle = MUTED; c.font = '650 30px Recursive'; spaced(c, 2.5);
  c.fillText(meta.toUpperCase(), x + 48, perfY - 44); spaced(c, 0);

  // The tear-off: a grip to pull, and where it came from. No number.
  c.fillStyle = mix(INK, PAPER, 0.4);
  for (let k = 0; k < 3; k++) { c.beginPath(); c.roundRect(x + 48, perfY + 92 + k * 16, 64, 5, 3); c.fill(); }
  c.fillStyle = INK; c.font = '400 64px "Tilt Warp"'; c.textAlign = 'right'; c.fillText('psst.miami', x + w - 48, perfY + 140); c.textAlign = 'left';

  return await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png'));
}

// Share sheet where the browser has one (phones), otherwise a download.
export async function sendStub(o: StubCardInput, words: string): Promise<'sent' | 'saved' | 'cancelled'> {
  const blob = await drawStubCard(o);
  const file = new File([blob], o.file, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: words }); return 'sent'; }
    catch (e) { if ((e as DOMException).name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = o.file;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
