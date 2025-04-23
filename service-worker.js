const CACHE_NAME = 'braille-converter-v1.1'; // Increase version to clear old cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/braille-lookup.js',
  '/manifest.json'
];

// Add database to a separate cache for better control
const DATABASE_CACHE = 'braille-database-cache-v1';

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((keyList) => {
        return Promise.all(keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATABASE_CACHE) {
            console.log('Service Worker: Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Special handling for database file
async function handleDatabaseRequest(request) {
  console.log('Service Worker: Handling database request');
  
  // Try network first for database
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      // Cache the fresh database
      const cache = await caches.open(DATABASE_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Service Worker: Network fetch for database failed, trying cache');
  }
  
  // If network fails, try cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If all fails, return a readable error
  return new Response(
    JSON.stringify({ error: 'Failed to load database from network and cache' }),
    { 
      status: 503, 
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Special handling for database requests
  if (event.request.url.includes('braille-database.csv')) {
    event.respondWith(handleDatabaseRequest(event.request));
    return;
  }
  
  // Standard cache strategy for other assets
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.ok && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Fallback to index for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            return new Response('Resource not available offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Handle database sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-database') {
    event.waitUntil(
      fetch('/braille-database.csv')
        .then(response => {
          if (!response.ok) throw new Error('Failed to sync database');
          
          return caches.open(DATABASE_CACHE)
            .then(cache => cache.put('/braille-database.csv', response));
        })
        .catch(error => console.error('Database sync failed:', error))
    );
  }
});

// Listen for messages
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
