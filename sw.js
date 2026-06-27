const CACHE = 'portfolio-v4';
const ASSETS = [
  '/dashboard_investments/',
  '/dashboard_investments/index.html',
  '/dashboard_investments/app.js',
  '/dashboard_investments/style.css',
  '/dashboard_investments/manifest.json',
  '/dashboard_investments/icon-192.png',
  '/dashboard_investments/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.startsWith('http')) return;
  if (url.includes('firebase') || url.includes('googleapis') ||
      url.includes('yahoo') || url.includes('anthropic') ||
      url.includes('gstatic')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
