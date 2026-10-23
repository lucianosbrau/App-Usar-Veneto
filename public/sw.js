const CACHE = 'usar-veneto-v4';
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

  // SEMPRE dal server, MAI dalla cache: la pagina principale arriva fresca
  // a ogni visita (il vecchio comportamento teneva i PC bloccati su versioni
  // vecchie dell'app anche svuotando la cache del browser)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request).then(m => m || caches.match(BASE + './')))
    );
    return;
  }

  // asset con nome "impronta" (index-XXXX.js): immutabili, cache immediata
  if (/-[A-Za-z0-9_-]{8}\.(js|css|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(m => m || fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return r;
      }))
    );
    return;
  }

  // tutto il resto (foto, logo): cache prima, rete in sottofondo per aggiornare
  e.respondWith(
    caches.match(e.request).then(m => {
      const rete = fetch(e.request).then(r => {
        if (r && r.status === 200) {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
        }
        return r;
      }).catch(() => m);
      return m || rete;
    })
  );
});
