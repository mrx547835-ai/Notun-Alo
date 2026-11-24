const CACHE_NAME = 'notun-alo-shell-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/admin.html') || url.pathname.includes('/posts/')) return;

  event.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
