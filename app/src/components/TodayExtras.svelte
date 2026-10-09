<script>
  // Below the deck: your trip at a glance, and what's on tonight.
  import Flyer from './Flyer.svelte';
  import Icon from './Icon.svelte';
  import { app, trip } from '../lib/state.svelte.js';
  import { events, fmtDate, fmtHour, daySpan, addDays } from '../lib/core.js';
  // Shows on your trip lead Tonight.
  const tonight = $derived(events.filter((e) => e.date <= app.now.date && (e.endDate || e.date) >= app.now.date)
    .sort((a, b) => trip.anchors.includes(b.id) - trip.anchors.includes(a.id)).slice(0, 4));
  const shows = $derived(trip.days.flatMap((d) => d.slots.filter((s) => s.event)).length);
  const stops = $derived(trip.days.flatMap((d) => d.slots.filter((s) => s.move)).length);
  const showDay = $derived(trip.days.find((d) => d.date >= app.now.date && d.slots.some((s) => s.event)));
  const nextShow = $derived(showDay?.slots.find((s) => s.event)?.event);
  const daysTo = $derived(daySpan(app.now.date, showDay?.date ?? trip.start));
  // During the trip the ticket names the next stop: '6pm, Phở Nam', then 'Doors 7pm, Kaseya Center'.
  // After midnight, last night's late stop (planned on the previous day at 24h and up) comes first.
  const next = $derived.by(() => {
    const spill = trip.days.find((d) => d.date === addDays(app.now.date, -1))?.slots.find((s) => s.at >= 24 && s.at - 24 >= app.hour - 0.25);
    return spill ?? trip.days.find((d) => d.date === app.now.date)?.slots.find((s) => s.at >= app.hour - 0.25);
  });
  const range = $derived(`${fmtDate(trip.start, { month: 'short', day: 'numeric' })} to ${fmtDate(trip.end, { month: 'short', day: 'numeric' })}`);
</script>

<button class="tripticket" onclick={() => app.setTab('trip', 'ticket')}>
    <span class="tt-ic"><Icon name="trip" size={22} /></span>
    {#if !trip.days.length}
      <span class="tt-main"><b>Your trip</b><span>Add your dates</span></span>
    {:else if next}
      <span class="tt-main"><b>{next.label === 'Doors' ? 'Doors ' : ''}{fmtHour(next.at % 24, true)}</b><span>{next.event ? next.event.venue : next.move.place}</span></span>
    {:else}
      <span class="tt-main"><b>{daysTo > 0 ? `${daysTo} ${daysTo === 1 ? 'day' : 'days'}` : daysTo === 0 ? 'Today' : 'Your trip'}</b><span>{daysTo > 0 && nextShow ? `to ${nextShow.title.split(':')[0]}` : range}</span></span>
    {/if}
    {#if trip.days.length}
      <span class="tt-n"><b>{shows}</b>{shows === 1 ? 'show' : 'shows'}</span>
      <span class="tt-n"><b>{stops}</b>stops</span>
    {/if}
    <Icon name="right" size={18} />
  </button>

{#if tonight.length}
  <section class="tonight" aria-label="On tonight">
    <h2>Tonight</h2>
    <div class="row">
      {#each tonight as e (e.id)}
        <button class="mini" onclick={() => app.setTab('wall', 'flyer')} aria-label="{e.title}, {e.venue}"><Flyer ev={e} /></button>
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
