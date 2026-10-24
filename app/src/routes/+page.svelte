<script lang="ts">
  import { onMount } from 'svelte';
  import { inject } from '@vercel/analytics';
  import { dev } from '$app/environment';
  import App from '../App.svelte';
  import { app } from '$lib/state.svelte';
  import { afterFirstPaint } from '$lib/paint';

  onMount(() => {
    // Vercel Web Analytics: anonymous page views plus a few custom events, no cookies.
    inject({ mode: dev ? 'development' : 'production' });
    if (dev) window.__psst = app; // screenshot and flow harness hook, dev only
    document.getElementById('boot')?.remove(); // the boot screen painted the sky before the app arrived
    // Fonts come after the first paint: text shows at once in a fallback face and swaps when the fonts land.
    void afterFirstPaint().then(() => { const f = document.getElementById('fonts') as HTMLLinkElement | null; if (f) f.media = 'all'; });
  });
</script>

<App />
