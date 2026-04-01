// NEXUS Service Worker v13
// Handles offline caching for GitHub Pages hosting
const CACHE_NAME = 'nexus-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// ── Install: cache all static assets ─────────────────────────────────────────
self.addEventListener('install', e => {
  console.log('[NEXUS SW] Installing v13...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[NEXUS SW] Cache partial fail:', err))
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  console.log('[NEXUS SW] Activating v13...');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[NEXUS SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: smart caching strategy ────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // ✅ Never intercept AI API — let browser handle directly (avoids 404 errors)
  if (url.includes('api.anthropic.com')) return;

  // ✅ Never intercept Google Fonts requests
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return;

  // App shell — cache first, network fallback
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(e.request)
          .then(response => {
            // Only cache valid same-origin responses
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback for navigation requests
            if (e.request.destination === 'document' || e.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'NEXUS', body: 'Nova notificação' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      vibrate: [200, 100, 200],
    })
  );
});
