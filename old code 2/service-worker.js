const CACHE_NAME = 'speech-to-braille-v1';

// List of all files to cache for complete offline usage
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/braille.js',
  '/js/ble.js',
  '/js/speech.js',
  '/js/braille-fixes.js', // Add the new fix script
  '/braille-database.csv',
  '/braille-data.json',  // Backup data format
  '/sounds/intro.mp3',
  '/sounds/recording.mp3',
  '/sounds/output.mp3',
  '/sounds/no-match.mp3',
  '/sounds/connection.mp3',
  // Add app icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache all required resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the cached response
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        // Make network request and cache the response
        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            // Add the new resource to the cache
            caches.open(CACHE_NAME)
              .then(cache => {
                console.log('Service Worker: Caching new resource', event.request.url);
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('Service Worker: Fetch failed; returning offline fallback', error);
            
            // For HTML pages, return a simple offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return new Response('<html><body><h1>Speech-to-Braille Offline</h1><p>You are currently offline. Please reconnect to access full functionality.</p></body></html>', {
                headers: { 'Content-Type': 'text/html' }
              });
            }
            
            // For non-HTML requests, just return an empty response
            return new Response('', {
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle push notifications if needed in the future
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
});
