<script>
  // Die-cut sticker: the move's own word in sign lettering on a shape by category, one Miami ink.
  let { move, size = 72, dim = false, outline = false, tilt = true } = $props();
  const INKS = [['#E2406F', '#FEFAF1'], ['#4AC9EC', '#052739'], ['#733EA4', '#FEFAF1'], ['#FED252', '#052739'], ['#117555', '#FEFAF1'], ['#C8F56D', '#052739']];
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const h = $derived(hash(move.id));
  const ink = $derived(INKS[h % INKS.length]);
  const rot = $derived(tilt ? (h % 17) - 8 : 0);
  const BY_CAT0 = { coffee: 'round', food: 'burst', bar: 'scallop', speakeasy: 'shield', music: 'ticket', nightlife: 'ticket', water: 'oval', outdoors: 'round', art: 'oval', shop: 'round', market: 'scallop' };
  const shape = $derived(BY_CAT0[move.category] || 'round');
  const word = $derived((move.word || move.place.split(' ')[0]).toUpperCase());
  const lines = $derived(word.length > 7 && word.includes(' ') ? word.split(' ') : [word]);
  const shapeW = $derived({ shield: 118, ticket: 120, oval: 150, burst: 132, scallop: 134, round: 136 }[shape] || 136);
  const fs = $derived(Math.min(shape === 'shield' ? 24 : 28, shapeW / Math.max(...lines.map((l) => l.length + 0.9))));
  const SHAPES = {
    round: 'M50 4 a46 46 0 1 1 -0.01 0 Z',
    burst: Array.from({ length: 28 }, (_, i) => { const a = (Math.PI * 2 * i) / 28 - Math.PI / 2, r = i % 2 ? 43 : 49; return `${i ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`; }).join(' ') + ' Z',
    scallop: Array.from({ length: 16 }, (_, i) => { const a0 = (Math.PI * 2 * i) / 16, a1 = (Math.PI * 2 * (i + 1)) / 16, am = (a0 + a1) / 2; return `${i ? '' : `M${50 + Math.cos(a0) * 43} ${50 + Math.sin(a0) * 43} `}Q${(50 + Math.cos(am) * 52).toFixed(1)} ${(50 + Math.sin(am) * 52).toFixed(1)} ${(50 + Math.cos(a1) * 43).toFixed(1)} ${(50 + Math.sin(a1) * 43).toFixed(1)}`; }).join(' ') + ' Z',
    shield: 'M50 4 L92 16 C92 56 76 82 50 96 C24 82 8 56 8 16 Z',
    ticket: 'M6 18 H94 V40 A10 10 0 0 0 94 60 V82 H6 V60 A10 10 0 0 0 6 40 Z',
    oval: 'M50 12 C82 12 98 30 98 50 C98 70 82 88 50 88 C18 88 2 70 2 50 C2 30 18 12 50 12 Z',
  };
</script>

<svg class="sticker" class:dim class:outline viewBox="-6 -6 112 112" width={size} height={size} style:transform="rotate({rot}deg)" aria-hidden="true">
  {#if outline}
    <path d={SHAPES[shape]} fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 5" opacity=".45" />
    <text x="50" y={52 + fs * 0.32} text-anchor="middle" font-family="Tilt Warp, system-ui, sans-serif" font-size={fs} fill="currentColor" opacity=".22">{lines[0]}</text>
  {:else}
    <path d={SHAPES[shape]} fill="#FEFAF1" stroke="#FEFAF1" stroke-width="10" stroke-linejoin="round" />
    <path d={SHAPES[shape]} fill={ink[0]} />
    {#each lines as l, i}
      <text x="50" y={50 + fs * 0.34 + (i - (lines.length - 1) / 2) * fs * 0.95} text-anchor="middle" font-family="Tilt Warp, system-ui, sans-serif" font-size={fs} fill={ink[1]}>{l}</text>
    {/each}
  {/if}
</svg>

<style>
  .sticker { flex: none; overflow: visible; filter: drop-shadow(0 4px 3px rgba(5, 39, 57, 0.28)); transition: filter 0.3s, opacity 0.3s; }
  .sticker.dim { filter: grayscale(1); opacity: 0.25; }
  .sticker.outline { filter: none; }
</style>
