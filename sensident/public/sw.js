/**
 * Sensident — Service Worker (PWA minimale)
 *
 * - Cache first pour les assets statiques
 * - Network first pour les pages
 * - Pas de donnees sensibles en cache (jamais de /api, jamais de /dashboard)
 */

const CACHE_NAME = 'sensident-v1';
const STATIC_ASSETS = ['/images/icon-192.png', '/images/icon-512.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne jamais cacher les routes sensibles
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/admin-auth') ||
      url.pathname.startsWith('/c/')) {
    return;
  }

  // Network first, fallback cache pour les pages
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
