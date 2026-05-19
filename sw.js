// KitabKhana Service Worker v4.0
const CACHE_NAME = 'kitabkhana-v4';
const STATIC_CACHE = 'kitabkhana-static-v4';

// یہ فائلیں آف لائن کے لیے cache ہوں گی
const CACHE_URLS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Playfair+Display:wght@700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
];

// Install — فائلیں cache کریں
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.log('Cache addAll partial error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — پرانی cache صاف کریں
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache first, network fallback
self.addEventListener('fetch', event => {
  // Firebase اور Google APIs کو cache نہ کریں
  const url = event.request.url;
  if (url.includes('firebase') || 
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('firestore.googleapis.com')) {
    return; // network سے لیں
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // صرف GET requests cache کریں
        if (event.request.method !== 'GET') return response;
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // آف لائن fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
