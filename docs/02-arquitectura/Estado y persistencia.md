# Estado y persistencia

Hay **tres memorias**. Mezclarlas es la forma más fácil de romper la app.

## 1. UI en el navegador

Objeto `Estado` en `app.js`:

```
usuario, rol, zona, pedido, vistos, matches, vista, yo
```

Se serializa a `sessionStorage.contrataya`. Sobreve el refresh de la pestaña, **no** un cierre completo del browser (según el motor). No es la fuente de verdad.

`arrancar()` compara ese cache con `sb.auth.getSession()`. Si hay usuario cacheado y no hay sesión, limpia todo. Comentario del código: *la verdad la tiene Supabase, no el navegador*.

## 2. Auth y filas de negocio

Supabase Auth (Google / OTP). Al existir la sesión se lee `perfiles` (trigger de alta al registrarse, no visible en este repo). De ahí salen foto, puntajes, plan, verificaciones, zonas.

Tablas de movimiento: `pedidos`, `deslizamientos`, `matches`, `trabajos`, `mensajes`, `calificaciones`, `suscripciones_push`, `interes_plan`, `contratos_publicidad`, `avisos`. Ver [[Tablas Supabase]].

## 3. Catálogo de demostración

`public/js/data.js`: localidades, rubros, urgencias, capas, 15 profesionales, 10 clientes, criterios, sponsors, planes. Lo consume:

- el navegador como global
- Node via `module.exports` para `/api/*`

Si Supabase no trae filas, partes de la UI todavía pueden apoyarse en este catálogo (landing, API, fallbacks). No hay que usarlo como “producción”.

## Fotos

- Ilustraciones locales `/img/gente/*`
- Subida real: `sb.storage.from('fotos')` y `perfiles.foto_url`
- Anuncios: bucket `anuncios`

`esFotoReal(url)` distingue ilustración de foto subida. Al profesional se le pide foto real.
