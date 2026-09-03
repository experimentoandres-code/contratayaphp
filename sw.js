/* ============================================================
   CONTRATÁ YA — Service worker
   Subir la versión en cada despliegue para forzar la limpieza.
   ============================================================ */

const VERSION = 'contrataya-v1';

const BASE = [
  '/',
  '/index.html',
  '/app.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/css/tokens.css',
  '/css/landing.css',
  '/css/app.css',
  '/js/data.js',
  '/js/instalar.js',
  '/js/landing.js',
  '/js/app.js',
  '/img/isotipo.svg',
  '/img/logo.svg',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/img/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(BASE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fuentes y externos: red directa

  // Navegación: red primero, caché de respaldo.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/offline.html')))
    );
    return;
  }

  // Recursos: caché primero.
  e.respondWith(
    caches.match(req).then(cacheado => {
      if (cacheado) return cacheado;
      return fetch(req).then(res => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return res;
      }).catch(() => cacheado);
    })
  );
});

/* Avisos: en iOS solo funcionan si la app está instalada en la pantalla de inicio. */
self.addEventListener('push', (e) => {
  let datos = { titulo: 'Contratá Ya', cuerpo: 'Tenés novedades' };
  try { if (e.data) datos = e.data.json(); } catch {}
  e.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: '/img/icon-192.png',
      badge: '/img/icon-192.png',
      data: { url: datos.url || '/app.html' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/app.html'));
});
