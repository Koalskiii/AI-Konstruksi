const CACHE_NAME = 'aikon-v10-list-item';
const SUPABASE_URL = 'https://kiyneeejluyqzvgdfljt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W';
const STATIC_ASSETS = ['./','./index.html','./style.css','./styles.css','./app.js','./admin.js','./locations.js','./list-items.js','./ai-verification.js','./admin.css','./manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    for (const asset of STATIC_ASSETS) {
      try { await cache.add(asset); } catch (error) { console.warn('AIKON cache failed:', asset, error); }
    }
  }));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('aikon-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

async function rewriteAppScript(request) {
  const response = await fetch(request);
  if (!response.ok) return response;
  const source = await response.text();
  const updated = source
    .replace(/https:\/\/efcyyiunxigzixfdwtzq\.supabase\.co/g, SUPABASE_URL)
    .replace(/sb_publishable_OGJgtLKCNAupcWLGqRM52w_rP2hyq7h/g, SUPABASE_KEY)
    .replace(/window\.supabase\.createClient\(\s*SUPABASE_URL,\s*SUPABASE_KEY\s*\)/, "window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })")
    .replace('`Selamat pagi, ${firstName}.`', '`Halo, ${firstName}.`');
  return new Response(updated, { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function rewriteHtml(request) {
  const response = await fetch(request);
  if (!response.ok) return response;
  let html = await response.text();
  const tags = '<link rel="stylesheet" href="./admin.css"><script src="./admin.js"></script><script src="./locations.js"></script>';
  if (!html.includes('./admin.js') || !html.includes('./locations.js')) html = html.replace('</head>', `${tags}</head>`);
  return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
}

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text?.() || '' }; }
  const title = data.title || 'AIKON — Pemberitahuan';
  const options = {
    body: data.body || 'Ada pembaruan pemeriksaan aset.',
    data: data.data || {}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const target = list.find(client => 'focus' in client);
    return target ? target.focus() : clients.openWindow('./#history');
  }));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/app.js')) return event.respondWith(rewriteAppScript(event.request));
  if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) return event.respondWith(rewriteHtml(event.request));
  event.respondWith(fetch(event.request).then(response => {
    if (response?.ok) { const clone = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)); }
    return response;
  }).catch(() => caches.match(event.request, { ignoreSearch: true })));
});