/* ============================================================
   CONTRATÁ YA — Service worker
   Subir la versión en cada despliegue para forzar la limpieza.
   ============================================================ */

const VERSION = 'contrataya-v92';

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
  '/js/tutorial.js',
  '/js/app.js',
  '/js/jugar.js',
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

  // Código (JS y CSS): red primero, así siempre recibís la última versión.
  // Si no hay internet, cae a la copia guardada.
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(VERSION).then(c => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Resto de recursos (imágenes, íconos, manifest): caché primero.
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

  // Sólo las que esperan una respuesta quedan fijas hasta que las toquen.
  // Un mensaje de chat clavado en pantalla cansa rápido.
  const esperaRespuesta = ['trabajo_pedido', 'inicio', 'fin', 'terminado'].includes(datos.tipo);

  e.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: '/img/icon-192.png',
      badge: '/img/icon-192.png',

      // El sonido es el que el usuario tenga puesto en su teléfono:
      // la web no permite poner uno propio. Sí podemos pedir que no
      // llegue en silencio y marcar el patrón de vibración.
      silent: false,
      vibrate: [200, 100, 200],
      requireInteraction: esperaRespuesta,

      // Agrupa por tipo: diez mensajes del mismo chat pisan la misma
      // notificación en vez de apilarse diez veces en la pantalla.
      tag: datos.tag || datos.tipo || 'contrataya',
      renotify: true,

      data: { url: datos.url || '/app.html' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = e.notification.data?.url || '/app.html';

  e.waitUntil((async () => {
    // Si la app ya está abierta en alguna ventana, la traemos al frente
    // en vez de abrir una nueva y dejarle dos pestañas iguales.
    const abiertas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abiertas) {
      if (c.url.includes('/app.html') && 'focus' in c) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(destino); } catch {} }
        return;
      }
    }
    await clients.openWindow(destino);
  })());
});
