
const CACHE_NAME = 'carpool-v1.9.5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&display=swap',
  'https://cdn-icons-png.flaticon.com/512/3202/3202926.png'
];

// שלב ההתקנה - שמירת נכסים סטטיים בסיסיים
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// שלב האקטיבציה - ניקוי קאש ישן
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

// אסטרטגיית Fetch: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // התעלמות מבקשות Firebase/Auth (חייבות רשת חיה)
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit') || 
      event.request.url.includes('google.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Fallback if offline and not in cache
          if (event.request.mode === 'navigate') {
            return cache.match('/index.html');
          }
        });
        return response || fetchPromise;
      });
    })
  );
});
