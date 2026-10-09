import { mount } from 'svelte';
import { inject } from '@vercel/analytics';
// Vercel Web Analytics: anonymous page views plus a few custom events (Pro), no cookies.
inject();
import App from './App.svelte';
import { app } from './lib/state.svelte.js';
if (import.meta.env.DEV) window.__psst = app; // screenshot harness hook (dev only)
mount(App, { target: document.getElementById('app') });
