const CACHE_VERSION = 'weft-v3.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static shell — cached on install, served stale-while-revalidate
const STATIC_ASSETS = [
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
];

// ─── Install: pre-cache static shell ─────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ───────────────────────────────────────────────

self.addEventListener('activate', event => {
  const VALID_CACHES = [STATIC_CACHE, FONT_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then(async keys => {
      const expired = keys.filter(k => !VALID_CACHES.includes(k));
      await Promise.all(expired.map(k => caches.delete(k)));
      if (expired.length > 0) {
        // Reload clients on cache update so they get fresh assets
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.navigate(client.url));
      }
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch strategies ─────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls (always fresh)
  if (url.pathname.startsWith('/api/')) return;

  // Skip cross-origin API calls (Supabase, Groq, etc.)
  if (url.origin !== self.location.origin && !isFont(url) && !isCDN(url)) return;

  // ── Fonts: cache-first (immutable, long-lived) ──────────────────────────────
  if (isFont(url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // ── CDN scripts (supabase, etc.): stale-while-revalidate ───────────────────
  if (isCDN(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // ── Icons / manifest: cache-first (immutable) ──────────────────────────────
  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── App shell (HTML, JS, CSS): network-first with cache fallback ────────────
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ─── Strategy helpers ─────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(cacheName).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}

// ─── URL classifiers ──────────────────────────────────────────────────────────

function isFont(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

function isCDN(url) {
  return url.hostname === 'cdn.jsdelivr.net';
}

function isImmutableAsset(url) {
  return /\.(png|svg|ico|webp|avif)$/.test(url.pathname) || url.pathname === '/manifest.json';
}

// ─── Push notifications ───────────────────────────────────────────────────────

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

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'OPEN_URL', url });
          return;
        }
      }
      self.clients.openWindow(url);
    })
  );
});
