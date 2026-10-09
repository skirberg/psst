import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
// Absolute URL for the link-preview image, filled in by Vercel at build time.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
if (!site && process.env.VERCEL) console.warn('[site-url] VERCEL_PROJECT_PRODUCTION_URL is not set, so og:image is the relative /og.png. Turn on System Environment Variables in the Vercel project settings and redeploy.');
const siteUrl = { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE__', site) };
// The single file inlines the 400 KB app script in <head>; move it to the end of <body> so the boot sky paints first.
const scriptLast = {
  name: 'script-last', enforce: 'post',
  generateBundle(_, bundle) {
    for (const f of Object.values(bundle)) {
      if (!f.fileName.endsWith('.html') || typeof f.source !== 'string') continue;
      const m = f.source.match(/<script type="module"[^>]*>[\s\S]*?<\/script>/);
      // Function replacers: a string replacement would turn every '$$' in the script into '$'.
      if (m) f.source = f.source.replace(m[0], () => '').replace('</body>', () => m[0] + '</body>');
    }
  },
};
export default defineConfig({ base: './', plugins: [svelte(), viteSingleFile(), siteUrl, scriptLast], build: { target: 'es2020' } });
