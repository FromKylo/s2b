const CACHE_NAME = 'speech-to-braille-v1';

// Only include resources that actually exist
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/braille-database.js',
    '/braille-database.csv',
    '/manifest.json'
    // Removed missing icon files
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
                // Continue with installation even if caching fails
                return Promise.resolve();
            })
    );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
    // Skip chrome-extension URLs which can't be cached
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest)
                    .then(response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Don't try to cache chrome-extension URLs
                        if (!event.request.url.startsWith('chrome-extension://')) {
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(err => {
                                    console.error('Error caching response:', err);
                                });
                        }
                            
                        return response;
                    })
                    .catch(() => {
                        // Return a fallback page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        
                        return new Response('Network error occurred', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
