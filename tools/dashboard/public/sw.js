// Service worker: app shell offline, API network-first with the last good
// response as an offline fallback (marked with X-CT-Cached-At).
const VERSION = 'ct-dash-v4';
const SHELL = ['/', '/index.html', '/styles.css', '/manifest.webmanifest',
  '/js/app.js', '/js/core.js', '/js/i18n.js', '/js/dates.js', '/js/logic.js', '/js/net.js', '/js/ui.js', '/js/actions.js', '/js/views.js',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png', '/icons/favicon-32.png', '/icons/favicon-16.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VERSION + '-api').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;

  // "Open in Notion" redirects go straight to the network.
  if (url.pathname.startsWith('/api/') && url.pathname.endsWith('/notion')) return;
  if (url.pathname.startsWith('/api/')) {
    e.respondWith((async () => {
      const key = new Request(url.pathname + url.search.replace(/[?&]fresh=1/, ''));
      try {
        const res = await fetch(e.request);
        if (res.ok) {
          const copy = res.clone();
          const headers = new Headers(copy.headers);
          headers.set('X-CT-Cached-At', new Date().toISOString());
          const body = await copy.blob();
          const cache = await caches.open(VERSION + '-api');
          await cache.put(key, new Response(body, { status: 200, headers }));
        }
        return res;
      } catch (err) {
        const hit = await (await caches.open(VERSION + '-api')).match(key);
        if (hit) return hit;
        return new Response(JSON.stringify({ error: 'Offline, or the Access session expired: reload the page.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Shell: cache first, then network (navigation falls back to index.html).
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(e.request.mode === 'navigate' ? '/index.html' : e.request);
    const net = fetch(e.request).then((res) => {
      if (res.ok && SHELL.includes(url.pathname)) cache.put(e.request.mode === 'navigate' ? '/index.html' : e.request, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  })());
});
