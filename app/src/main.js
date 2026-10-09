import { mount } from 'svelte';
import { inject } from '@vercel/analytics';
// Vercel Web Analytics: anonymous page views plus a few custom events (Pro), no cookies.
inject();
import App from './App.svelte';
import { app } from './lib/state.svelte.js';
if (import.meta.env.DEV) window.__psst = app; // screenshot harness hook (dev only)
const target = document.getElementById('app');
target.replaceChildren(); // drop the boot screen
mount(App, { target });
// Offline: the whole guide is one page, so a small service worker lets psst open with no signal.
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
