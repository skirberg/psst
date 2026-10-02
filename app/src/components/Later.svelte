<script>
  // Later today: small stubs along the rest of the day. Tapping one moves the sun to that hour.
  import { app } from '../lib/state.svelte.js';
  import { fmtHour } from '../lib/core.js';
  let { row = true } = $props();
</script>

{#if app.later.length}
  <section class="later" class:row aria-label="Later today">
    <h2>Later</h2>
    <div class="strip">
      {#each app.later as x (x.m.id)}
        <button class="mini" onclick={() => app.scrubTo(x.b)}>
          <span class="t">{fmtHour(x.b, true)}{x.t >= 24 ? ' tmrw' : ''}</span>
          <span class="n">{x.m.title}</span>
          <span class="h">{x.m.hood}</span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .later { display: grid; gap: 8px; color: var(--text); min-width: 0; }
  h2 { margin: 0; font: 400 22px/1 var(--display); }
  .strip { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .strip::-webkit-scrollbar { display: none; }
  .mini { all: unset; cursor: pointer; flex: none; width: 150px; min-height: 92px; scroll-snap-align: start; display: grid; align-content: start; gap: 4px; padding: 10px 12px; background: var(--paper); color: var(--ink); border-radius: 3px; box-shadow: 0 8px 14px -8px rgba(5, 39, 57, 0.45); border-left: 2px dashed var(--line); }
  .mini:hover { transform: translateY(-2px); }
  .mini:focus-visible { outline: 3px solid var(--text); outline-offset: 2px; }
  .t { font: 600 12px var(--mono); font-variation-settings: 'MONO' 1; letter-spacing: 0.04em; }
  .n { font: 600 13.5px/1.25 var(--body); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .h { font: 500 10.5px var(--mono); font-variation-settings: 'MONO' 1; color: var(--muted); letter-spacing: 0.04em; margin-top: auto; }
</style>
