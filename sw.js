const CACHE = 'portfolio-v2';
const ASSETS = [
  '/dashboard_investments/',
  '/dashboard_investments/index.html',
  '/dashboard_investments/app.js',
  '/dashboard_investments/style.css',
  '/dashboard_investments/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Skip non-http requests (chrome-extension://, etc.)
  if (!url.startsWith('http')) return;
  // Skip external APIs
  if (url.includes('firebase') || url.includes('google') ||
      url.includes('yahoo') || url.includes('anthropic') ||
      url.includes('googleapis')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        if (res.ok) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
    }).catch(() => caches.match('/dashboard_investments/index.html'))
  );
});
