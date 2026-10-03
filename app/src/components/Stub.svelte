<script>
  // One move as a tear-off ticket. Front: when, what. Back: how to get in, where, sources.
  // Tear the bottom off (drag down, or press Keep) and it flies into Kept.
  import { tick } from 'svelte';
  import Sticker from './Sticker.svelte';
  import { app, serialOf } from '../lib/state.svelte.js';
  import { moves, openAt, closesAt, hm, fmtHour, fmtDate } from '../lib/core.js';

  let { item, compact = false, at = null, dow = null } = $props();
  const m = $derived(item.m);
  const dayDow = $derived(dow ?? app.dow);
  const planned = $derived(at != null);
  const sealed = $derived(item.sealed && !app.unlocked.includes(m.id));
  const flipped = $derived(app.flipped === m.id);
  const kept = $derived(app.kept.includes(m.id));
  const serial = $derived(String(serialOf(m)).padStart(3, '0'));
  const total = String(moves.length).padStart(3, '0');
  const bars = $derived(Array.from({ length: 48 }, (_, i) => openAt(m, dayDow, i / 2)));
  const nowH = $derived(at ?? app.hour);
  const isOpen = $derived(openAt(m, dayDow, nowH));
  const closeAt = $derived(closesAt(m, dayDow, nowH));
  const energyWord = $derived(m.energy <= 2 ? 'low-key' : m.energy === 3 ? 'lively' : 'loud');
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const apple = $derived(`https://maps.apple.com/?q=${encodeURIComponent(m.place)}&ll=${m.lat},${m.lng}`);
  const google = $derived(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.place + ' ' + m.address)}`);

  // jagged tear line, seeded by the move so it's always the same rip
  const jag = $derived.by(() => {
    let s = [...m.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 9) || 9;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts = []; for (let x = 0; x <= 100; x += 4) pts.push(`${x}% ${(r() * 7).toFixed(1)}px`);
    return pts;
  });

  // sealed secrets: hold to open (or Enter twice)
  let hold = $state(0), raf = 0, t0 = 0, armed = $state(false);
  function holdStart(e) {
    if (!sealed || e.button > 0) return;
    e.preventDefault();
    if (app.leansLeft() <= 0) { app.say('No secrets left this week. A friend’s code adds one.'); return; }
    t0 = performance.now(); cancelAnimationFrame(raf);
    document.documentElement.style.setProperty('--lean', '1');
    const step = () => {
      hold = Math.min(1, (performance.now() - t0) / 950);
      if (hold >= 1) { open(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function holdEnd() { cancelAnimationFrame(raf); if (hold < 1) hold = 0; document.documentElement.style.setProperty('--lean', '0'); }
  function open() {
    document.documentElement.style.setProperty('--lean', '0');
    if (app.unlock(m.id)) { try { navigator.vibrate?.([12, 40, 18]); } catch {} app.say('Opened.'); }
  }
  function sealedKey(e) {
    if (!sealed) return;
    if (e.key === 'Escape') { armed = false; return; }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!armed) { armed = true; return; }
    armed = false; open();
  }
  $effect(() => () => cancelAnimationFrame(raf));

  // tear-off
  let tearoff = $state(), tearing = $state(false), pull = $state(0), py = null;
  async function tear() {
    if (kept || tearing) return;
    tearing = true;
    const target = document.querySelector('[data-tab="book"]');
    if (!reduce && tearoff && target) {
      const a = tearoff.getBoundingClientRect(), b = target.getBoundingClientRect();
      const ghost = tearoff.cloneNode(true);
      Object.assign(ghost.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: 0, zIndex: 50, pointerEvents: 'none', background: '#FEFAF1', borderRadius: '4px', boxShadow: '0 12px 24px rgba(5,39,57,.3)', opacity: 1, transform: 'none' });
      document.body.appendChild(ghost);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      await ghost.animate([
        { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 60}px) rotate(-10deg) scale(.7)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) rotate(8deg) scale(.15)`, opacity: 0.2 },
      ], { duration: 620, easing: 'cubic-bezier(.3,.7,.4,1)' }).finished.catch(() => {});
      ghost.remove();
      target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 260 });
    }
    app.keep(m.id); tearing = false; pull = 0;
    app.say(`Kept. No. ${serial}.`);
  }
  function pullStart(e) { if (kept || e.target.closest('button, a')) return; py = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); }
  function pullMove(e) { if (py == null) return; pull = Math.max(0, Math.min(80, e.clientY - py)); }
  function pullEnd() { if (py == null) return; py = null; if (pull > 56) tear(); else pull = 0; }

  async function flip(to) {
    app.flipped = to ? m.id : null;
    await tick();
    document.querySelector(to ? `#back-${m.id} .b-close` : `#front-${m.id} .more`)?.focus();
  }
  function faceClick(e) { if (e.target.closest('button, a')) return; flip(!flipped); }
</script>

<div class="wrap">
{#if sealed}
  <div class="stub sealed" role="button" tabindex="0"
       aria-label="Sealed secret in {m.hood}. Press Enter twice, or press and hold, to open it."
       onpointerdown={holdStart} onpointerup={holdEnd} onpointerleave={holdEnd} onpointercancel={holdEnd} onkeydown={sealedKey}>
    <div class="flap" aria-hidden="true"></div>
    <div class="seal" style:--p={hold} aria-hidden="true"><span>psst</span></div>
    <p class="s-hood">{m.hood}</p>
    {#if m.clue}<p class="s-clue">{m.clue.replace(/^[^.]+\.\s*/, '')}</p>{/if}
    <p class="s-hint" aria-live="polite">{armed ? 'Press Enter again to open' : app.leansLeft() > 0 ? `Hold to open. ${app.leansLeft()} left this week.` : 'None left this week.'}</p>
  </div>
{:else}
  <article class="stub" class:compact class:flipped class:kept aria-label={m.title} style:--pull="{pull}px">
    <div class="faces">
      <div class="face front" id="front-{m.id}" inert={flipped} onclick={faceClick} role="presentation">
        <p class="top">
          {#if planned}<span>{closeAt != null ? `Open till ${fmtHour(closeAt, true)}` : 'Open late'}</span>
          {:else if isOpen}<span class="live"><i></i>{closeAt != null ? `Open till ${fmtHour(closeAt, true)}` : 'Open now'}</span>{#if Math.min(Math.abs(nowH - hm(m.best)), 24 - Math.abs(nowH - hm(m.best))) > 1.5}<span class="best-at">best {fmtHour(hm(m.best), true)}</span>{/if}
          {:else}<span>{item.soon != null ? `Opens ${fmtHour(item.soon, true)}` : `Best at ${fmtHour(hm(m.best), true)}`}</span>{/if}
        </p>
        <div class="emblem"><Sticker move={m} size={compact ? 66 : 88} /></div>
        <div class="bar" aria-hidden="true">
          {#each bars as o, i}{#if o}<i style:left="{(i / 48) * 100}%"></i>{/if}{/each}
          <b class="best" style:left="{(hm(m.best) / 24) * 100}%"></b>
          <b class="now" style:left="{(nowH / 24) * 100}%"></b>
        </div>
        <h3 class="title">{m.title}</h3>
        <p class="note">{m.theMove}</p>
        <div class="meta"><span>{m.hood}</span><span>{'$'.repeat(m.cost)}</span><span>{energyWord}</span><button class="more" onclick={() => flip(true)}>More</button></div>
      </div>
      <div class="face back" id="back-{m.id}" inert={!flipped} onclick={faceClick} role="presentation">
        <div class="b-top"><p class="b-title">{m.place}</p><button class="b-close" onclick={() => flip(false)}>Back</button></div>
        {#if m.getIn}<p class="b-line"><b>Get in:</b> {m.getIn}</p>{/if}
        <p class="b-line">{m.why}</p>
        <p class="b-line muted">{m.address}</p>
        <div class="b-actions">
          <button class="pill" onclick={() => (app.where = m.id)}>On the map</button>
          <a class="pill ghost" href={apple} target="_blank" rel="noopener">Apple Maps</a>
          <a class="pill ghost" href={google} target="_blank" rel="noopener">Google Maps</a>
        </div>
        <p class="b-src">Checked {fmtDate(m.verifiedOn, { month: 'short', day: 'numeric' })}{#if m.sources?.length}: {#each m.sources.slice(0, 2) as s, i}{i ? ', ' : ''}<a href={s} target="_blank" rel="noopener">{host(s)}</a>{/each}{/if}</p>
      </div>
    </div>
    <div class="perf" aria-hidden="true"></div>
    {#if kept}
      <div class="ripped" style:clip-path="polygon({jag.join(',')}, 100% 100%, 0 100%)"><span class="stamp">Kept</span><span class="no">No. {serial}</span></div>
    {:else}
      <div class="tearoff" class:tearing bind:this={tearoff} onpointerdown={pullStart} onpointermove={pullMove} onpointerup={pullEnd} onpointercancel={pullEnd} role="presentation">
        <span class="no">No. {serial}{#if !compact}<small>/{total}</small>{/if}</span>
        <div class="acts">
          <button class="keep" onclick={tear}>Keep</button>
          <a class="go" href={apple} target="_blank" rel="noopener">Go</a>
        </div>
      </div>
    {/if}
  </article>
{/if}
</div>

<style>
  .wrap { --focus: var(--ink); filter: drop-shadow(0 1px 0 rgba(5, 39, 57, 0.08)) drop-shadow(0 16px 16px rgba(5, 39, 57, 0.24)); }
  .wrap :global(:focus-visible) { outline: 3px solid var(--focus) !important; outline-offset: 2px; }
  .stub { --notch: 9px; position: relative; display: block; color: var(--ink); background: var(--paper); border-radius: 4px;
    -webkit-mask: radial-gradient(circle var(--notch) at 0 0, transparent 98%, #000) top left / 51% 51% no-repeat, radial-gradient(circle var(--notch) at 100% 0, transparent 98%, #000) top right / 51% 51% no-repeat, radial-gradient(circle var(--notch) at 0 100%, transparent 98%, #000) bottom left / 51% 51% no-repeat, radial-gradient(circle var(--notch) at 100% 100%, transparent 98%, #000) bottom right / 51% 51% no-repeat;
    mask: radial-gradient(circle var(--notch) at 0 0, transparent 98%, #000) top left / 51% 51% no-repeat, radial-gradient(circle var(--notch) at 100% 0, transparent 98%, #000) top right / 51% 51% no-repeat, radial-gradient(circle var(--notch) at 0 100%, transparent 98%, #000) bottom left / 51% 51% no-repeat, radial-gradient(circle var(--notch) at 100% 100%, transparent 98%, #000) bottom right / 51% 51% no-repeat; }
  .faces { position: relative; display: grid; }
  .face { padding: 14px 16px 12px; min-width: 0; cursor: pointer; transition: opacity var(--t-ui), transform var(--t-ui); }
  .back { position: absolute; inset: 0; overflow-y: auto; opacity: 0; transform: rotateY(-8deg) translateX(8px); }
  .flipped .front { opacity: 0; transform: rotateY(8deg) translateX(-8px); }
  .flipped .back { opacity: 1; transform: none; }

  .top { margin: 0; font: 550 13.5px/1.2 var(--body); color: var(--muted); }
  .live { display: inline-flex; align-items: center; gap: 7px; color: var(--ink); }
  .best-at { margin-left: 10px; color: var(--muted); }
  .live i { width: 9px; height: 9px; border-radius: 50%; background: var(--mamey); box-shadow: 0 0 0 2px var(--ink); }
  .bar { position: relative; height: 10px; margin: 9px 0 14px 0; border-radius: 5px; background: oklch(0.93 0.012 80); overflow: hidden; }
  .bar i { position: absolute; top: 0; bottom: 0; width: calc(100% / 48 + 0.5px); background: color-mix(in oklch, var(--ink) 18%, var(--paper)); }
  .bar .best { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--ink); }
  .bar .now { position: absolute; top: -1px; bottom: -1px; width: 3px; margin-left: -1.5px; background: var(--mamey); border-radius: 2px; }
  .emblem { float: right; margin: 2px -4px 4px 10px; shape-outside: circle(50%); }
  .title { margin: 0; font: 400 30px/1.02 var(--display); letter-spacing: -0.005em; text-wrap: balance; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-variation-settings: 'XROT' 0, 'YROT' calc(var(--lean, 0) * -20); transition: font-variation-settings .5s cubic-bezier(.3, 1.4, .5, 1); }
  .note { margin: 10px 0 0; font: 520 17px/1.35 var(--body); font-variation-settings: 'CASL' 1, 'MONO' 0; text-wrap: pretty; }
  .meta { clear: both; margin: 12px 0 0; display: flex; align-items: center; gap: 4px 14px; font: 500 13.5px var(--body); color: var(--muted); flex-wrap: wrap; }
  .meta span:first-child { color: var(--ink); font-weight: 650; }
  .more { margin-left: auto; font: 650 13px var(--body); padding: 5px 11px; border-radius: 999px; border: 0; background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--line); cursor: pointer; }

  .b-top { display: flex; justify-content: space-between; align-items: start; gap: 8px; margin-bottom: 10px; }
  .b-title { margin: 0; font: 400 24px/1.05 var(--display); }
  .b-close { flex: none; font: 650 13px var(--body); padding: 5px 11px; border-radius: 999px; border: 0; background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--line); cursor: pointer; }
  .b-line { margin: 0 0 8px; font: 480 15px/1.4 var(--body); }
  .b-line b { font-weight: 700; }
  .b-line.muted { color: var(--muted); font-size: 14px; }
  .b-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
  .pill { font: 650 13.5px var(--body); padding: 9px 13px; border-radius: 999px; border: 0; background: var(--ink); color: var(--paper); text-decoration: none; cursor: pointer; }
  .pill.ghost { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--ink); }
  .b-src { margin: 0; font: 450 12.5px/1.4 var(--body); color: var(--muted); }
  .b-src a { color: var(--ink); }

  .perf { position: relative; height: 20px; }
  .perf::before { content: ''; position: absolute; left: 14px; right: 14px; top: 9px; border-top: 2px dashed var(--line); }
  .perf::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle 9px at 0 50%, var(--sky) 96%, transparent) left / 18px 20px no-repeat, radial-gradient(circle 9px at 100% 50%, var(--sky) 96%, transparent) right / 18px 20px no-repeat; }
  .tearoff { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 16px 14px; touch-action: pan-x; transform: translateY(var(--pull)) rotate(calc(var(--pull) * 0.06deg)); transition: transform 0.2s; cursor: grab; }
  .tearoff.tearing { opacity: 0; transition: opacity 0.12s; }
  .no { font: 600 13px var(--mono); font-variation-settings: 'MONO' 1; color: var(--ink); }
  .no small { color: var(--muted); font-weight: 500; }
  .acts { display: flex; gap: 8px; }
  .keep, .go { min-height: 44px; display: inline-grid; place-items: center; font: 650 15px var(--body); padding: 0 18px; border-radius: 999px; cursor: pointer; text-decoration: none; }
  .keep { background: transparent; color: var(--ink); border: 0; box-shadow: inset 0 0 0 1.5px var(--ink); }
  .go { background: var(--ink); color: var(--paper); }
  .keep:active, .go:active { transform: scale(0.97); }
  .ripped { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 14px; background: repeating-linear-gradient(-45deg, transparent 0 6px, color-mix(in oklch, var(--line) 45%, transparent) 6px 7px); }
  .stamp { font: 400 16px var(--display); letter-spacing: 0.06em; color: var(--mamey-deep); border: 2px solid currentColor; border-radius: 6px; padding: 2px 10px; transform: rotate(-6deg); animation: slap var(--t-paper) both; }
  @keyframes slap { from { transform: rotate(-6deg) scale(1.7); opacity: 0; } }

  .compact .face { padding: 12px 14px 10px; }
  .compact .title { font-size: 22px; }
  .compact .note { font-size: 15.5px; }
      .compact .tearoff { padding: 2px 14px 10px; }
  .compact .keep, .compact .go { min-height: 38px; font-size: 14px; padding: 0 14px; }

  .sealed { --focus: var(--paper); min-height: 260px; padding: 22px 20px; background: var(--ink); color: var(--paper); display: grid; align-content: end; gap: 6px; cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: manipulation; overflow: hidden; box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--paper) 30%, transparent); }
  .flap { position: absolute; inset: 0 0 auto; height: 56%; background: linear-gradient(to bottom right, transparent 49.6%, rgba(254, 250, 241, 0.3) 50%, transparent 50.4%), linear-gradient(to bottom left, transparent 49.6%, rgba(254, 250, 241, 0.3) 50%, transparent 50.4%); }
  .seal { position: absolute; top: 40%; left: 50%; width: 74px; height: 74px; margin: -37px 0 0 -37px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--paper) calc(var(--p) * 1turn), var(--mamey) 0); box-shadow: 0 0 0 4px var(--ink), 0 0 0 6px var(--mamey); transform: scale(calc(1 + var(--p) * 0.15)) rotate(calc(var(--p) * -20deg)); }
  .seal span { font: 400 18px var(--display); color: var(--ink); }
  .s-hood { margin: 0; font: 400 30px/1 var(--display); }
  .s-clue { margin: 0; font: 520 17px/1.35 var(--body); font-variation-settings: 'CASL' 1; }
  .s-hint { margin: 6px 0 0; font: 600 13px var(--body); color: var(--mamey); }
  @media (max-height: 760px) { .note { font-size: 16px; } .title { font-size: 27px; } }
  @media (prefers-reduced-motion: reduce) { .face, .tearoff, .stamp { transition: none; animation: none; } .back, .flipped .front { transform: none; } }
</style>
