const CACHE_NAME = 'albion-calculator-v1';
const DYNAMIC_CACHE_NAME = 'albion-calculator-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/albion-calculator/',
  '/albion-calculator/index.html',
  '/albion-calculator/manifest.webmanifest',
  '/albion-calculator/favicon.ico',
  '/albion-calculator/icons/icon-72x72.png',
  '/albion-calculator/icons/icon-96x96.png',
  '/albion-calculator/icons/icon-128x128.png',
  '/albion-calculator/icons/icon-144x144.png',
  '/albion-calculator/icons/icon-152x152.png',
  '/albion-calculator/icons/icon-192x192.png',
  '/albion-calculator/icons/icon-384x384.png',
  '/albion-calculator/icons/icon-512x512.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  'https://europe.albion-online-data.com',
  'https://west.albion-online-data.com',
  'https://east.albion-online-data.com'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
    .then(() => self.clients.claim())
  );
});

// Helper function to check if URL is from our API
const isApiRequest = (url) => {
  return API_ENDPOINTS.some(endpoint => url.startsWith(endpoint));
};

// Helper function to check if request should be cached
const shouldCache = (url) => {
  const fileTypes = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico'];
  console.log("Caching files with types ", fileTypes, " for url ", url)
  return fileTypes.some(type => url.endsWith(type)) || isApiRequest(url);
};

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API requests
  if (isApiRequest(request.url)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                const clonedResponse = networkResponse.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then((cache) => cache.put(request, clonedResponse));
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // Handle static assets and other requests
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        return cachedResponse || fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok && shouldCache(request.url)) {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, clonedResponse));
            }
            return networkResponse;
          })
          .catch(() => {
            // Return fallback for HTML
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/albion-calculator/offline.html');
            }
            return null;
          });
      })
  );
});
