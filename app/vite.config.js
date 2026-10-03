import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
// Absolute URL for the link-preview image, filled in by Vercel at build time.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
const siteUrl = { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE__', site) };
export default defineConfig({ base: './', plugins: [svelte(), viteSingleFile(), siteUrl], build: { target: 'es2020' } });
