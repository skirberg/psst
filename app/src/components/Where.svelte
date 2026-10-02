<script>
  // The map goes full screen; the move or hotel rides along at the bottom.
  import Sticker from './Sticker.svelte';
  import Icon from './Icon.svelte';
  import hotels from '../lib/hotels.json';
  import { app } from '../lib/state.svelte.js';
  import { moves, openAt, hm, fmtHour } from '../lib/core.js';
  let { onclose } = $props();
  let back = $state();
  const m = $derived(app.where ? moves.find((x) => x.id === app.where) : null);
  const h = $derived(app.whereHotel ? hotels.find((x) => x.id === app.whereHotel) : null);
  const o = $derived(m || h);
  const status = $derived(m ? (openAt(m, app.dow, app.hour) ? (app.following ? 'Open now' : `Open at ${fmtHour(app.hour, true)}`) : `Best at ${fmtHour(hm(m.best), true)}`) : h ? '$'.repeat(h.tier) : '');
  const apple = $derived(o && `https://maps.apple.com/?q=${encodeURIComponent(o.place || o.name)}&ll=${o.lat},${o.lng}`);
  const google = $derived(o && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((o.place || o.name) + ' ' + o.address)}`);
  function key(e) { if (e.key === 'Escape') onclose(); }
  $effect(() => { back?.focus(); });
</script>

<svelte:window onkeydown={key} />
{#if o}
  <div class="where" role="dialog" aria-modal="true" aria-label="{o.place || o.name} on the map">
    <button class="back" bind:this={back} onclick={onclose}><Icon name="left" size={18} />Back</button>
    <div class="card">
      <Sticker move={m || { id: h.id, hood: h.hood, category: 'stay', word: h.word, place: h.name }} size={64} />
      <div class="txt">
        <p class="st">{status}<span>{o.hood}</span></p>
        <h2>{o.place || o.name}</h2>
        <p class="addr">{o.address}</p>
        <div class="acts">
          <a class="pill" href={apple} target="_blank" rel="noopener">Apple Maps</a>
          <a class="pill ghost" href={google} target="_blank" rel="noopener">Google Maps</a>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .where { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
  .back { pointer-events: auto; position: absolute; top: calc(env(safe-area-inset-top, 0px) + 14px); left: 16px; display: inline-flex; align-items: center; gap: 6px; font: 650 14.5px var(--body); padding: 10px 16px 10px 12px; border-radius: 999px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; box-shadow: 0 8px 20px rgba(5, 39, 57, 0.3); }
  .card { pointer-events: auto; position: absolute; left: 16px; right: 16px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); max-width: 460px; display: flex; gap: 14px; align-items: flex-start; padding: 16px; background: var(--paper); color: var(--ink); border-radius: 4px; box-shadow: 0 18px 30px -12px rgba(5, 39, 57, 0.5); animation: rise 0.24s cubic-bezier(.2, .8, .2, 1); }
  @keyframes rise { from { transform: translateY(14px); opacity: 0; } }
  .txt { min-width: 0; display: grid; gap: 4px; }
  .st { margin: 0; display: flex; gap: 12px; font: 600 13px var(--body); color: var(--muted); }
  .st span { color: var(--ink); }
  h2 { margin: 0; font: 400 24px/1.05 var(--display); }
  .addr { margin: 0; font-size: 14px; color: var(--muted); }
  .acts { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
  .pill { font: 650 14px var(--body); padding: 9px 14px; border-radius: 999px; background: var(--ink); color: var(--paper); text-decoration: none; }
  .pill.ghost { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--ink); }
  .where :global(:focus-visible) { outline: 3px solid var(--mamey) !important; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
</style>
