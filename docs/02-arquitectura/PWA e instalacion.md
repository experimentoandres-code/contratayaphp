# PWA e instalación

## Manifiesto

`public/manifest.webmanifest`. Nombre Contratá Ya, `display: standalone`, `theme-color` asfalto, íconos 192 / 512 / maskable 512.

## Service worker

`public/sw.js`, versión actual **`contrataya-v5`**.

- Install: precache de landing, app, offline, tokens, CSS/JS núcleo, isotipo e íconos.
- Activate: borra caches viejos, `clients.claim()`.
- Fetch:
  - origen distinto → red
  - navegación → red primero, si falla cache u `offline.html`
  - estáticos → cache-first con actualización al paso
- Push: el SW ya sabe mostrar la notificación. El envío sale de [[Despachador de avisos]].

**Al deployar hay que subir `VERSION`.** Si no, los teléfonos siguen la copia vieja. Es el error más común de esta app.

`instalar.js` registra el SW en `load`.

## Instalación por plataforma

Lógica en `public/js/instalar.js` (módulo `Instalar`):

| Contexto | Camino |
|---|---|
| Android / escritorio Chromium | captura `beforeinstallprompt`, botón nativo |
| iPhone Safari | instructivo de 3 pasos (Compartir → Agregar a inicio). iOS no tiene prompt |
| Instagram / Facebook / WhatsApp / GSA | “estás dentro de otra app” + botón copiar URL |
| Ya instalada (`display-mode: standalone` o `navigator.standalone`) | no molestar |

La landing arma `#cintaInstalar`. La app muestra una cinta angosta en iOS que se cierra y no vuelve en esa sesión.

Notificaciones en iPhone **solo** si está en la pantalla de inicio. Por eso el instructivo no es cosmética.

## Por qué HTTPS

`beforeinstallprompt`, service worker y Web Push exigen contexto seguro. En local, `localhost` cuenta. En producción lo da Render.
