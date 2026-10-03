<script>
  // Today's deck: the best move for this hour on top. Fling it to see the next one,
  // pick a mood, or hit psst to shuffle and get dealt one.
  import Stub from './Stub.svelte';
  import Sticker from './Sticker.svelte';
  import Icon from './Icon.svelte';
  import { app, MOODS } from '../lib/state.svelte.js';
  import { fmtHour } from '../lib/core.js';

  const pad = $derived(app.pad);
  const i = $derived(app.padPos);
  const item = $derived(pad[i]);
  const behind = $derived([1, 2].map((k) => pad[(i + k) % pad.length]).filter((x, k) => x && pad.length > k + 1));
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICON = { all: 'all', coffee: 'coffee', eat: 'eat', drink: 'drink', dance: 'dance', outside: 'outside', art: 'art', secret: 'secret' };
  let dealtSlap = $state(false);

  let dx = $state(0), dragging = $state(false), flinging = $state(0), shuffling = $state(false);
  let sx = null, sy = null, moved = 0;
  function go(d) {
    if (pad.length < 2) return;
    app.flipped = null;
    app.padId = pad[(i + d + pad.length) % pad.length].m.id;
  }
  function down(e) {
    if (e.target.closest('.tearoff, button, a, [role=button], .back')) return;
    sx = e.clientX; sy = e.clientY; moved = 0; dragging = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function move(e) {
    if (sx == null) return;
    const ddx = e.clientX - sx, ddy = e.clientY - sy;
    if (Math.abs(ddy) > Math.abs(ddx) * 1.2 && Math.abs(dx) < 8) { sx = null; dragging = false; dx = 0; return; }
    moved = Math.abs(ddx); dx = ddx;
  }
  async function up() {
    if (sx == null) return;
    sx = null; dragging = false;
    if (Math.abs(dx) > 90 && pad.length > 1) {
      const dir = dx < 0 ? 1 : -1;
      flinging = -dir;
      await new Promise((r) => setTimeout(r, reduce ? 0 : 200));
      dx = 0; flinging = 0; go(dir);
    } else dx = 0;
  }
  function clickCapture(e) { if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; } }
  function key(e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } }

  async function psst() {
    const pool = pad.filter((x) => !x.sealed && x.m.id !== item?.m.id);
    if (!pool.length) return;
    shuffling = true;
    try { navigator.vibrate?.(10); } catch {}
    await new Promise((r) => setTimeout(r, reduce ? 0 : 620));
    const w = pool.map((x, k) => 1 / (k + 1.5)), total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total, pick = pool[0];
    for (let k = 0; k < pool.length; k++) { r -= w[k]; if (r <= 0) { pick = pool[k]; break; } }
    app.flipped = null; app.padId = pick.m.id; shuffling = false;
    dealtSlap = true; try { navigator.vibrate?.(12); } catch {} setTimeout(() => (dealtSlap = false), 600);
  }
</script>

<section class="deck" aria-label="Moves for this hour">
  <div class="moods" role="radiogroup" aria-label="Mood">
    {#each MOODS as [k, label]}
      <button role="radio" aria-checked={app.mood === k} class:on={app.mood === k} onclick={() => { app.mood = k; app.padId = null; app.flipped = null; }}>
        <span class="ic"><Icon name={ICON[k]} size={22} /></span><span class="lb">{label}</span>
      </button>
    {/each}
  </div>

  {#if item}
    <div class="stack" class:shuffling role="group" aria-roledescription="deck" aria-label="{i + 1} of {pad.length}" tabindex="-1" onkeydown={key}>
      {#each behind as b, k (b.m.id + 'b')}
        <div class="under u{k}" aria-hidden="true">
          {#if k === 0}
            {#if b.sealed}<div class="ub sealedb"><span>psst</span></div>
            {:else}<div class="ub"><Sticker move={b.m} size={40} tilt={false} /><span>{b.m.title}</span></div>{/if}
          {/if}
        </div>
      {/each}
      {#key item.m.id + (item.sealed ? 's' : '')}
        <div class="topcard" class:dragging class:fling={flinging !== 0}
          style:--dx="{flinging ? flinging * 520 : dx}px" style:--rot="{(flinging ? flinging * 520 : dx) * 0.045}deg"
          onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onclickcapture={clickCapture} role="presentation">
          <div class="dealt" class:slap={dealtSlap}><Stub {item} /></div>
        </div>
      {/key}
    </div>
    <div class="controls">
      <button class="nav" onclick={() => go(-1)} aria-label="Previous move" disabled={pad.length < 2}><Icon name="left" size={20} /></button>
      <span class="count">{i + 1}/{pad.length}</span>
      <button class="psst" onclick={psst} aria-label="Shuffle and deal me one move"><Icon name="shuffle" size={18} /><span>psst</span></button>
      <button class="nav" onclick={() => go(1)} aria-label="Next move" disabled={pad.length < 2}><Icon name="right" size={20} /></button>
    </div>
  {:else}
    <div class="empty">
      <p class="e1">Nothing {app.mood === 'all' ? '' : MOODS.find((x) => x[0] === app.mood)[1].toLowerCase() + ' '}open at {fmtHour(app.hour, true)}.</p>
      {#if app.mood !== 'all'}<button class="reset" onclick={() => (app.mood = 'all')}>Show everything</button>{:else}<p class="e2">Drag the sun forward.</p>{/if}
    </div>
  {/if}
</section>

<style>
  .deck { display: grid; gap: 14px; }
  .moods { display: flex; gap: 4px; overflow-x: auto; margin: 0 -16px; padding: 2px 16px 4px; scrollbar-width: none; -webkit-mask: linear-gradient(90deg, #000 85%, transparent); mask: linear-gradient(90deg, #000 85%, transparent); }
  .moods::-webkit-scrollbar { display: none; }
  .moods button { flex: none; display: grid; justify-items: center; gap: 4px; width: 50px; border: 0; background: transparent; color: var(--text); cursor: pointer; padding: 0; font: 600 12px var(--body); }
  .ic { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--text) 30%, transparent); transition: transform 0.18s cubic-bezier(.3, 1.6, .5, 1), background 0.2s; }
  .moods button:active .ic { transform: scale(0.9); }
  .moods button.on .ic { background: var(--text); color: var(--sky); box-shadow: none; transform: scale(1.06); }
  .lb { opacity: 0.85; }
  .moods button.on .lb { opacity: 1; }

  .stack { position: relative; padding-bottom: 30px; outline: none; }
  .under { position: absolute; left: 0; right: 0; bottom: 0; height: 64px; border-radius: 4px; background: color-mix(in oklch, var(--paper) 94%, var(--ink)); box-shadow: 0 10px 16px rgba(5, 39, 57, 0.2); transition: transform 0.3s cubic-bezier(.3, 1.3, .5, 1); }
  .u0 { transform: translateY(16px) rotate(-1.4deg) scale(0.97); z-index: 1; }
  .u1 { transform: translateY(26px) rotate(1.8deg) scale(0.93); z-index: 0; background: color-mix(in oklch, var(--paper) 86%, var(--ink)); }
  .ub { position: absolute; left: 14px; right: 14px; bottom: 4px; display: flex; align-items: center; gap: 10px; color: var(--ink); font: 400 15px/1.1 var(--display); white-space: nowrap; overflow: hidden; }
  .ub span { overflow: hidden; text-overflow: ellipsis; }
  .sealedb { justify-content: center; }
  .u0 .sealedb, .u1 .sealedb { color: var(--paper); }
  .under:has(.sealedb) { background: var(--ink); }
  .shuffling .u0 { animation: fanL 0.62s cubic-bezier(.4, 0, .2, 1); }
  .shuffling .u1 { animation: fanR 0.62s cubic-bezier(.4, 0, .2, 1); }
  .shuffling .topcard { animation: lift 0.62s cubic-bezier(.4, 0, .2, 1); }
  @keyframes fanL { 40% { transform: translate(-46%, -160px) rotate(-18deg); } }
  @keyframes fanR { 40% { transform: translate(46%, -120px) rotate(16deg); } }
  @keyframes lift { 35% { transform: translateY(40px) scale(0.92) rotate(3deg); } 70% { transform: translateY(-14px) rotate(-2deg); } }
  .topcard { position: relative; z-index: 2; transform: translateX(var(--dx)) rotate(var(--rot)); transition: transform 0.35s cubic-bezier(.3, 1.4, .5, 1); touch-action: pan-y; }
  .topcard.dragging { transition: none; }
  .topcard.fling { transition: transform 0.2s ease-in; }
  .dealt { animation: deal 0.42s cubic-bezier(.2, .9, .3, 1.15); }
  .dealt.slap :global(.emblem) { animation: stick 0.5s cubic-bezier(.3, 1.6, .5, 1); }
  @keyframes stick { from { transform: scale(1.8) rotate(-20deg); opacity: 0; } }
  @keyframes deal { from { transform: translateY(26px) rotate(-3deg) scale(0.96); opacity: 0.4; } }

  .controls { display: flex; align-items: center; justify-content: center; gap: 14px; color: var(--text); margin-top: 14px; }
  .nav { width: 44px; height: 44px; border-radius: 50%; border: 0; background: transparent; color: var(--text); display: grid; place-items: center; cursor: pointer; }
  .nav:disabled { opacity: 0.3; }
  .count { font: 600 13px var(--mono); font-variation-settings: 'MONO' 1; min-width: 38px; text-align: center; }
  .hint { opacity: 0.7; }
  .psst { display: inline-flex; align-items: center; gap: 8px; height: 50px; padding: 0 22px; border-radius: 999px; border: 0; cursor: pointer; background: var(--mamey); color: var(--ink); font: 400 22px var(--display); box-shadow: 0 6px 0 var(--mamey-deep), 0 12px 20px rgba(5, 39, 57, 0.25); transition: transform 0.12s, box-shadow 0.12s; }
  .psst:active { transform: translateY(5px); box-shadow: 0 1px 0 var(--mamey-deep), 0 4px 10px rgba(5, 39, 57, 0.25); }

  .empty { padding: 26px 20px; border-radius: 4px; background: var(--paper); color: var(--ink); display: grid; gap: 10px; justify-items: start; }
  .e1 { margin: 0; font: 400 26px/1.05 var(--display); }
  .e2 { margin: 0; font: 520 16px var(--body); font-variation-settings: 'CASL' 1; }
  .reset { font: 650 14px var(--body); padding: 9px 14px; border-radius: 999px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .dealt, .shuffling .u0, .shuffling .u1, .shuffling .topcard { animation: none; } .topcard { transition: none; } }
</style>
