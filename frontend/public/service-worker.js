/* ============================================================
   ClearanceHub — Service Worker
   Caches app shell for offline use + handles network-first
   strategy for API calls.
   ============================================================ */

const CACHE_NAME = 'clearancehub-v1';

// App shell files to pre-cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png',
];

// ── Install: pre-cache the app shell ────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ClearanceHub service worker…');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ── Fetch: Network-first for API, cache-first for app shell ─────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE)
  if (request.method !== 'GET') return;

  // Skip API calls and external URLs — always go to network
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  // For app resources: cache-first, falling back to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Don't cache non-ok responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone and cache the response
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, toCache);
        });

        return response;
      });
    }).catch(() => {
      // If both cache and network fail, show offline page for navigation
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

// ── Push notifications (future-ready) ───────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'ClearanceHub';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
