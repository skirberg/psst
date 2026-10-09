<script>
  // What's on: flyers on a wall. Tear a tab to add the event to your trip.
  import Flyer from './Flyer.svelte';
  import Icon from './Icon.svelte';
  import { app, trip } from '../lib/state.svelte.js';
  import { track } from '@vercel/analytics';
  import { events, addDays, dowOf, fmtDate, fmtHour, hm, mapsHref } from '../lib/core.js';
  import { radioKeys } from '../lib/a11y.js';
  let { wide = false } = $props();

  // Ranges follow the clock: nothing that has already happened, and months that are over drop off.
  const today = $derived(app.now.date);
  const from = (d) => (d > today ? d : today);
  const ranges = $derived([
    ['tonight', 'Tonight', today, today],
    ['weekend', 'This weekend', today, addDays(today, (7 - dowOf(today)) % 7)],
    ['stay', 'Your trip', null, null],
    ['oct', 'Oct', from('2026-10-01'), '2026-10-31'], ['nov', 'Nov', from('2026-11-01'), '2026-11-30'], ['dec', 'Dec', from('2026-12-01'), '2026-12-31'],
  ].filter((x) => (x[0] === 'stay' ? trip.hasDates : x[3] >= today)));
  let pick = $state(trip.end >= app.now.date ? 'stay' : 'tonight');
  const r = $derived.by(() => { const x = ranges.find((y) => y[0] === pick) ?? ranges[0]; return x[0] === 'stay' ? [x[0], x[1], from(trip.start), trip.end] : x; });
  const list = $derived(events.filter((e) => (e.endDate || e.date) >= r[2] && e.date <= r[3]));
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 3);
  let open = $state(null);
  const inStay = (e) => (e.endDate || e.date) >= trip.start && e.date <= trip.end;
  const added = (e) => trip.anchors.includes(e.id) || app.heldEvents.includes(e.id);
  function tearTab(e) {
    if (added(e)) {
      trip.anchors = trip.anchors.filter((x) => x !== e.id); trip.persist();
      app.heldEvents = app.heldEvents.filter((x) => x !== e.id); app.persist();
      app.say('Off your trip.'); return;
    }
    track('Event added', { trip: String(inStay(e)) });
    if (inStay(e)) { if (!trip.anchors.includes(e.id)) { trip.anchors = [...trip.anchors, e.id]; trip.persist(); } app.say(`On your trip: ${fmtDate(e.date, { weekday: 'short' })}.`); }
    else { if (!app.heldEvents.includes(e.id)) { app.heldEvents = [...app.heldEvents, e.id]; app.persist(); } app.say('Saved to Kept.'); }
  }
</script>

<section class="wall" class:wide>
  <h1>Events</h1>
  <div class="chips" role="radiogroup" aria-label="When" tabindex="-1" onkeydown={radioKeys}>
    {#each ranges as [k, label]}<button role="radio" aria-checked={r[0] === k} tabindex={r[0] === k ? 0 : -1} class:on={r[0] === k} onclick={() => (pick = k)}>{label}</button>{/each}
  </div>
  <div class="grid">
    {#each list as e, i (e.id)}
      <article class="post" style:--r="{(hash(e.id) % 7) - 3}deg" style:--i={i}>
        <button class="face" onclick={() => (open = open === e.id ? null : e.id)} aria-expanded={open === e.id}><Flyer ev={e} /></button>
        <button class="tabs" class:torn={added(e)} onclick={() => tearTab(e)}>
          <span></span><span class="lab">{added(e) ? 'Saved' : inStay(e) ? `Add to ${fmtDate(e.date < trip.start ? trip.start : e.date, { weekday: 'short' })}` : 'Save'}</span><span></span>
        </button>
        {#if open === e.id}
          <div class="info">
            {#if e.why}<p>{e.why}</p>{/if}
            <p class="m"><Icon name="pin" size={15} />{e.venue}{e.doors ? `, doors ${fmtHour(hm(e.doors), true)}` : ''}{e.time && e.time !== e.doors ? `, show ${fmtHour(hm(e.time), true)}` : ''}{e.price ? `, ${e.price}` : ''}</p>
            {#if e.getThere || e.bring || e.after}<dl class="tips">{#each [['Get there', e.getThere], ['Bring', e.bring], ['After', e.after]].filter((x) => x[1]) as [k, t]}<dt>{k}</dt><dd>{t}</dd>{/each}</dl>{/if}
            <div class="links">{#if e.url}<a href={e.url} target="_blank" rel="noopener">Tickets <Icon name="external" size={14} /></a>{/if}<a href={mapsHref(e.venue, e.address, e.lat, e.lng)} target="_blank" rel="noopener">Go <Icon name="external" size={14} /></a></div>
          </div>
        {/if}
      </article>
    {:else}
      <p class="none">{pick === 'tonight' ? 'Quiet tonight.' : 'Nothing on those dates yet.'}</p>
    {/each}
  </div>
</section>

<style>
  .wall { display: grid; gap: 14px; color: var(--text); }
  h1 { margin: 0; font: 400 44px/0.95 var(--display); }
  .chips { display: flex; gap: 6px; overflow-x: auto; margin: 0 -16px; padding: 0 16px 2px; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chips button { flex: none; font: 650 14px var(--body); padding: 8px 13px; border-radius: 999px; border: 0; background: transparent; color: var(--text); box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--text) 30%, transparent); cursor: pointer; }
  .chips button.on { background: var(--text); color: var(--sky); box-shadow: none; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 14px; align-items: start; }
  .wide .grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 30px 22px; max-width: 1180px; }
  .post { transform: rotate(var(--r)); display: grid; filter: drop-shadow(0 12px 12px rgba(5, 39, 57, 0.28)); transition: transform 0.3s cubic-bezier(.3, 1.4, .5, 1); animation: paste 0.5s cubic-bezier(.2, .9, .3, 1.2) both; animation-delay: calc(min(var(--i), 10) * 40ms); }
  @keyframes paste { from { transform: rotate(calc(var(--r) * 4)) translateY(-16px) scale(1.05); opacity: 0; } }
  .post:hover { transform: rotate(0deg) translateY(-3px); }
  .face { all: unset; cursor: pointer; display: block; }
  .face:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
  .tabs { all: unset; cursor: pointer; display: grid; grid-template-columns: 1fr 2fr 1fr; background: var(--paper); color: var(--ink); border-top: 2px dashed var(--line); }
  .tabs span { font: 650 11.5px var(--body); text-align: center; padding: 9px 2px 10px; border-left: 1px dashed var(--line); white-space: nowrap; overflow: hidden; text-overflow: clip; }
  .tabs span:first-child { border-left: 0; }
  .tabs .lab { font-weight: 750; }
  .tabs:focus-visible { outline: 3px solid var(--text); outline-offset: 2px; }
  .torn { background: color-mix(in oklch, var(--paper) 82%, var(--mamey)); }
  .info { background: var(--paper); color: var(--ink); padding: 10px 12px 12px; display: grid; gap: 6px; font-size: 14px; }
  .info p { margin: 0; }
  .info .m { display: flex; gap: 5px; align-items: flex-start; font: 550 13px var(--body); color: var(--muted); }
  .info a { display: inline-flex; gap: 5px; align-items: center; font-weight: 650; color: var(--ink); }
  .info .tips { margin: 0; display: grid; gap: 2px; }
  .info dd + dt { margin-top: 6px; }
  .info dt { font: 650 12.5px/1.45 var(--body); color: var(--muted); }
  .info dd { margin: 0; font: 500 13.5px/1.4 var(--body); font-variation-settings: 'CASL' 1; }
  .info .links { display: flex; gap: 18px; }
  .info .links a { padding: 4px 0; }
  .none { margin: 0; font: 520 16px var(--body); }
  @media (prefers-reduced-motion: reduce) { .post { transition: none; animation: none; } }
</style>
