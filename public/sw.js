const CACHE_NAME = 'little-learner-v14';

const ASSETS_TO_PRECACHE = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Bypass WebSockets and Next.js development hot-reloading (HMR / Turbopack)
  if (
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('turbopack') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // 1. Cache-first strategy for media and static assets (audio, images, fonts, icons)
  if (
    url.pathname.startsWith('/audio/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. Network-first with cache fallback for page routes, Next.js chunks, and API responses
  // Online: always retrieves the latest code/data from the network and updates cache
  // Offline: immediately serves cached responses so app stays 100% playable without Wi-Fi
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If navigating to an HTML page while offline, fallback to root page
        if (event.request.headers.get('accept')?.includes('text/html')) {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
