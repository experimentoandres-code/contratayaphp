# RPCs y storage

Inventario de `sb.rpc(...)` y buckets usados por el cliente. Las funciones viven en Supabase, no en este repo.

## App (`app.js`)

| RPC | Para qué |
|---|---|
| `cancelar_trabajo` | Cierra un trabajo |
| `denunciar` | Abre una denuncia |
| `beneficios_de` | Comercios según localidades |
| `mi_codigo_beneficio` | Código del profesional logueado |
| `tengo_pendiente_calificar` | Freno del mazo |
| `resumen_borrado` | Qué se va a borrar |
| `borrar_mi_cuenta` | Baja |
| `me_interesa_plan` | Encola upgrade |

## Admin (`admin.js`)

| RPC | Para qué |
|---|---|
| `soy_admin` | Portón |
| `marcar_verificacion` | Sello a mano |
| `activar_plan` | Pasa de interés a plan vivo |
| `levantar_suspension` | Rehabilita usuario |
| `intereses_pendientes` | Cola de planes |
| `anunciantes_sueltos` | Sin casillero |
| `asignar_casillero` | Localidad × rubro |
| `crear_anunciante` | Alta |
| `editar_anunciante` | Datos |
| `borrar_anunciante` | Baja |
| `guardar_imagen_anunciante` | URL del cartel |
| `denuncias_abiertas` | Moderación |
| `usuarios_suspendidos` | Moderación |
| `resolver_denuncia` | Cierra el caso |

## Canje (`canje.js`)

| RPC | Para qué |
|---|---|
| `buscar_codigo` | Resuelve el código del profesional con la llave del comercio |
| `registrar_canje` | Anota la visita |
| `panel_anunciante` | Dashboard del mostrador |

## Storage

| Bucket | Quién sube | Uso |
|---|---|---|
| `fotos` | usuario autenticado | avatar |
| `anuncios` | admin | cartel del casillero |

URLs públicas via `getPublicUrl`.
