import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** psst is one prerendered page (the app runs in the browser), served as static files on Vercel. */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
    serviceWorker: { register: true },
    // One request for the first screen: code and styles are inlined into the page (measured faster on 4G than split files,
    // 2026-10-24). The map's coastline (static/geo.json) loads after first paint.
    output: { bundleStrategy: 'inline' },
    inlineStyleThreshold: 64 * 1024,
  },
};
