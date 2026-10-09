<script>
  // Where to sleep: hotels as key fobs on a reception rack, one row per price tier.
  import Icon from './Icon.svelte';
  import hotels from '../lib/hotels.json';
  import { app } from '../lib/state.svelte.js';
  import { km } from '../lib/core.js';
  import { onMount, tick } from 'svelte';
  import { radioKeys } from '../lib/a11y.js';

  const TIERS = [
    [1, '$', 'Under $200 a night'], [2, '$$', '$200 to $350'], [3, '$$$', '$350 to $650'], [4, '$$$$', '$650 and up'],
  ];
  const INK = { 1: ['#4AC9EC', '#052739'], 2: ['#117555', '#FEFAF1'], 3: ['#733EA4', '#FEFAF1'], 4: ['#052739', '#FED252'] };
  let swing = $state(null), only = $state(0), entered = $state(false);
  const shown = $derived(TIERS.filter(([t]) => !only || only === t));
  const sel = $derived(hotels.find((h) => h.id === app.stayFocus));
  const KASEYA = { lat: 25.7814, lng: -80.187 };
  const toKaseya = (h) => { const d = km(h, KASEYA); return d < 1.6 ? `~${Math.max(5, Math.round((d / 4.8) * 12) * 5)} min walk to Kaseya` : `~${Math.max(10, Math.round(((0.2 + d / 26) * 60) / 5) * 5)} min to Kaseya by car`; };
  const priceOf = (h) => h.nightly || (h.price.match(/\$\s?(\d[\d,]*)/) || [])[1];
  const keyed = (h) => (h.perks || []).some((p) => /michelin keys?/i.test(p)) || /michelin key/i.test(h.why || '');
  function tap(h) {
    swing = null; requestAnimationFrame(() => (swing = h.id));
    app.stayFocus = app.stayFocus === h.id ? null : h.id;
  }
  onMount(() => { requestAnimationFrame(() => (entered = true)); });
  $effect(() => { const id = app.stayFocus; if (id) document.getElementById('fob-' + id)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
</script>

<section class="stay">
  <h1>Stay</h1>
  <div class="tiers" role="radiogroup" aria-label="Price" tabindex="-1" onkeydown={radioKeys}>
    <button role="radio" aria-checked={only === 0} tabindex={only === 0 ? 0 : -1} class:on={only === 0} onclick={() => (only = 0)}>Any</button>
    {#each TIERS as [t, sym]}<button role="radio" aria-checked={only === t} tabindex={only === t ? 0 : -1} class:on={only === t} onclick={() => (only = t)}>{sym}</button>{/each}
  </div>

  {#if !hotels.length}
    <p class="note">Hotels soon.</p>
  {/if}

  {#each shown as [t, sym, range] (t)}
    {@const row = hotels.filter((h) => h.tier === t)}
    {#if row.length}
      <div class="rack">
        <p class="rl"><b>{sym}</b> {range}{#if row.some(keyed)}<span class="mk">★ Michelin Key</span>{/if}</p>
        <div class="hooks">
          {#each row as h, k (h.id)}
            <button class="fob" id="fob-{h.id}" class:swing={swing === h.id} class:hello={entered} style:--k={k} class:active={app.stayFocus === h.id} onclick={() => tap(h)} aria-expanded={app.stayFocus === h.id}>
              <span class="hook" aria-hidden="true"></span>
              <svg viewBox="0 0 80 156" aria-hidden="true">
                <path d="M40 6 Q46 6 50 12 L74 66 Q78 75 74 84 L50 144 Q46 152 40 152 Q34 152 30 144 L6 84 Q2 75 6 66 L30 12 Q34 6 40 6 Z" fill={INK[t][0]} stroke="rgba(0,0,0,.15)" stroke-width="1.5" />
                <circle cx="40" cy="26" r="7" fill="var(--sky)" stroke="rgba(0,0,0,.2)" stroke-width="1.5" />
                <text x="40" y="78" text-anchor="middle" font-family="Tilt Warp, system-ui" font-size={h.word.length > 7 ? 11 : 14} fill={INK[t][1]}>{h.word}</text>
                <text x="40" y="104" text-anchor="middle" font-family="Recursive, monospace" font-size="12" font-weight="700" fill={INK[t][1]} opacity=".85">{priceOf(h) ? '$' + priceOf(h) : sym}</text>
                {#if keyed(h)}<path d="M40 118l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" fill="#FED252" />{/if}
              </svg>
              <span class="hn">{h.name}<small><span class="vh">, </span>{h.hood}</small></span>
            </button>
          {/each}
        </div>
        {#if sel && sel.tier === t}
          <div class="card">
            <div class="ct"><h2>{sel.name}</h2><button class="x" onclick={async () => { const id = app.stayFocus; app.stayFocus = null; await tick(); document.getElementById('fob-' + id)?.focus(); }} aria-label="Close"><Icon name="close" size={18} /></button></div>
            <p class="hood"><Icon name="pin" size={16} />{sel.hood}<span class="kz">{toKaseya(sel)}</span></p>
            <p class="move">{sel.theMove}</p>
            <p class="why">{sel.why}</p>
            {#if sel.perks?.length}<div class="perks">{#each sel.perks as p}<span>{p}</span>{/each}</div>{/if}
            <p class="price"><b>{sel.nightly ? `$${sel.nightly} a night${sel.feeIncluded ? ' with resort fee' : ''}` : sel.price}</b><span>Nov 20 to 24, before tax. Google Hotels, Oct 2.</span></p>
            <div class="acts">
              <a class="pill" href={sel.url} target="_blank" rel="noopener">Book <Icon name="external" size={15} /></a>
              <button class="pill ghost" onclick={() => (app.whereHotel = sel.id)}><Icon name="map" size={16} />On the map</button>
            </div>
            <p class="src">Checked Oct 2{#if sel.sources?.length}: {#each sel.sources.slice(0, 2) as s, i}{i ? ', ' : ''}<a href={s} target="_blank" rel="noopener">{host(s)}</a>{/each}{/if}</p>
          </div>
        {/if}
      </div>
    {/if}
  {/each}
</section>

<style>
  .stay { display: grid; gap: 16px; color: var(--text); }
  h1 { margin: 0; font: 400 44px/0.95 var(--display); }
  .tiers { display: flex; gap: 6px; }
  .tiers button { min-width: 52px; height: 40px; font: 700 14px var(--mono); font-variation-settings: 'MONO' 1; border-radius: 999px; border: 0; cursor: pointer; background: transparent; color: var(--text); box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--text) 30%, transparent); }
  .tiers button.on { background: var(--text); color: var(--sky); box-shadow: none; }
  .note { margin: 0; font: 520 16px var(--body); }
  .rack { background: var(--ink); color: var(--paper); border-radius: 6px; padding: 12px 12px 14px; box-shadow: 0 16px 24px -14px rgba(5, 39, 57, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.08); display: grid; gap: 6px; }
  .rl { margin: 0; font: 500 13px var(--body); opacity: 0.85; }
  .rl .mk { margin-left: 10px; color: #FED252; font-weight: 600; }
  .rl b { font: 700 14px var(--mono); font-variation-settings: 'MONO' 1; color: #FED252; margin-right: 6px; }
  .hooks { display: flex; gap: 10px; overflow-x: auto; padding: 10px 2px 4px; scrollbar-width: none; }
  .hooks::-webkit-scrollbar { display: none; }
  .fob { all: unset; cursor: pointer; flex: none; width: 84px; display: grid; justify-items: center; gap: 6px; position: relative; transform-origin: 50% 16px; }
  .fob svg { width: 64px; height: 124px; filter: drop-shadow(0 8px 6px rgba(0, 0, 0, 0.35)); transition: transform 0.2s; }
  .fob.active svg { transform: translateY(4px) scale(1.04); }
  .hook { width: 10px; height: 10px; border-radius: 50%; background: #C9A54B; box-shadow: 0 0 0 2px #8A6E2A; margin-bottom: -18px; z-index: 1; }
  .fob.swing { animation: swing 0.9s cubic-bezier(.3, .5, .4, 1); }
  @keyframes swing { 0% { transform: rotate(0); } 20% { transform: rotate(10deg); } 45% { transform: rotate(-7deg); } 70% { transform: rotate(3deg); } 100% { transform: rotate(0); } }
  .hn { font: 600 12px/1.2 var(--body); text-align: center; max-width: 84px; opacity: 0.95; display: grid; gap: 2px; }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .hn small { font: 500 10.5px var(--body); opacity: 0.7; }
  .fob.hello { animation: swing 0.9s cubic-bezier(.3, .5, .4, 1) both; animation-delay: calc(var(--k) * 70ms); }
  .kz { margin-left: 10px; font-weight: 500; }
  .fob:focus-visible { outline: 3px solid #FED252; outline-offset: 4px; border-radius: 8px; }
  .card { background: var(--paper); color: var(--ink); border-radius: 4px; padding: 16px; display: grid; gap: 8px; margin-top: 6px; animation: open 0.28s cubic-bezier(.2, .8, .2, 1); }
  @keyframes open { from { transform: translateY(-8px); opacity: 0; } }
  .ct { display: flex; justify-content: space-between; gap: 8px; align-items: start; }
  h2 { margin: 0; font: 400 26px/1.05 var(--display); }
  .x { border: 0; background: transparent; color: var(--ink); cursor: pointer; padding: 4px; border-radius: 50%; }
  .hood { margin: 0; display: flex; gap: 6px; align-items: center; font: 600 14px var(--body); color: var(--muted); }
  .move { margin: 0; font: 520 17px/1.35 var(--body); font-variation-settings: 'CASL' 1; }
  .why { margin: 0; font: 480 15px/1.4 var(--body); }
  .perks { display: flex; gap: 6px; flex-wrap: wrap; }
  .perks span { font: 600 12.5px var(--body); padding: 4px 10px; border-radius: 999px; background: color-mix(in oklch, var(--ink) 7%, var(--paper)); }
  .price { margin: 0; display: grid; gap: 2px; font: 500 12.5px var(--body); color: var(--muted); }
  .price b { font: 400 22px/1.1 var(--display); color: var(--ink); }
  .acts { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill { display: inline-flex; align-items: center; gap: 6px; font: 650 14px var(--body); padding: 10px 14px; border-radius: 999px; border: 0; background: var(--ink); color: var(--paper); text-decoration: none; cursor: pointer; }
  .pill.ghost { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--ink); }
  .src { margin: 0; font: 450 12px var(--body); color: var(--muted); }
  .src a { color: var(--ink); }
  @media (prefers-reduced-motion: reduce) { .fob.swing, .fob.hello, .card { animation: none; } }
</style>
