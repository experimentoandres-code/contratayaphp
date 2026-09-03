# Dictamen

Contratá Ya **ya no es una demo de navegador**. Es una PWA en producción, con cuentas reales, matching, chat, trabajo, calificación, publicidad, canje y un panel de administración denso. El producto de matching está construido. Lo que falta para un lanzamiento honesto no es “armar la app”: es plaza, verificación de verdad y un mapa operativo que coincida con lo que corre.

## Veredicto en una línea

**Listo como plataforma. No listo como plaza.** El circuito cliente ↔ oficio funciona. El circuito comercio (casillero, banner, interstitial, canje) está armado. La plaza todavía depende de perfiles reales, sellos creíbles y cobro que todavía no existe.

## Qué está vivo (28 ago 2026)

| Capa | Estado |
|---|---|
| Sitio | `contrataya.pro` en Hostinger. El código vivo es `public/`. |
| App | Registro Google / OTP, rol cliente o pro, mazo, match, chat, trabajo, calificar, denunciar, borrar cuenta, tutorial, push, interstitial. |
| Panel | Portón `soy_admin`. Diez secciones, no las ocho que describe el vault viejo. |
| Canje | `/canje.html?c=` con RPCs de mostrador. |
| Datos | Supabase `cehyemmwhcthijzuatmz` (Auth + Postgres + Storage + RPC). |
| PWA | Service worker `contrataya-v60`, manifiesto, offline, instalación iOS/Android. |
| Avisos | Cliente con VAPID real. Despacho de producción: Edge Function, no el Express de Render. |

El matching, el chat persistido, el ciclo de trabajo, el freno por calificación pendiente y la baja de cuenta **están implementados**. El panel puede listar usuarios por RPC, marcar verificación, activar planes, editar banners e interstitials, y escribir el vault de Documentos.

## Qué no es

- No es “todo vive en el navegador”. Eso era la GUÍA de la demo. Hoy `sessionStorage` es caché de UI; la verdad está en Supabase.
- No es un servicio Node en Render. El README y `render.yaml` siguen hablando de eso. El sitio que la gente usa es Hostinger + PHP (`docs-api.php`, `mcp.php`) + estáticos.
- No es un directorio. Sin cuenta no hay mazo útil; el registro es obligatorio a propósito.
- No es un cobro automático. Planes Gratis / Verificado / Pro están en la UI; el dinero entra (si entra) por cola de interés + botón del admin.

## Semáforo

| Área | Color | Por qué |
|---|---|---|
| Matching, chat, trabajo, calificación | Verde | Circuito completo en `public/js/app.js`. |
| Invariantes cerradas (interstitial, VAPID, cancelar, unique, teléfono, banners) | Verde | Verificadas en código vivo y en el sitio. Detalle: [[03-Invariantes]]. |
| Panel de operación | Verde | Cubriendo usuarios, pedidos, matches, creativos, moderación, documentos. |
| Publicidad y canje | Verde (producto) / ámbar (plaza) | El módulo existe; no se midió cuántos casilleros están ocupados. |
| Verificación en cinco capas | Rojo | Sello del admin o simulación. SMS, AFIP y liveness no están. |
| Monetización | Rojo | Sin Mercado Pago. Cola `interes_plan` + `activar_plan`. |
| Documentación de arranque | Ámbar | README/GUÍA y varias notas de `docs/` van atrás del código. |
| Esquema SQL y RLS | Rojo | No hay `schema.sql` ni inventario de policies en el repo. |
| Duplicados de la raíz | Ámbar | `app.js` de la raíz todavía tiene `interDia` (una vez por día). No se sirve, pero es el archivo que ya rompió el sitio una vez. |

## Lectura para Andrés

Si la pregunta es “¿la app hace lo que promete al usuario?”: **sí, el loop de contratar un oficio está**. Pedido, desliz, match, chat, abrir trabajo, marcar inicio/fin, calificar, denunciar, borrar cuenta.

Si la pregunta es “¿la podemos mostrar como plaza abierta del Partido de la Costa?”: **todavía no de forma honesta**. Faltan oficios reales (el mazo de `data.js` es ficticio), la verificación no es automática, y las cifras de la landing (247 oficios, 0% comisión) son de pitch.

Si la pregunta es “¿se puede cobrar?”: el casillero de publicidad y el canje sí; el abono de planes no. Detalle en [[06-Lanzamiento]].

Hallazgos ordenados: [[05-Hallazgos]]. Inventario: [[04-Inventario]]. Superficies: [[02-Superficies]].
