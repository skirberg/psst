<script>
  // The sky has weather: clouds by day, stars after dark, rain when the forecast says so.
  import { app } from '../lib/state.svelte.js';
  let rs = 42; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 46 }, () => ({ x: rnd() * 100, y: rnd() * 100, s: 1 + rnd() * 1.8, d: rnd() * 4, t: 2.5 + rnd() * 3 }));
  const drops = Array.from({ length: 70 }, () => ({ x: rnd() * 100, d: rnd() * 1.2, t: 0.55 + rnd() * 0.4, l: 10 + rnd() * 16 }));
  const clouds = [{ y: 8, s: 1.2, t: 140, d: -30 }, { y: 26, s: 0.8, t: 190, d: -120 }, { y: 44, s: 1, t: 160, d: -70 }];
  const cloudTint = $derived(app.phase === 'golden' ? '#FFE3C4' : app.phase === 'dawn' ? '#FFE9EE' : '#FFFFFF');
</script>

<div class="fx" aria-hidden="true">
  {#if !app.dark}
    {#each clouds as c}
      <svg class="cloud" viewBox="0 0 200 70" style:top="{c.y}%" style:--s={c.s} style:--t="{c.t}s" style:--d="{c.d}s">
        <path d="M30 60c-16 0-26-9-26-20s10-19 24-19c4-11 15-18 28-18 15 0 27 9 30 21 4-2 8-3 13-3 15 0 27 9 29 21 2-1 5-1 8-1 14 0 24 8 24 19s-10 20-24 20z" fill={cloudTint} />
      </svg>
    {/each}
  {:else}
    {#each stars as s}<i class="star" style:left="{s.x}%" style:top="{s.y}%" style:--s="{s.s}px" style:--d="{s.d}s" style:--t="{s.t}s"></i>{/each}
  {/if}
  {#if app.wet}
    {#each drops as r}<i class="drop" style:left="{r.x}%" style:--d="{r.d}s" style:--t="{r.t}s" style:--l="{r.l}px"></i>{/each}
  {/if}
</div>

<style>
  .fx { position: absolute; left: 0; right: 0; top: 0; height: 52vh; overflow: hidden; pointer-events: none; -webkit-mask: linear-gradient(#000 55%, transparent); mask: linear-gradient(#000 55%, transparent); }
  .cloud { position: absolute; left: 0; width: calc(180px * var(--s)); opacity: 0.55; animation: drift var(--t) linear infinite; animation-delay: var(--d); }
  @keyframes drift { from { transform: translateX(-40vw); } to { transform: translateX(110vw); } }
  .star { position: absolute; width: var(--s); height: var(--s); border-radius: 50%; background: #FEFAF1; animation: twinkle var(--t) ease-in-out infinite; animation-delay: var(--d); }
  @keyframes twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.95; } }
  .drop { position: absolute; top: -30px; width: 1.5px; height: var(--l); background: linear-gradient(transparent, rgba(220, 240, 255, 0.7)); transform: rotate(12deg); animation: fall var(--t) linear infinite; animation-delay: var(--d); }
  @keyframes fall { to { transform: translate(-60px, 60vh) rotate(12deg); } }
  @media (prefers-reduced-motion: reduce) { .cloud, .star, .drop { animation: none; } .cloud { transform: translateX(20vw); } }
</style>
