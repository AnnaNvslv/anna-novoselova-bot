// Service Worker for Нюсик и математика
const CACHE = 'nyusik-v1';
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

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});