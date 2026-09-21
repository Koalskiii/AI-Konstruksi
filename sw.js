const CACHE_NAME = 'aikon-v5-supabase-20260921';
const SUPABASE_URL = 'https://kiyneeejluyqzvgdfljt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W';

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './styles.css',
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
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('aikon-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

async function fetchAppScript(request) {
  const response = await fetch(request);
  if (!response.ok) return response;

  const source = await response.text();
  const updated = source
    .replace(/https:\/\/efcyyiunxigzixfdwtzq\.supabase\.co/g, SUPABASE_URL)
    .replace(/sb_publishable_OGJgtLKCNAupcWLGqRM52w_rP2hyq7h/g, SUPABASE_KEY);

  return new Response(updated, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.endsWith('/app.js')) {
    event.respondWith(fetchAppScript(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
