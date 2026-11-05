<script lang="ts">
  // Kept: what you tore off, soonest first, and the stickers you've collected by neighborhood. No slots to fill, no count.
  import Sticker from './Sticker.svelte';
  import { app } from '../lib/state.svelte';
  import { moves, events, fmtDate, fmtHour, hm, openAt, mapsHref } from '../lib/core';
  import { track } from '@vercel/analytics';
  import type { Move } from '../lib/types';
  const GROUPS = [
    ['Little Havana', ['Little Havana']], ['Downtown and Brickell', ['Downtown', 'Brickell']], ['Wynwood, Edgewater, Allapattah', ['Wynwood', 'Edgewater', 'Allapattah']],
    ['Little Haiti to MiMo', ['Design District', 'Little River', 'Little Haiti', 'MiMo']], ['The Beach', ['South Beach', 'Mid-Beach', 'North Beach']],
    ['Gables and the Grove', ['Coral Gables', 'Coconut Grove']], ['The Keys', ['Key Biscayne', 'Virginia Key']], ['South Dade', ['South Miami-Dade']],
  ];
  const pages = $derived(GROUPS.map(([name, hoods]) => ({ name, list: moves.filter((m) => hoods.includes(m.hood) && app.kept.includes(m.id)) })).filter((p) => p.list.length));
  const held = $derived(events.filter((e) => app.heldEvents.includes(e.id) && (e.endDate || e.date) >= app.now.date));
  // Yours: what you kept, soonest best hour first, with Go and Went.
  const yours = $derived(moves.filter((m) => app.kept.includes(m.id))
    .map((m) => ({ m, open: openAt(m, app.now.dow, app.now.hour), wait: (hm(m.best) - app.now.hour + 24) % 24 }))
    .sort((a, b) => a.wait - b.wait));
  const went = (m: Move): void => { if (!app.went.includes(m.id)) track('Went'); app.toggle('went', m.id); };
</script>

<section class="book">
  <h1>Kept</h1>

  {#if yours.length}
    <section class="yours" aria-label="Yours">
      <h2>Yours</h2>
      {#each yours as { m, open } (m.id)}
        <div class="row">
          <button class="sb" onclick={() => (app.where = m.id)} aria-label="{m.place} on the map"><Sticker move={m} size={46} tilt={false} /></button>
          <div class="rt">
            <b>{m.title}</b>
            <span class="rm"><span>{m.hood}</span><span class:live={open}>{open ? 'Open now' : `Best ${fmtHour(hm(m.best), true)}`}</span></span>
          </div>
          <div class="ra">
            <a class="go" href={mapsHref(m.place, m.address, m.lat, m.lng)} target="_blank" rel="noopener">Go</a>
            <button class="went" class:on={app.went.includes(m.id)} aria-pressed={app.went.includes(m.id)} onclick={() => went(m)}>{app.went.includes(m.id) ? 'Went' : 'Went?'}</button>
          </div>
        </div>
      {/each}
    </section>
  {:else}
    <p class="hint">Tear a stub to keep it.</p>
  {/if}

  {#each pages as p (p.name)}
    <div class="page">
      <h2>{p.name}</h2>
      <div class="slots">
        {#each p.list as m (m.id)}
          <div class="slot k">
            <button class="sb" id="sb-{m.id}" onclick={() => (app.where = m.id)} aria-label="{m.place} on the map"><Sticker move={m} size={58} /></button>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  {#if held.length}
    <div class="page">
      <h2>Saved events</h2>
      {#each held as e (e.id)}<p class="held">{fmtDate(e.date, { month: 'short', day: 'numeric' })}: {e.title}, {e.venue}</p>{/each}
    </div>
  {/if}

  <p class="credits">Checked Oct 2, 2026. Map <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>. Weather <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>.</p>

</section>

<style>
  .book { display: grid; gap: 16px; color: var(--text); }
  h1 { margin: 0; font: 400 var(--fs-title)/0.95 var(--display); }
  .page { background: var(--paper); color: var(--ink); border-radius: 4px; padding: 16px; display: grid; gap: 12px; box-shadow: 0 14px 18px -14px rgba(5, 39, 57, 0.45); }
  h2 { margin: 0; display: flex; justify-content: space-between; align-items: baseline; font: 400 var(--fs-xxl)/1 var(--display); }
  .slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px 8px; }
  .slot { display: grid; justify-items: center; gap: 3px; text-align: center; padding: 6px 2px; }
  .sb { all: unset; cursor: pointer; border-radius: 12px; }
  .sb:focus-visible { outline: 3px solid var(--ink); }
  .went { font: 600 var(--fs-s) var(--body); padding: 4px 10px; border-radius: 999px; border: 0; background: transparent; box-shadow: inset 0 0 0 1.5px var(--ink); color: var(--ink); cursor: pointer; }
  .went.on { background: var(--ink); color: var(--paper); }
  .held { margin: 0; font-size: var(--fs-m); }
  .yours { background: var(--paper); color: var(--ink); border-radius: 4px; padding: 16px 16px 6px; display: grid; box-shadow: 0 14px 18px -14px rgba(5, 39, 57, 0.45); }
  .yours h2 { margin-bottom: 6px; }
  .row { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 10px 0; border-top: 2px dashed var(--line); }
  .rt { display: grid; gap: 3px; min-width: 0; }
  .rt b { font: 400 var(--fs-l)/1.1 var(--display); }
  .rm { display: flex; flex-wrap: wrap; gap: 2px 12px; font: 500 var(--fs-s) var(--body); color: var(--muted); }
  .rm .live { color: var(--ink); font-weight: 650; }
  .rm .live::before { content: ''; display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; background: var(--mamey); box-shadow: 0 0 0 2px var(--ink); vertical-align: 1px; }
  .ra { display: grid; gap: 6px; justify-items: stretch; }
  .go { font: 650 var(--fs-s) var(--body); padding: 7px 14px; border-radius: 999px; background: var(--ink); color: var(--paper); text-decoration: none; text-align: center; }
  .hint { margin: 0; font: 520 var(--fs-l) var(--body); font-variation-settings: 'CASL' 1; }
  .credits { margin: 0; font: 500 var(--fs-s)/1.45 var(--body); opacity: 0.8; }
  .credits a { color: inherit; }
</style>
