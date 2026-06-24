const CACHE = 'portfolio-v1';
const ASSETS = [
  '/dashboard_investments/',
  '/dashboard_investments/index.html',
  '/dashboard_investments/app.js',
  '/dashboard_investments/style.css',
  '/dashboard_investments/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
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
  // Network first for API calls, cache first for assets
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('google') ||
      e.request.url.includes('yahoo') ||
      e.request.url.includes('anthropic')) {
    return; // Let these go through normally
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        return caches.open(CACHE).then(c => {
          c.put(e.request, res.clone());
          return res;
        });
      });
    }).catch(() => caches.match('/dashboard_investments/index.html'))
  );
});
