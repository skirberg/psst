import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
// Absolute URL for the link-preview image, filled in by Vercel at build time.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
if (!site && process.env.VERCEL) console.warn('[site-url] VERCEL_PROJECT_PRODUCTION_URL is not set, so og:image is the relative /og.png. Turn on System Environment Variables in the Vercel project settings and redeploy.');
const siteUrl = { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE__', site) };
export default defineConfig({ base: './', plugins: [svelte(), viteSingleFile(), siteUrl], build: { target: 'es2020' } });
