<script>
  import { onMount, tick } from 'svelte';
  import MiamiMap from './components/MiamiMap.svelte';
  import SkyFx from './components/SkyFx.svelte';
  import Wordmark from './components/Wordmark.svelte';
  import TimeHead from './components/TimeHead.svelte';
  import Deck from './components/Deck.svelte';
  import Later from './components/Later.svelte';
  import TodayExtras from './components/TodayExtras.svelte';
  import Where from './components/Where.svelte';
  import TripView from './components/TripView.svelte';
  import WallView from './components/WallView.svelte';
  import StayView from './components/StayView.svelte';
  import BookView from './components/BookView.svelte';
  import Icon from './components/Icon.svelte';
  import hotels from './lib/hotels.json';
  import { app, trip, codeFromUrl } from './lib/state.svelte.js';
  import { miamiNow, fmtHour, fmtDate, weatherFor, moves, hm } from './lib/core.js';
  import { PAPER, INK, MAMEY } from './lib/sky.js';

  let wide = $state(false), map = $state(), scroller = $state();
  const wx = $derived(weatherFor(app.now.date));
  // The forecast's temperature at the hour on the clock; typical days show the usual high.
  const temp = $derived(wx?.hourly?.[Math.floor(app.hour) % 24]?.[0] ?? wx?.hi);
  const top = $derived(app.pad[app.padPos]);
  const focus = $derived(app.where || (app.tab === 'today' && top && !top.sealed ? top.m.id : null));
  const evWord = (t = '') => { const w = t.split(':')[0].trim().split(/\s+/); return w.length === 2 ? w[1] : w[0]; };
  const pins = $derived.by(() => {
    if (!wide) return [];
    if (app.tab === 'today') return app.pad.filter((x) => !x.sealed).map((x) => ({ id: x.m.id, lat: x.m.lat, lng: x.m.lng, move: x.m, active: top?.m.id === x.m.id, tag: fmtHour(hm(x.m.best), true), label: `${x.m.title}, show this move`, onclick: () => { app.padId = x.m.id; app.flipped = null; } }));
    if (app.tab === 'trip' && trip.days.length) {
      const d = trip.days[Math.min(trip.focusDay, trip.days.length - 1)];
      return d.slots.filter((s) => s.move || s.event).map((s, n) => {
        const o = s.move || s.event;
        return { id: 'trip-' + o.id, lat: o.lat, lng: o.lng, move: s.move || { id: o.id, hood: o.hood, category: 'music', word: evWord(o.title), place: o.venue }, active: !!s.event, tag: `${n + 1}  ${fmtHour(s.at % 24, true)}`, label: o.title || o.place };
      });
    }
    if (app.tab === 'stay') return hotels.filter((h) => !app.stayTier || h.tier === app.stayTier || h.id === app.stayFocus).map((h) => ({ id: h.id, lat: h.lat, lng: h.lng, move: { id: h.id, hood: h.hood, category: 'stay', word: h.word, place: h.name }, active: app.stayFocus === h.id, tag: '$'.repeat(h.tier), label: h.name, onclick: () => (app.stayFocus = h.id) }));
    return [];
  });
  const route = $derived.by(() => {
    if (app.tab !== 'trip' || !trip.days.length) return [];
    const d = trip.days[Math.min(trip.focusDay, trip.days.length - 1)];
    return d.slots.map((s) => s.event || s.move).filter(Boolean);
  });
  const vars = $derived(`--sky:${app.sky};--text:${app.text};--paper:${PAPER};--ink:${INK};--mamey:${MAMEY};--mamey-deep:#BF4922;--muted:#485E6C;--line:#D8D0C3`);
  const full = $derived(wide && (app.tab === 'wall' || app.tab === 'book'));
  const anyWhere = $derived(!!(app.where || app.whereHotel));

  $effect(() => {
    document.body.style.background = app.sky; document.documentElement.style.background = app.sky; document.documentElement.style.colorScheme = app.dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', app.sky);
  });
  $effect(() => { if (map && route.length && app.tab === 'trip') map.fitPoints(route); });
  $effect(() => { const id = app.where; if (!map || !id) return; const m = moves.find((x) => x.id === id); if (m) map.flyTo(m.lat, m.lng, wide ? 0.9 : 0.7); });
  $effect(() => { const id = app.whereHotel; if (!map || !id) return; const h = hotels.find((x) => x.id === id); if (h) map.flyTo(h.lat, h.lng, wide ? 0.9 : 0.7); });
  $effect(() => { if (!map || app.tab !== 'stay' || !wide || !hotels.length) return; const list = hotels.filter((h) => !app.stayTier || h.tier === app.stayTier); map.fitPoints(list.length ? list : hotels); });
  // Desktop: picking a hotel in the rack brings its pin into view.
  $effect(() => { const id = app.stayFocus; if (!map || !wide || !id) return; const h = hotels.find((x) => x.id === id); if (h) map.flyTo(h.lat, h.lng); });
  $effect(() => { app.tab; scroller?.scrollTo?.({ top: 0 }); });

  onMount(() => {
    const mq = matchMedia('(min-width: 900px)'); const set = () => (wide = mq.matches); set(); mq.addEventListener('change', set);
    codeFromUrl();
    const tick = setInterval(() => { app.now = miamiNow(); if (app.following) app.hour = app.now.hour; }, 30000);
    return () => { clearInterval(tick); mq.removeEventListener('change', set); };
  });
  const TABS = [['today', 'Today', 'today'], ['trip', 'Trip', 'trip'], ['wall', 'Events', 'events'], ['stay', 'Stay', 'stay'], ['book', 'Kept', 'kept']];
  // Closing the full-screen map puts focus back where it was: the move's card or the hotel's key fob.
  async function leaveWhere() {
    const id = app.where, hid = app.whereHotel;
    app.where = null; app.whereHotel = null; if (!wide) map?.recenter();
    await tick();
    (hid ? document.getElementById('fob-' + hid) : document.querySelector(`#back-${id} .pill`) || document.getElementById('sb-' + id) || document.querySelector('.stack .more'))?.focus();
  }
</script>

<div class="app" class:wide class:dark={app.dark} style={vars}>
  {#if !anyWhere}<a class="skip" href="#main">Skip to content</a>{/if}
  {#if !wide && !anyWhere}
    <nav class="tabbar" aria-label="Sections">
      {#each TABS as [k, label, ic]}
        <button data-tab={k} class:on={app.tab === k} aria-current={app.tab === k ? 'page' : undefined} onclick={() => app.setTab(k)}>
          <span class="ti"><Icon name={ic} size={22} />{#if k === 'book' && app.kept.length}<i>{app.kept.length}</i>{/if}</span><span class="tl">{label}</span>
        </button>
      {/each}
    </nav>
  {/if}

  {#if anyWhere}
    <Where onclose={leaveWhere} />
  {:else}
    <main class="col" class:full id="main" tabindex="-1" bind:this={scroller}>
      <header class="top">
        <Wordmark size={wide ? 40 : 34} />
        <p class="today"><span>Miami, {fmtDate(app.now.date, { weekday: 'short' })} {fmtDate(app.now.date, { month: 'short', day: 'numeric' })}</span>{#if wx}<span>{temp}° {wx.kind === 'typical' ? 'typical' : 'forecast'}</span>{/if}</p>
      </header>
      {#if wide}
        <nav class="tabs" aria-label="Sections">{#each TABS as [k, label, ic]}<button data-tab={k} class:on={app.tab === k} aria-current={app.tab === k ? 'page' : undefined} onclick={() => app.setTab(k)}><Icon name={ic} size={18} />{label}{#if k === 'book' && app.kept.length}<i>{app.kept.length}</i>{/if}</button>{/each}</nav>
      {/if}

      {#if app.tab === 'today'}
        <TimeHead big={wide ? 120 : 80} />
        <Deck />
        <TodayExtras />
        {#if !wide}<Later />{/if}
      {:else if app.tab === 'trip'}
        <TripView />
      {:else if app.tab === 'wall'}
        <WallView wide={full} />
      {:else if app.tab === 'stay'}
        <StayView />
      {:else}
        <BookView />
      {/if}
    </main>
    {#if wide && app.tab === 'today'}<div class="laterdock"><Later /></div>{/if}
  {/if}

  <div class="mapwrap" role="region" aria-label="Map" class:where={anyWhere} class:live={wide || anyWhere} class:dim={app.tab === 'wall' || app.tab === 'book'}>
    <MiamiMap bind:this={map} {pins} {route} {focus} interactive={wide || anyWhere} labels={wide || anyWhere} quiet={!wide && !anyWhere} paused={!anyWhere && (app.tab === 'wall' || app.tab === 'book')} cluster={app.tab === 'stay'}
      inset={wide ? { left: full ? 0 : 500, top: 70, bottom: app.tab === 'today' ? 150 : 40, right: 20 } : { left: 0, top: 70, bottom: anyWhere ? 260 : 0 }} />
  </div>
  {#if !anyWhere && (app.tab === 'today' || !wide)}<SkyFx />{/if}
  <div class="toast" class:show={!!app.toast} role="status" aria-live="polite">{app.toast}</div>
</div>

<style>
  :global(*) { box-sizing: border-box; }
  :global(html), :global(body) { height: 100%; margin: 0; }
  :global(body) { -webkit-font-smoothing: antialiased; transition: background-color 0.9s; -webkit-tap-highlight-color: transparent; }
  .app { --display: 'Tilt Warp', 'Arial Rounded MT Bold', system-ui, sans-serif; --body: 'Recursive', ui-sans-serif, system-ui, sans-serif; --mono: 'Recursive', ui-monospace, Menlo, monospace;
    --t-ui: 240ms cubic-bezier(.2, .8, .2, 1); --t-paper: 520ms cubic-bezier(.3, 1.35, .5, 1);
    position: fixed; inset: 0; background: var(--sky); color: var(--text); font: 450 16px/1.45 var(--body); overflow: hidden; transition: background-color 0.25s; }
  .app :global(button), .app :global(a), .app :global([role='button']) { touch-action: manipulation; }
  .app :global(:focus-visible) { outline: 3px solid var(--text); outline-offset: 2px; }
  .skip { position: absolute; left: 12px; top: -60px; z-index: 30; padding: 10px 14px; border-radius: 999px; background: var(--ink); color: var(--paper); font: 650 14px var(--body); }
  .skip:focus { top: 12px; }
  main:focus { outline: none; }
  .mapwrap { position: absolute; inset: 0; z-index: 0; pointer-events: none; transition: opacity 0.4s; }
  .mapwrap.live { pointer-events: auto; }
  .mapwrap.dim { opacity: 0.22; }
  .mapwrap:not(.live) { -webkit-mask: linear-gradient(#000 0, #000 150px, transparent 330px); mask: linear-gradient(#000 0, #000 150px, transparent 330px); }
  .wide .mapwrap { -webkit-mask: linear-gradient(90deg, transparent 0 470px, #000 560px); mask: linear-gradient(90deg, transparent 0 470px, #000 560px); }
  .mapwrap.where, .wide .mapwrap.where { -webkit-mask: none; mask: none; }
  .col { position: absolute; inset: 0; z-index: 2; scroll-padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 96px); overflow-y: auto; overscroll-behavior: contain; padding: calc(env(safe-area-inset-top, 0px) + 14px) 16px calc(env(safe-area-inset-bottom, 0px) + 104px); display: grid; align-content: start; gap: 18px; scrollbar-width: none; }
  .col::-webkit-scrollbar { display: none; }
  .wide .col { scroll-padding-bottom: 40px; right: auto; width: 500px; padding: 26px 30px 40px; gap: 20px; }
  .wide .col.full { right: 0; width: auto; padding-inline: 40px; }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 42px; }
  .today { margin: 0; display: flex; gap: 12px; font: 600 13px var(--body); flex-wrap: wrap; justify-content: flex-end; }
  .tabs { display: flex; gap: 4px; margin-top: -6px; flex-wrap: wrap; }
  .tabs button { display: inline-flex; align-items: center; gap: 6px; font: 650 14.5px var(--body); padding: 8px 13px 8px 10px; border: 0; cursor: pointer; border-radius: 999px; background: transparent; color: var(--text); }
  .tabs button.on { background: var(--text); color: var(--sky); }
  .tabs i { font-style: normal; font: 700 11px var(--mono); font-variation-settings: 'MONO' 1; padding: 1px 6px; border-radius: 999px; background: var(--mamey); color: var(--ink); }
  .laterdock { z-index: 2; position: absolute; left: 520px; right: 24px; bottom: 18px; }
  .tabbar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 5; display: flex; justify-content: space-around; padding: 8px 6px calc(env(safe-area-inset-bottom, 0px) + 8px); background: var(--paper); box-shadow: 0 -1px 0 rgba(5, 39, 57, 0.08), 0 -10px 24px rgba(5, 39, 57, 0.12); }
  .tabbar button { flex: 1; display: grid; justify-items: center; gap: 3px; padding: 4px 0; min-height: 50px; border: 0; background: transparent; color: var(--muted); cursor: pointer; font: 650 11.5px var(--body); }
  .tabbar button:focus-visible { outline-color: var(--ink); }
  .ti { position: relative; width: 52px; height: 30px; border-radius: 999px; display: grid; place-items: center; transition: background 0.2s, transform 0.2s cubic-bezier(.3, 1.6, .5, 1); }
  .tabbar button.on { color: var(--ink); }
  .tabbar button.on .ti { background: var(--ink); color: var(--paper); transform: translateY(-1px); }
  .tabbar button:active .ti { transform: scale(0.92); }
  .ti i { position: absolute; top: -6px; right: 2px; font-style: normal; font: 700 10.5px var(--mono); font-variation-settings: 'MONO' 1; padding: 1px 5px; border-radius: 999px; background: var(--mamey); color: var(--ink); }
  .toast { position: absolute; z-index: 20; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 90px); transform: translate(-50%, 16px); max-width: calc(100% - 32px); font: 650 15px var(--body); background: var(--ink); color: var(--paper); padding: 11px 18px; border-radius: 999px; box-shadow: 0 10px 24px rgba(5, 39, 57, 0.3); opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.24s cubic-bezier(.3, 1.4, .5, 1); }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
  .wide .toast { bottom: 28px; left: 250px; }
  @media (prefers-reduced-motion: reduce) { :global(body), .app, .toast { transition: none; } }
</style>
