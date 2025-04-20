const CACHE_NAME = 's2b-cache-v1';
const BASE_URL = self.location.pathname.replace('service-worker.js', '');

const ASSETS_TO_CACHE = [
    // Use relative paths
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/ble.js',
    './js/braille.js',
    './js/speech.js',
    './manifest.json',
    './braille-database.csv',
    './braille-data.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app assets');
                // Use Promise.all instead of cache.addAll to handle individual file failures
                const cachePromises = ASSETS_TO_CACHE.map(url => {
                    return cache.add(url).catch(error => {
                        console.error(`Failed to cache: ${url}`, error);
                        // Continue despite error
                        return Promise.resolve();
                    });
                });
                return Promise.all(cachePromises);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    // Skip BLE requests (which can't be cached)
    if (event.request.url.includes('bluetooth')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Add to cache for future use
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                            
                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        // Could return a custom offline page here
                    });
            })
    );
});
