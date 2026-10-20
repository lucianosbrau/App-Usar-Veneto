const CACHE = 'usar-veneto-v3';
const BASE = '/App-Usar-Veneto/';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
          return r;
        })
        .catch(() => caches.match(e.request).then(m => m || caches.match(BASE + './')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(m => m || fetch(e.request))
  );
});
