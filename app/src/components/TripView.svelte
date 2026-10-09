<script>
  import { track } from '@vercel/analytics';
  // The stay as a strip of stubs, one perforated band per day. Built from real opening hours,
  // real sunsets, travel time and the events you pick.
  import Stub from './Stub.svelte';
  import Flyer from './Flyer.svelte';
  import { app, trip } from '../lib/state.svelte.js';
  import { fmtDate, fmtHour, hm, addDays, dowOf, daySpan, mapsHref } from '../lib/core.js';
  import { radioKeys } from '../lib/a11y.js';

  const today = $derived(app.now.date);
  const sat = $derived(addDays(today, (6 - dowOf(today) + 7) % 7));
  const presets = $derived([
    { k: 'summit', label: 'John Summit weekend', start: '2026-11-20', end: '2026-11-24', anchor: (e) => e.id.includes('john-summit') },
    { k: 'weekend', label: 'This weekend', start: today, end: addDays(sat, 1), anchor: () => false },
    { k: 'basel', label: 'Art Basel week', start: '2026-12-03', end: '2026-12-06', anchor: (e) => e.id === 'art-basel-miami-beach-2026' },
  ]);
  const preset = $derived(presets.find((p) => p.start === trip.start && p.end === trip.end)?.k ?? 'custom');
  const datesSet = (via) => track('Trip dates set', { nights: String(Math.max(0, daySpan(trip.start, trip.end))), via });
  // Inputs persist only when someone changes them, so a visitor who only looks saves nothing.
  function use(p) { trip.start = p.start; trip.end = p.end; trip.swaps = {}; trip.focusDay = 0; trip.anchors = trip.inRange.filter(p.anchor).map((e) => e.id); trip.persist(); datesSet(p.k); }
  const ENERGY = [['low', 'Low-key', 0.3], ['mid', 'Balanced', 0.6], ['loud', 'Loud', 0.92]];
  const band = $derived(trip.wild < 0.45 ? 'low' : trip.wild < 0.8 ? 'mid' : 'loud');
  const step = (k, d) => { trip[k] = Math.min(23.5, Math.max(5, trip[k] + d)); trip.persist(); };
  let copied = $state(''), fallback = $state(''), ta = $state();
  async function copy() {
    const lines = [`psst. Miami, ${fmtDate(trip.start, { month: 'short', day: 'numeric' })} to ${fmtDate(trip.end, { month: 'short', day: 'numeric' })}`];
    for (const d of trip.days) {
      lines.push('', fmtDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase() + (d.weather ? `  ${d.weather.hi}°${d.weather.kind === 'typical' ? ' typical' : ''}` : '') + `  sunset ${fmtHour(d.sun.set)}`);
      for (const s of d.slots) {
        const o = s.event || s.move; const locked = s.move && s.move.secret === 2 && !app.unlocked.includes(s.move.id);
        lines.push(`${fmtHour(s.at % 24, true).padEnd(7)} ${s.event ? s.event.title + ' @ ' + s.event.venue + (s.label === 'Doors' ? ', doors' : '') : locked ? 'A secret. Open it in psst.' : o.place + ', ' + o.hood}`);
      }
    }
    let link = ''; try { link = location.protocol.startsWith('http') && !/claude\.ai/.test(location.host) ? `${location.origin}${location.pathname}?code=${code}&trip=${trip.start}_${trip.end}${trip.anchors.length ? '&a=' + trip.anchors.join(',') : ''}` : ''; } catch {}
    lines.push('', link ? `Open it: ${link}` : `Code ${code} unlocks a secret in psst.`, 'No refunds on sunsets.');
    const text = lines.join('\n');
    try { await navigator.clipboard.writeText(text); copied = 'Copied.'; fallback = ''; track('Plan copied', { days: String(trip.days.length), result: 'copied' }); }
    catch { copied = 'Select and copy:'; fallback = text; requestAnimationFrame(() => ta?.select()); track('Plan copied', { days: String(trip.days.length), result: 'manual' }); }
  }
  const code = $derived.by(() => {
    let h = 2166136261; for (const c of JSON.stringify(trip.days.map((d) => d.slots.map((x) => (x.move || x.event).id)))) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let out = ''; for (let i = 0; i < 5; i++) { out += A[h % A.length]; h = Math.floor(h / A.length) || (h ^ 0x9e3779b9) >>> 0; }
    return 'PINA-' + out;
  });
  const nights = $derived(trip.days.length - 1);
  const stops = $derived(trip.days.reduce((a, d) => a + d.slots.length, 0));
</script>

<section class="trip">
  <h1>Your trip</h1>
  <div class="presets">{#each presets as p}<button class:on={preset === p.k} onclick={() => use(p)}>{p.label}</button>{/each}</div>

  <div class="slip">
    <label><span>Arrive</span><input type="date" id="trip-start" name="arrive" autocomplete="off" bind:value={trip.start} min={today} max="2026-12-31" onchange={() => { trip.persist(); datesSet('custom'); }} /></label>
    <label><span>Leave</span><input type="date" id="trip-end" name="leave" autocomplete="off" bind:value={trip.end} min={trip.start} max="2026-12-31" onchange={() => { trip.persist(); datesSet('custom'); }} /></label>
    <div class="stepper"><span>Landing</span><div><button onclick={() => step('arrive', -0.5)} aria-label="Land earlier">−</button><b>{fmtHour(trip.arrive)}</b><button onclick={() => step('arrive', 0.5)} aria-label="Land later">+</button></div></div>
    <div class="stepper"><span>Flight out</span><div><button onclick={() => step('depart', -0.5)} aria-label="Leave earlier">−</button><b>{fmtHour(trip.depart)}</b><button onclick={() => step('depart', 0.5)} aria-label="Leave later">+</button></div></div>
    <div class="seg" role="radiogroup" aria-label="Energy" tabindex="-1" onkeydown={radioKeys}>{#each ENERGY as [k, label, v]}<button role="radio" aria-checked={band === k} tabindex={band === k ? 0 : -1} class:on={band === k} onclick={() => { trip.wild = v; trip.persist(); }}>{label}</button>{/each}</div>
  </div>

  {#if trip.inRange.length}
    <div class="events">
      <h2>On during your dates</h2>
      <div class="evs">
        {#each trip.inRange.slice(0, 14) as e (e.id)}
          <button class:on={trip.anchors.includes(e.id)} aria-pressed={trip.anchors.includes(e.id)} onclick={() => trip.toggleAnchor(e.id)}>
            <span class="d">{e.date < trip.start ? `thru ${fmtDate(e.endDate, { weekday: 'short', day: 'numeric' })}` : fmtDate(e.date, { weekday: 'short', day: 'numeric' })}</span><span class="n">{e.title}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if trip.days.length}
    {#each trip.days as d, di (d.date)}
      <div class="day" class:focus={trip.focusDay === di}>
        <button class="dh" onclick={() => (trip.focusDay = di)}>
          <span class="dn">{fmtDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <span class="dm">{#if d.weather}<span>{d.weather.hi}° {d.weather.kind === 'typical' ? 'typical' : 'forecast'}</span>{/if}<span>Sunset {fmtHour(d.sun.set, true)}</span></span><span class="vh">. Show on the map</span>
        </button>
        {#if d.wet}<p class="note">Rain likely. Covered spots only.</p>{/if}
        {#each d.slots as s (s.key)}
          <div class="slot">
            <div class="when"><b>{fmtHour(s.at % 24, true)}</b><span>{s.label}</span></div>
            <div class="obj">
              {#if s.event}
                <div class="evstub">
                  <div class="art"><Flyer ev={s.event} mini /></div>
                  <div class="ev-t"><b>{s.event.title}</b><span class="venue">{s.event.venue}{s.event.doors && s.event.time ? `, show ${fmtHour(hm(s.event.time), true)}` : ''}</span>
                    <span class="links">{#if s.event.url}<a href={s.event.url} target="_blank" rel="noopener">Tickets</a>{/if}<a href={mapsHref(s.event.venue, s.event.address, s.event.lat, s.event.lng)} target="_blank" rel="noopener">Go</a></span></div>
                  {#if s.event.getThere || s.event.bring || s.event.after}
                    <dl class="tips">{#each [['Get there', s.event.getThere], ['Bring', s.event.bring], ['After', s.event.after]].filter((x) => x[1]) as [k, t]}<dt>{k}</dt><dd>{t}</dd>{/each}</dl>
                  {/if}
                </div>
              {:else}
                <Stub item={{ m: s.move, sealed: s.move.secret === 2 }} compact at={s.at % 24} dow={(d.dow + (s.at >= 24 ? 1 : 0)) % 7} />
                {#if s.options > 1}<button class="swap" onclick={() => trip.swap(d.date, s.key)}>Swap</button>{/if}
              {/if}
            </div>
          </div>
        {/each}
        {#if !d.slots.length}<p class="note">Travel day.</p>{/if}
      </div>
    {/each}
    <div class="codebox"><b>{code}</b><span class="small">Paste it with the plan. Unlocks a secret.</span></div>
    <button class="copy" onclick={copy}>Copy plan</button>
    {#if copied}<p class="note" role="status">{copied}</p>{/if}
    {#if fallback}<textarea class="fallback" readonly rows="10" bind:this={ta}>{fallback}</textarea>{/if}
  {:else}
    <p class="note">Dates through Dec 31.</p>
  {/if}
</section>

<style>
  .trip { display: grid; gap: 16px; color: var(--text); }
  h1 { margin: 0; font: 400 44px/0.95 var(--display); text-shadow: var(--shade, none); }
  h2 { margin: 0; font: 400 20px/1 var(--display); }
  .presets, .evs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; margin: 0 -16px; padding-inline: 16px; }
  .presets::-webkit-scrollbar, .evs::-webkit-scrollbar { display: none; }
  .presets button, .evs button { flex: none; white-space: nowrap; }
  .presets button { font: 650 14px var(--body); padding: 9px 14px; border-radius: 999px; border: 0; cursor: pointer; background: transparent; color: var(--text); box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--text) 35%, transparent); }
  .presets button.on { background: var(--text); color: var(--sky); box-shadow: none; }
  .slip { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; padding: 14px; background: var(--paper); color: var(--ink); border-radius: 4px; box-shadow: 0 12px 20px -12px rgba(5, 39, 57, 0.4); }
  .slip label, .stepper { display: grid; gap: 4px; min-width: 0; }
  .slip span { font: 600 12.5px var(--body); color: var(--muted); }
  .slip input { font: 600 15px var(--mono); font-variation-settings: 'MONO' 1; color: var(--ink); background: transparent; border: 0; border-bottom: 2px dashed var(--line); padding: 6px 0; width: 100%; min-width: 0; color-scheme: light; }
  .stepper div { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px dashed var(--line); }
  .stepper b { font: 600 15px var(--mono); font-variation-settings: 'MONO' 1; }
  .stepper button { width: 36px; height: 36px; border: 0; background: transparent; font: 600 20px var(--body); color: var(--ink); cursor: pointer; }
  .seg { grid-column: 1 / -1; display: flex; padding: 3px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px var(--ink); }
  .seg button { flex: 1; font: 650 14px var(--body); padding: 8px 6px; border-radius: 999px; border: 0; background: transparent; color: var(--ink); cursor: pointer; }
  .seg button.on { background: var(--ink); color: var(--paper); }
  .events { display: grid; gap: 10px; }
  .evs button { display: inline-flex; gap: 8px; align-items: baseline; font: 600 13.5px var(--body); padding: 8px 12px; border-radius: 4px; border: 0; cursor: pointer; background: color-mix(in oklch, var(--paper) 92%, transparent); color: var(--ink); text-align: left; }
  .evs button.on { background: var(--ink); color: var(--paper); }
  .evs .d { font: 500 11px var(--mono); font-variation-settings: 'MONO' 1; opacity: 0.75; white-space: nowrap; }
  .day { display: grid; gap: 12px; padding-top: 14px; border-top: 2px dashed color-mix(in oklch, var(--text) 35%, transparent); }
  .dh { all: unset; cursor: pointer; display: grid; gap: 4px; }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .dh:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
  .dn { font: 400 26px/1 var(--display); }
  .focus .dn { text-decoration: underline; text-decoration-color: var(--mamey); text-decoration-thickness: 4px; text-underline-offset: 6px; }
  .dm { display: flex; flex-wrap: wrap; gap: 4px 14px; font: 600 13px var(--body); opacity: 0.9; }
  .slot { display: grid; grid-template-columns: 62px 1fr; gap: 10px; align-items: start; }
  .when { display: grid; gap: 2px; padding-top: 8px; }
  .when b { font: 600 14px var(--mono); font-variation-settings: 'MONO' 1; }
  .when span { font: 600 12px var(--body); opacity: 0.92; }
  .obj { display: grid; gap: 6px; min-width: 0; }
  .swap { justify-self: start; font: 600 13px var(--body); padding: 6px 12px; border-radius: 999px; border: 0; background: transparent; color: var(--text); box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--text) 35%, transparent); cursor: pointer; }
  .evstub { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 10px; background: var(--paper); color: var(--ink); border-radius: 4px; box-shadow: 0 14px 16px -12px rgba(5, 39, 57, 0.45); }
  .ev-t { display: grid; gap: 3px; align-content: start; min-width: 0; }
  .ev-t b { font: 400 22px/1.05 var(--display); }
  .ev-t .venue { font-size: 13.5px; color: var(--muted); }
  .ev-t .links { display: flex; gap: 16px; margin-top: 4px; }
  .tips { grid-column: 1 / -1; margin: 2px 0 0; padding-top: 10px; border-top: 2px dashed var(--line); display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
  .tips dt { font: 650 13px/1.45 var(--body); color: var(--muted); }
  .tips dd { margin: 0; font: 500 14px/1.4 var(--body); font-variation-settings: 'CASL' 1; }
  .ev-t a { font: 650 14px var(--body); color: var(--ink); padding: 6px 0; }
  .note { margin: 0; font: 500 14px/1.4 var(--body); font-variation-settings: 'CASL' 1; opacity: 0.9; }
  .codebox { display: grid; gap: 4px; padding: 14px; background: var(--paper); color: var(--ink); border-radius: 4px; border: 2px dashed var(--line); }
  .codebox b { font: 400 30px/1 var(--display); letter-spacing: 0.04em; }
  .codebox .small { font: 500 13.5px/1.35 var(--body); font-variation-settings: 'CASL' 1; color: var(--muted); }
  .fallback { width: 100%; font: 500 13px var(--mono); font-variation-settings: 'MONO' 1; padding: 10px; border-radius: 4px; border: 0; background: var(--paper); color: var(--ink); }
  .copy { font: 700 16px var(--body); padding: 14px; border-radius: 999px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; }
  :global(.dark) .copy { background: var(--paper); color: var(--ink); }
</style>
