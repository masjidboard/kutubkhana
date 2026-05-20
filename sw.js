// KitabKhana Service Worker v4.1
// ⚠️ جب بھی index.html اپڈیٹ کریں — یہ نمبر بدلیں: v4.1 → v4.2 وغیرہ
const VERSION = 'kitabkhana-v4.1';

// Install — نئی cache بنائیں
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => {
      return cache.addAll([
        './',
        './index.html',
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
      ]).catch(()=>{});
    })
  );
  // فوری activate — انتظار نہ کریں
  self.skipWaiting();
});

// Activate — پرانی cache فوری صاف کریں
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== VERSION).map(k => {
          console.log('[SW] پرانی cache حذف:', k);
          return caches.delete(k);
        })
      )
    ).then(() => {
      // تمام کھلے pages کو فوری کنٹرول دیں
      return self.clients.claim();
    })
  );
});

// Fetch — Network First for HTML, Cache First for assets
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase / Google APIs — ہمیشہ network سے
  if(url.includes('firebase') ||
     url.includes('firestore') ||
     url.includes('googleapis.com') ||
     url.includes('gstatic.com/firebasejs')){
    return;
  }

  // index.html — ہمیشہ network first (تازہ فائل ملے)
  if(event.request.mode === 'navigate' ||
     url.endsWith('index.html') ||
     url.endsWith('/')){
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // نئی فائل cache میں محفوظ کریں
          const clone = response.clone();
          caches.open(VERSION).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // آف لائن ہو تو cache سے دیں
          return caches.match('./index.html');
        })
    );
    return;
  }

  // باقی assets — Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(!response || response.status !== 200 || event.request.method !== 'GET')
          return response;
        const clone = response.clone();
        caches.open(VERSION).then(c => c.put(event.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Message — باہر سے اپڈیٹ کا حکم
self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
