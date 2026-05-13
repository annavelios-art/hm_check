const CACHE_NAME = 'heilmittel-rechner-v1';

// Dateien, die gecached werden sollen
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Installation: Cache erstellen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache geöffnet');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Aktivierung: Alte Caches löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First-Strategie mit Fallback auf Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Kopie der Response für den Cache erstellen
        const responseClone = response.clone();
        
        caches.open(CACHE_NAME)
          .then((cache) => {
            // Nur GET-Requests cachen
            if (event.request.method === 'GET') {
              cache.put(event.request, responseClone);
            }
          });
        
        return response;
      })
      .catch(() => {
        // Bei Netzwerkfehler: Aus Cache laden
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Fallback zur Startseite für Navigation
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});
