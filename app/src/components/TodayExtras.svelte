<script>
  // Below the deck: your trip at a glance, and what's on tonight.
  import Flyer from './Flyer.svelte';
  import Icon from './Icon.svelte';
  import { app, trip } from '../lib/state.svelte.js';
  import { events, fmtDate } from '../lib/core.js';
  const tonight = $derived(events.filter((e) => e.date <= app.now.date && (e.endDate || e.date) >= app.now.date).slice(0, 4));
  const shows = $derived(trip.days.flatMap((d) => d.slots.filter((s) => s.event)).length);
  const stops = $derived(trip.days.flatMap((d) => d.slots.filter((s) => s.move)).length);
  const firstShow = $derived(trip.days.flatMap((d) => d.slots.filter((s) => s.event).map((s) => s.event))[0]);
  const daysTo = $derived(Math.round((new Date(trip.start + 'T12:00:00Z') - new Date(app.now.date + 'T12:00:00Z')) / 864e5));
</script>

{#if trip.days.length}
  <button class="tripticket" onclick={() => app.setTab('trip')}>
    <span class="tt-ic"><Icon name="trip" size={22} /></span>
    <span class="tt-main"><b>{daysTo > 0 ? `${daysTo} days` : daysTo === 0 ? 'Today' : 'Your trip'}</b><span>{daysTo > 0 && firstShow ? `to ${firstShow.title.split(':')[0]}` : `${fmtDate(trip.start, { month: 'short', day: 'numeric' })} to ${fmtDate(trip.end, { month: 'short', day: 'numeric' })}`}</span></span>
    <span class="tt-n"><b>{shows}</b>{shows === 1 ? 'show' : 'shows'}</span>
    <span class="tt-n"><b>{stops}</b>stops</span>
    <Icon name="right" size={18} />
  </button>
{/if}

{#if tonight.length}
  <section class="tonight" aria-label="On tonight">
    <h2>Tonight</h2>
    <div class="row">
      {#each tonight as e (e.id)}
        <button class="mini" onclick={() => app.setTab('wall')} aria-label="{e.title}, {e.venue}"><Flyer ev={e} /></button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .tripticket { all: unset; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--paper); color: var(--ink); border-radius: 4px; box-shadow: 0 12px 18px -12px rgba(5, 39, 57, 0.45); border-left: 3px dashed var(--line); }
  .tripticket:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
  .tripticket:active { transform: scale(0.99); }
  .tt-ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--mamey); color: var(--ink); flex: none; }
  .tt-main { display: grid; flex: 1; min-width: 0; }
  .tt-main b { font: 400 20px/1.05 var(--display); }
  .tt-main span { font: 550 13px var(--body); color: var(--muted); }
  .tt-n { display: grid; justify-items: center; font: 550 11.5px var(--body); color: var(--muted); }
  .tt-n b { font: 400 22px/1 var(--display); color: var(--ink); }
  .tonight { display: grid; gap: 8px; color: var(--text); }
  h2 { margin: 0; font: 400 22px/1 var(--display); }
  .row { display: flex; gap: 12px; overflow-x: auto; margin: 0 -16px; padding: 4px 16px 10px; scrollbar-width: none; }
  .row::-webkit-scrollbar { display: none; }
  .mini { all: unset; cursor: pointer; flex: none; width: 128px; filter: drop-shadow(0 8px 10px rgba(5, 39, 57, 0.28)); transition: transform 0.25s cubic-bezier(.3, 1.4, .5, 1); }
  .mini:nth-child(odd) { transform: rotate(-2deg); }
  .mini:nth-child(even) { transform: rotate(2deg); }
  .mini:hover { transform: rotate(0) translateY(-3px); }
  .mini:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
</style>
