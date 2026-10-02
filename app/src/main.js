import { mount } from 'svelte';
import App from './App.svelte';
import { app } from './lib/state.svelte.js';
if (import.meta.env.DEV) window.__psst = app; // screenshot harness hook (dev only)
mount(App, { target: document.getElementById('app') });
