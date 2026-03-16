const CACHE_NAME = 'weft-v2.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
];

// Install: cache static assets, activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches, reload all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(async keys => {
      const oldKeys = keys.filter(k => k !== CACHE_NAME);
      await Promise.all(oldKeys.map(k => caches.delete(k)));
      if (oldKeys.length > 0) {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.navigate(client.url));
      }
    })
  );
  self.clients.claim();
});

// Fetch: only handle same-origin requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-same-origin requests (CDN, fonts, APIs, Supabase)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first for same-origin, fall back to cache for offline
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// ─── Push notifications ───────────────────────────────────────────────────────

// Receive push from server and show notification
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Weft', body: event.data ? event.data.text() : '' };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'weft-news',
    data: { url: data.url || '/' },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Weft News', options)
  );
});

// Open article URL when notification is clicked
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'OPEN_URL', url });
          return;
        }
      }
      // Otherwise open new tab
      self.clients.openWindow(url);
    })
  );
});
