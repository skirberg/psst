import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Absolute site URL for the link-preview tags in app.html, filled in from Vercel's production domain at build time.
process.env.PUBLIC_SITE_URL ??= process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
if (!process.env.PUBLIC_SITE_URL && process.env.VERCEL) console.warn('[site-url] VERCEL_PROJECT_PRODUCTION_URL is not set, so og:image is relative. Turn on System Environment Variables in the Vercel project settings and redeploy.');

export default defineConfig({ plugins: [sveltekit()] });
