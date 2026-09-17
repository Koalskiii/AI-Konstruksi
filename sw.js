const CACHE_NAME = 'aikon-v3-20260917';

const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (error) {
          console.warn('AIKON cache failed:', asset, error);
        }
      }
    })
  );

  self.skipWaiting();
});


self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('aikon-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});


self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  /*
   * Hanya intercept request dari domain aplikasi sendiri.
   * Supabase dan CDN tidak kita cache.
   */
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(

    fetch(event.request)
      .then(response => {

        if (response && response.ok) {

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

        }

        return response;

      })

      .catch(() => {

        return caches.match(
          event.request,
          {
            ignoreSearch: true
          }
        );

      })

  );

});
