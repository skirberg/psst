// psst. offline: the whole guide is one HTML page, so caching it (plus fonts and icons) lets it open with no signal.
// Pages: network first, cached copy after 4 s or offline. Fonts and icons: cache first. Analytics: never cached.
const V = 'psst-v2';
const CORE = ['/', '/site.webmanifest', '/favicon.svg', '/icon-192.png', '/apple-touch-icon.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const same = u.origin === self.location.origin;
  if (same && u.pathname.startsWith('/_vercel/')) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const shell = u.pathname === '/' || !/\.[a-z0-9]+$/i.test(u.pathname);
      const net = fetch(req).then((res) => { if (shell && res.ok && (res.headers.get('content-type') || '').includes('text/html')) { const copy = res.clone(); caches.open(V).then((c) => c.put('/', copy)); } return res; });
      try { const res = await Promise.race([net, new Promise((ok) => setTimeout(ok, 4000))]); if (res) return res; } catch {}
      return (shell && (await caches.match('/'))) || net;
    })());
    return;
  }
  if (same || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
