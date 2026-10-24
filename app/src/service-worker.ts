/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// psst. offline: the page (its code is inlined), the map data and the icons are cached on install, so the guide opens with no signal.
// Pages: network first, the cached shell after 4 s or offline. Code and icons: cache first. Fonts: cached as the page first uses them
// (seven files, 450 KB, most of which a visit never needs). Analytics: never cached.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `psst-${version}`;
const SKIP = new Set(['/404.html', '/og.png', '/icon-512.png', '/icon-maskable-512.png']);
const CORE = ['/', ...build, ...files.filter((f) => !SKIP.has(f) && !f.startsWith('/fonts/'))];

sw.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => sw.skipWaiting())); });
sw.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => sw.clients.claim()));
});

async function page(req: Request, u: URL): Promise<Response> {
  const shell = u.pathname === '/' || !/\.[a-z0-9]+$/i.test(u.pathname);
  const net = fetch(req).then((res) => {
    if (u.pathname === '/' && res.ok && (res.headers.get('content-type') || '').includes('text/html')) { const copy = res.clone(); void caches.open(CACHE).then((c) => c.put('/', copy)); }
    return res;
  });
  try { const res = await Promise.race([net, new Promise<undefined>((ok) => setTimeout(ok, 4000))]); if (res) return res; } catch { /* offline: fall through to the cached shell */ }
  return (shell && (await caches.match('/'))) || net;
}

async function asset(req: Request): Promise<Response> {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // hashed build files never change; other same-origin files (fonts included) are cached as they are first used
  if (res.ok) { const copy = res.clone(); void caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
}

sw.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const same = u.origin === sw.location.origin;
  if (same && u.pathname.startsWith('/_vercel/')) return;
  if (req.mode === 'navigate') { e.respondWith(page(req, u)); return; }
  if (same) e.respondWith(asset(req));
});
