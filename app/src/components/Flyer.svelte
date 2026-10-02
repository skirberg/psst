<script>
  // A generated two-ink flyer per event. Titles are fitted (width axis, then size) so words never break.
  import { onMount } from 'svelte';
  import { fmtDate, fmtHour, hm } from '../lib/core.js';
  let { ev, mini = false } = $props();
  // split-fountain inks keyed to the start time: day, evening, after midnight
  const DAY = [['#FEFAF1', '#F37F5F', '#052739'], ['#FED252', '#E2406F', '#052739'], ['#B0F1DF', '#117555', '#052739']];
  const EVE = [['#052739', '#F37F5F', '#FEFAF1'], ['#FEFAF1', '#733EA4', '#052739'], ['#F9C5C8', '#052739', '#052739']];
  const LATE = [['#042234', '#4AC9EC', '#FEFAF1'], ['#733EA4', '#FED252', '#FEFAF1'], ['#052739', '#C8F56D', '#FEFAF1']];
  const hash = (s) => [...s].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  const h = $derived(hash(ev.id));
  const start = $derived(ev.time ? hm(ev.time) : ev.category === 'club' ? 23 : ['concert', 'sports'].includes(ev.category) ? 20 : 12);
  const ink = $derived((start >= 21 || start < 5 ? LATE : start >= 17 ? EVE : DAY)[h % 3]);
  const layout = $derived(h % 3);
  const day = $derived(fmtDate(ev.date, { day: 'numeric' }));
  const mon = $derived(fmtDate(ev.date, { month: 'short' }));
  const wk = $derived(fmtDate(ev.date, { weekday: 'short' }));
  const range = $derived(ev.endDate && ev.endDate !== ev.date ? `${day}–${fmtDate(ev.endDate, { day: 'numeric' })}` : '');

  let box, titleEl, fit = $state({ size: 30, wdth: 100 });
  function fitTitle() {
    if (!box || !titleEl) return;
    const W = box.clientWidth - 24; if (W <= 0) return;
    const words = ev.title.toUpperCase().split(/\s+/);
    const H = box.clientHeight - (box.querySelector('.num')?.offsetHeight || 0) - 60;
    const c = document.createElement('canvas').getContext('2d');
    const maxLines = 4;
    for (let size = 46; size >= 16; size -= 2) {
      for (const wdth of [100, 90, 80, 75]) {
        const stretch = { 100: 'normal', 90: 'semi-condensed', 80: 'condensed', 75: 'condensed' }[wdth];
        c.font = `${stretch} 400 ${size}px "League Gothic"`; if ('fontStretch' in c) c.fontStretch = stretch;
        const scale = 'fontStretch' in c ? 1 : wdth / 100;
        if (words.some((w) => c.measureText(w).width * scale > W)) continue;
        let lines = 1, cur = 0;
        for (const w of words) { const ww = c.measureText(w + ' ').width * scale; if (cur + ww > W && cur > 0) { lines++; cur = ww; } else cur += ww; }
        if (lines <= maxLines && (H <= 0 || lines * size * 0.92 <= H)) { fit = { size, wdth }; return; }
      }
    }
    fit = { size: 16, wdth: 75 };
  }
  onMount(() => { fitTitle(); document.fonts?.ready.then(fitTitle); const ro = new ResizeObserver(fitTitle); ro.observe(box); return () => ro.disconnect(); });
</script>

<div class="flyer l{layout}" class:mini bind:this={box} style:--paper={ink[0]} style:--a={ink[1]} style:--b={ink[2]}>
  {#if layout === 1}<div class="sun" aria-hidden="true"></div>{/if}
  <div class="num" aria-hidden="true">{range || day}</div>
  {#if mini}<div class="mwk">{wk}</div>{/if}
  <div class="title" bind:this={titleEl} style:font-size="{fit.size}px" style:font-stretch="{fit.wdth}%">{ev.title}</div>
  <div class="foot"><span>{wk} {mon} {day}{ev.time ? `, ${fmtHour(hm(ev.time), true)}` : ''}</span><span>{ev.venue}</span></div>
</div>

<style>
  .flyer { position: relative; aspect-ratio: 4 / 5; width: 100%; background: var(--paper); color: var(--b); overflow: hidden; padding: 12px; display: flex; flex-direction: column; gap: 4px; isolation: isolate; container-type: inline-size; }
  .num { font: 400 clamp(40px, 42cqi, 120px)/0.8 'League Gothic', var(--display); color: var(--a); letter-spacing: -0.01em; }
  .l2 .num { color: var(--b); }
  .title { margin-top: auto; font-family: 'League Gothic', var(--display); line-height: 0.9; text-transform: uppercase; letter-spacing: 0.01em; overflow-wrap: normal; word-break: keep-all; hyphens: none; }
  .sun { position: absolute; right: -14%; top: -12%; width: 64%; aspect-ratio: 1; border-radius: 50%; background: var(--a); z-index: -1; opacity: 0.9; }
  .l1 .num { color: var(--b); }
  .mini .title, .mini .foot { display: none; }
  .mini .num { font-size: clamp(48px, 60cqi, 96px); margin-top: auto; }
  .mwk { font: 400 22px/1 'League Gothic', var(--display); text-transform: uppercase; color: var(--b); }
  .foot { display: grid; gap: 1px; font: 500 9.5px/1.25 var(--mono); font-variation-settings: 'MONO' 1; letter-spacing: 0.04em; text-transform: uppercase; border-top: 1.5px solid currentColor; padding-top: 5px; }
</style>
