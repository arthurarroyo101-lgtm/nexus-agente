// ─────────────────────────────────────────────
// NEXUS Service Worker — Auto-versioned Cache
// ─────────────────────────────────────────────
// 👉 Para lançar nova versão: mude apenas esta constante
const CACHE_VERSION = 'nexus-v13';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── INSTALL — pré-carrega assets no cache ─────
self.addEventListener('install', e => {
  console.log(`[SW] Instalando ${CACHE_VERSION}`);
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => {
        console.log(`[SW] Cache ${CACHE_VERSION} pronto`);
        // Ativa imediatamente sem esperar abas fecharem
        return self.skipWaiting();
      })
      .catch(err => console.warn('[SW] Falha parcial no cache:', err))
  );
});

// ── ACTIVATE — apaga caches antigos automaticamente
self.addEventListener('activate', e => {
  console.log(`[SW] Ativando ${CACHE_VERSION} — limpando versões antigas`);
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => {
            console.log(`[SW] Apagando cache antigo: ${key}`);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.log('[SW] Limpeza concluída — assumindo controle das páginas');
        // Assume controle imediato de todas as abas abertas
        return self.clients.claim();
      })
  );
});

// ── FETCH — cache-first, network fallback ────
self.addEventListener('fetch', e => {
  const req = e.request;

  // Apenas intercepta GET — nunca POST/PUT/DELETE
  if (req.method !== 'GET') return;

  // Nunca intercepta APIs externas
  const url = req.url;
  if (
    url.includes('api.anthropic.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) return;

  e.respondWith(
    caches.match(req)
      .then(cached => {
        // Cache hit — retorna imediatamente (offline-first)
        if (cached) return cached;

        // Não está no cache — busca na rede
        return fetch(req)
          .then(response => {
            // Cacheia respostas válidas de mesma origem
            if (
              response &&
              response.status === 200 &&
              response.type === 'basic'
            ) {
              const clone = response.clone();
              caches.open(CACHE_VERSION)
                .then(cache => cache.put(req, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback — serve o app shell para navegação
            if (req.destination === 'document' || req.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ── PUSH NOTIFICATIONS (base para futuro) ────
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
