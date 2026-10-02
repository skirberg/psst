<script>
  // The hour in sign lettering with a shade cast by the real sun, the day's sky as a track,
  // and the pineapple-sun you drag through it.
  import { app } from '../lib/state.svelte.js';
  import { fmtHour, weatherFor } from '../lib/core.js';
  import { skyRibbon, lightness } from '../lib/sky.js';

  let { big = 76 } = $props();
  let track;
  const ribbon = $derived(skyRibbon(app.now.date, 48));
  const grad = $derived(`linear-gradient(90deg, ${ribbon.map((c, i) => `${c} ${((i / 48) * 100).toFixed(2)}%`).join(',')})`);
  const hourly = $derived(weatherFor(app.now.date)?.hourly);
  const night = $derived(lightness(app.sky) < 0.45);
  const parts = $derived.by(() => {
    const t = fmtHour(app.hour); const m = t.match(/^(\d+):(\d\d)(am|pm)$/);
    return m ? { d: (m[1] + ':' + m[2]).split(''), ap: m[3] } : { d: t.split(''), ap: '' };
  });
  const dist = $derived(12 - Math.abs(((app.hour - app.now.hour + 36) % 24) - 12));
  const away = $derived(!app.following && dist > 0.5);
  const pos = (h) => `calc(13px + (100% - 26px) * ${h / 24})`;

  function lede(h) {
    const set = app.sun.set;
    if (h >= 15 && h < 15.5) return 'Cafecito time.';
    if (h >= set - 1 && h < set + 0.3) return 'Golden hour. Face west.';
    return '';
  }
  const line = $derived(lede(app.hour));

  let dragging = false;
  function setFrom(e) {
    const r = track.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left - 13) / (r.width - 26)));
    app.scrubTo(Math.round(x * 96) / 4);
  }
  function down(e) { dragging = true; track.setPointerCapture?.(e.pointerId); setFrom(e); }
  function move(e) { if (dragging) setFrom(e); }
  function up() { dragging = false; }
  function key(e) {
    const d = { ArrowRight: 0.25, ArrowLeft: -0.25, PageUp: 1, PageDown: -1 }[e.key];
    if (e.key === 'Home') { e.preventDefault(); app.backToNow(); return; }
    if (d == null) return;
    e.preventDefault(); app.scrubTo(app.hour + d);
  }
</script>

<div class="head" style:--big="{big}px">
  <div class="hrow">
    <button class="hour" class:neon={night} style:text-shadow={night ? undefined : app.shade.css} onclick={() => app.backToNow()}
      aria-label={away ? `Showing ${fmtHour(app.hour)}. Back to now` : `It is ${fmtHour(app.hour)} in Miami`}>
      {#each parts.d as c}<span class:colon={c === ':'}>{c}</span>{/each}<span class="ap">{parts.ap}</span>
    </button>
    {#if away}<button class="nowchip" onclick={() => app.backToNow()}>Now {fmtHour(app.now.hour, true)}</button>{/if}
  </div>

  <div class="track" bind:this={track} role="slider" tabindex="0" aria-label="Time of day in Miami"
       aria-valuemin="0" aria-valuemax="24" aria-valuenow={app.hour.toFixed(2)} aria-valuetext={fmtHour(app.hour)}
       onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onkeydown={key}>
    <div class="ribbon" style:background={grad}></div>
    {#if hourly}{#each hourly as hr, i}{#if hr[1] >= 30}<i class="rain" style:left={pos(i + 0.5)} style:height="{4 + hr[1] * 0.08}px" title="{hr[1]}% rain"></i>{/if}{/each}{/if}
    <span class="tick" style:left={pos(app.sun.rise)}></span>
    <span class="tick" style:left={pos(app.sun.set)}></span>
    {#if away}<span class="nowmark" style:left={pos(app.now.hour)}></span>{/if}
    <span class="sun" class:moon={night} style:left={pos(app.hour)}>
      {#if night}
        <svg viewBox="0 0 24 24"><path d="M15.5 3.2a9 9 0 1 0 5.4 15.6A10 10 0 0 1 15.5 3.2z" fill="#FEFAF1"/></svg>
      {:else}
        <svg viewBox="0 0 24 30"><path d="M12 9c1.2-3 1-5.6 0-8-1 2.4-1.2 5 0 8zM12 9c-2-2.2-4.6-3.2-7.4-3.2 1.8 1.9 4.4 2.9 7.4 3.2zM12 9c2-2.2 4.6-3.2 7.4-3.2-1.8 1.9-4.4 2.9-7.4 3.2z" fill="#117555"/><ellipse cx="12" cy="19" rx="8.2" ry="10" fill="#F37F5F" stroke="#052739" stroke-width="1.6"/></svg>
      {/if}
    </span>
  </div>
  <div class="scale" aria-hidden="true"><span>6am</span><span>noon</span><span>6pm</span></div>
  {#if app.wet}<p class="sunline">Rain likely. Covered spots first.</p>{/if}
  {#if line}<p class="lede">{line}</p>{/if}
</div>

<style>
  .head { display: grid; gap: 8px; color: var(--text); }
  .hour { all: unset; cursor: pointer; justify-self: start; display: inline-flex; align-items: baseline; font: 400 var(--big)/0.92 var(--display); letter-spacing: -0.01em; transition: text-shadow 0.25s; }
  .hour span { display: inline-block; width: 0.62em; text-align: center; }
  .hour span.colon { width: 0.28em; }
  .hour .ap { width: auto; font-size: 0.36em; margin-left: 0.12em; letter-spacing: 0.02em; }
  .hour.neon { font-family: 'Tilt Neon', var(--display); color: #FFBD99; text-shadow: 0 0 14px color-mix(in oklch, var(--mamey) 70%, transparent), 0 0 2px #FFBD99; }
  .hour:focus-visible { outline: 3px solid currentColor; outline-offset: 4px; border-radius: 6px; }
  .nowchip { font: 650 13px var(--body); padding: 7px 12px; border-radius: 999px; border: 0; background: var(--text); color: var(--sky); cursor: pointer; }

  .track { position: relative; height: 34px; margin-top: 4px; cursor: ew-resize; touch-action: none; }
  .track:focus-visible { outline: 3px solid var(--text); outline-offset: 4px; border-radius: 10px; }
  .ribbon { position: absolute; left: 0; right: 0; top: 12px; height: 10px; border-radius: 6px; box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--text) 35%, transparent); }
  .rain { position: absolute; bottom: 24px; width: 2px; margin-left: -1px; border-radius: 1px; background: color-mix(in oklch, var(--text) 45%, #4AC9EC); }
  .tick { position: absolute; top: 8px; height: 18px; width: 2px; margin-left: -1px; background: var(--text); opacity: 0.55; border-radius: 1px; }
  .nowmark { position: absolute; top: 6px; height: 22px; width: 2px; margin-left: -1px; background: var(--text); border-radius: 2px; }
  .sun { position: absolute; top: 50%; width: 30px; height: 36px; margin: -20px 0 0 -15px; display: grid; place-items: center; pointer-events: none; filter: drop-shadow(0 2px 2px rgba(5, 39, 57, 0.35)); transition: left 0.06s linear; }
  .sun svg { width: 26px; height: 32px; }
  .sun.moon svg { width: 24px; height: 24px; }
  .scale { position: relative; height: 12px; margin-top: -6px; font: 500 11px var(--body); }
  .scale span { position: absolute; transform: translateX(-50%); }
  .scale span:nth-child(1) { left: calc(13px + (100% - 26px) * 0.25); }
  .scale span:nth-child(2) { left: calc(13px + (100% - 26px) * 0.5); }
  .scale span:nth-child(3) { left: calc(13px + (100% - 26px) * 0.75); }
  .hrow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .sunline { margin: 0; font: 600 14px var(--body); }
  .lede { margin: 0; font: 650 18px/1.3 var(--body); font-variation-settings: 'CASL' 1; }
  @media (prefers-reduced-motion: reduce) { .hour, .sun { transition: none; } }
</style>
