// Service Worker for Нюсик и математика
const CACHE = 'nyusik-v2';
const ASSETS = [
  '/anna-novoselova-bot/nyusik-math.html',
  '/anna-novoselova-bot/nyusik-manifest.json',
  '/anna-novoselova-bot/nyusik-icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Network-first: always try to fetch the latest version first, and only fall
// back to the cached copy if the network request fails (offline). This is
// what previously caused a stale/broken build to keep being served forever
// after a fix was pushed, even on hard refresh - cache-first ignored the new
// version until the cache name changed.
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});