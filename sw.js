const CACHE_NAME = 'pitching-ai-v2';
const urlsToCache = [
  './index.html',
  './manifest.json'
];

// インストール時にファイルをキャッシュする
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// オフラインでもキャッシュからアプリを読み込む
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
