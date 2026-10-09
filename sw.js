const CACHE_NAME = 'baseball-ai-v4';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './batting/index.html',
  './batting/css/style.css',
  './batting/js/math.js',
  './batting/js/mediapipe.js',
  './batting/js/render.js',
  './batting/js/app.js',
  './pitching/index.html',
  './pitching/css/style.css',
  './pitching/js/math.js',
  './pitching/js/mediapipe.js',
  './pitching/js/render.js',
  './pitching/js/app.js'
];

// インストール時に即座に古いキャッシュをスキップして進む
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 古いキャッシュを即座に削除して新しい制御下に置く
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// キャッシュまたはネットワークから取得
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
