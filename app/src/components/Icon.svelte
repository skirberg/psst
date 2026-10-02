<script>
  // psst. icon set: 24px grid, 2px rounded strokes, drawn for this app.
  let { name, size = 22, stroke = 2 } = $props();
</script>

<svg class="icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'today'}<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>
  {:else if name === 'trip'}<circle cx="6" cy="18" r="2.2"/><path d="M8.2 18c4 0 3.5-6 7.5-6"/><path d="M18 3.5c-2.3 0-4 1.8-4 4 0 3 4 6.5 4 6.5s4-3.5 4-6.5c0-2.2-1.7-4-4-4z"/><circle cx="18" cy="7.5" r="1.3" fill="currentColor"/>
  {:else if name === 'events'}<path d="M4 7.5V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2.5a2 2 0 0 0 0 4V14a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4v-2.5a2 2 0 0 0 0-4z"/><path d="M9 4v16" stroke-dasharray="2 2.5"/>
  {:else if name === 'stay'}<circle cx="8" cy="8" r="4.5"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><path d="M11.2 11.2 20 20M16.5 16.5l2-2M18.5 18.5l1.6-1.6"/>
  {:else if name === 'kept'}<path d="M12 3.5l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.6l-4.9 2.6 1.1-5.4-4-3.7 5.4-.6z"/>
  {:else if name === 'coffee'}<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c-.8 1 .8 1.6 0 2.8M12 3.5c-.8 1 .8 1.6 0 2.8"/>
  {:else if name === 'eat'}<path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11"/><path d="M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17"/>
  {:else if name === 'drink'}<path d="M4.5 4h15L12 12.5z"/><path d="M12 12.5V20M8.5 20h7"/><path d="M15.5 4l2-2"/>
  {:else if name === 'dance'}<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"/>
  {:else if name === 'outside'}<path d="M12 21c.5-4 .3-8-1-11.5"/><path d="M11 9.5C8 7 5 7 3 8.5c3-.3 5.5.2 8 1zM11 9.5c1.5-3.5 4.5-5 8-4.5-3 .6-5.5 2-8 4.5zM11 9.5c-.5-3.5.8-6 3-7.5-1 2.3-2 4.8-3 7.5z"/><path d="M3 21h18"/>
  {:else if name === 'art'}<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5"/><circle cx="15.5" cy="9.5" r="1.5"/>
  {:else if name === 'secret'}<circle cx="12" cy="9" r="4"/><path d="M10 12.5 8.5 20h7L14 12.5"/>
  {:else if name === 'pin'}<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.2"/>
  {:else if name === 'bolt'}<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>
  {:else if name === 'rain'}<path d="M12 3.5s-6 6.6-6 10.5a6 6 0 0 0 12 0c0-3.9-6-10.5-6-10.5z"/>
  {:else if name === 'clock'}<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>
  {:else if name === 'shuffle'}<path d="M3 7h3.5c4.5 0 6.5 10 11 10H21"/><path d="M3 17h3.5c1.8 0 3-1.6 4-3.5M13.5 10.5c1-1.9 2.2-3.5 4-3.5H21"/><path d="M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5"/>
  {:else if name === 'left'}<path d="M15 5l-7 7 7 7"/>
  {:else if name === 'right'}<path d="M9 5l7 7-7 7"/>
  {:else if name === 'map'}<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>
  {:else if name === 'close'}<path d="M6 6l12 12M18 6 6 18"/>
  {:else if name === 'bed'}<path d="M3 18V6M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.8"/>
  {:else if name === 'pool'}<path d="M2.5 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5M2.5 20c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5"/><path d="M8 13V5a2 2 0 0 1 4 0M14 12V5a2 2 0 0 1 4 0M8 8h6"/>
  {:else if name === 'all'}<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/>
  {:else if name === 'external'}<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>
  {/if}
</svg>

<style>
  .icon { flex: none; display: block; }
</style>
