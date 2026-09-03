# Inventario técnico

Corte al 28 de agosto de 2026. Código vivo: `public/`. Sitio: `contrataya.pro`. Base: proyecto Supabase `cehyemmwhcthijzuatmz`.

## Stack

```
navegador  ──estáticos──►  Hostinger (public/)
    │
    ├── supabase-js ──────────► Auth, Postgres, Storage, RPC
    │
    ├── Web Push ─────────────► Edge Function despachar-avisos
    │                           (secreto VAPID_PRIVADA)
    │
    └── PHP ──────────────────► docs-api.php (Documentos, sólo admin)
                                mcp.php (conector Grok)
```

En local, `npm.cmd start` levanta Express (`server.js`): mismos estáticos, API de demo, vault técnico en `/docs`, vault admin en `/api/admin/docs`, y el despachador Node `enviar-avisos.js` (apagado si faltan env).

**Producción no corre ese Express.** Render/`render.yaml` es receta vieja. El sitio que se usa es Hostinger.

## Versiones en el cliente

| Pieza | Valor |
|---|---|
| Service worker | `contrataya-v60` (repo y sitio, coinciden) |
| `app.js` | `?v=57` |
| `data.js` | `?v=57` |
| `app.css` | `?v=31` |
| `admin.js` | `?v=27` |
| `admin.css` | `?v=20` |
| `tutorial.js` | `?v=2` |
| supabase-js | CDN `@2` |
| Node (local) | `>=18`, dependencias: `express`, `web-push` |

La nota `docs/02-arquitectura/PWA e instalacion.md` todavía dice `contrataya-v5`. Está desactualizada.

## Archivos de producto (aprox.)

| Archivo | Tamaño | Rol |
|---|---|---|
| `public/js/app.js` | ~166 KB / ~4.000 líneas | Producto |
| `public/js/admin.js` | ~114 KB / ~2.400 líneas | Panel |
| `public/js/admin-docs.js` | ~21 KB | Documentos del panel |
| `public/js/admin-chat.js` | ~5 KB | Chat desde el panel |
| `public/js/admin-matches.js` | ~5 KB | Matches del panel |
| `public/js/data.js` | ~24 KB | Catálogo demo + constantes |
| `public/js/landing.js` | ~15 KB | Landing |
| `public/js/canje.js` | ~8 KB | Mostrador |
| `public/js/tutorial.js` | ~4 KB | Guía in-app |
| `public/js/supabase.js` | 6 líneas | URL + clave publishable |
| `public/css/app.css` | ~49 KB | App |
| `public/css/admin.css` | ~38 KB | Panel |
| `public/css/landing.css` | ~26 KB | Landing |
| `public/index.html` | ~15 KB | Landing |

En el sitio vivo **no** está `js/app.js.js`. En el repo local sí (residual).

## Tablas que el cliente toca

Inferidas por `from(...)`. Puede faltar alguna que sólo usa SQL.

| Tabla | Uso |
|---|---|
| `perfiles` | Alta, rol, foto, plan, puntaje, zona |
| `pedidos` | Pedido del cliente; mazo del pro |
| `deslizamientos` | Swipe del pro; no repetir |
| `matches` | Par, bandeja, chat |
| `trabajos` | Ciclo de obra |
| `mensajes` | Chat, leídos, globo |
| `calificaciones` | Nota por trabajo |
| `interes_plan` | Cola de upgrade |
| `contratos_publicidad` | Casillero localidad × rubro |
| `anunciantes` | Comercio |
| `interstitials` | Avisos a pantalla completa |
| `avisos` | Cola de notificaciones |
| `suscripciones_push` | Endpoint Web Push |
| `movimientos` | Actividad del panel |

Tablas / funciones que se ven sólo por RPC: denuncias, suspensiones, presencia, instalaciones, contacto (teléfono), códigos de beneficio.

## RPCs que el cliente llama

### App

`cancelar_trabajo`, `denunciar`, `interstitials_activos`, `beneficios_de`, `mi_codigo_beneficio`, `tengo_pendiente_calificar`, `resumen_borrado`, `borrar_mi_cuenta`, `me_interesa_plan`, `latir_presencia`, `marcar_app_instalada`.

### Admin

`soy_admin`, `admin_listar_usuarios`, `admin_presencia`, `admin_instalaciones`, `marcar_verificacion`, `activar_plan`, `levantar_suspension`, `admin_borrar_usuario`, `intereses_pendientes`, `admin_cerrar_pedido`, `anunciantes_sueltos`, `asignar_casillero`, `crear_anunciante`, `editar_anunciante`, `borrar_anunciante`, `guardar_imagen_anunciante`, `guardar_banner`, `guardar_interstitial`, `borrar_interstitial`, `denuncias_abiertas`, `usuarios_suspendidos`, `resolver_denuncia`, `admin_avisar_usuario`.

### Canje

`buscar_codigo`, `registrar_canje`, `panel_anunciante`.

La nota `docs/04-datos/RPCs y storage.md` está corta: no lista presencia, interstitials, banners, `admin_listar_usuarios`, ni varias RPC nuevas del panel.

## Storage

| Bucket | Quién | Uso |
|---|---|---|
| `fotos` | usuario autenticado | avatar |
| `anuncios` | admin | cartel, banner, interstitial (límite documentado 15 MB; MP4 ≤ 8 MB en producto) |

## Auth y claves en el browser

```
SUPABASE_URL = https://cehyemmwhcthijzuatmz.supabase.co
SUPABASE_KEY = sb_publishable_…   (anónima / publishable, correcta en el cliente)
```

Service role: **nunca** en `public/`. El campo `supabase_service_role` de `mcp-config.php` está vacío en el repo, bien.

WhatsApp: `5492246552086` (landing y “verificar por WhatsApp” del perfil).

## Duplicados peligrosos (no vivos)

En la raíz: `app.html`, `app.js`, `app.css`, `index.html`, `sw.js`, `css/`, `js/`, `img/`. Express no los sirve. El `app.js` de la raíz tiene interstitial diario.

`public/js/app.js.js`: residual local, no está en Hostinger.

## PHP de producción

| Archivo | Para qué |
|---|---|
| `docs-api.php` | API del vault Documentos. Exige Bearer + `soy_admin`. |
| `mcp.php` | Conector MCP 24/7. Hostinger, la PC puede estar apagada. |
| `mcp-config.php` | Token del conector. Comentario: no subir a git público. Hoy está en el repo. |
