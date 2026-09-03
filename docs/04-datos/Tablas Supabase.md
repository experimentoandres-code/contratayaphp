# Tablas Supabase

No hay SQL en el repo. Este inventario se reconstruye **solo** a partir de selects/inserts/updates/upserts del cliente y del despachador. Puede faltar alguna columna.

Proyecto: `https://cehyemmwhcthijzuatmz.supabase.co`

## `perfiles`

Alta automática al registrarse (trigger no versionado acá). Campos usados: `id` (auth uid), `nombre`, `foto_url`, `rol`, `puntaje_pro`, `puntaje_cliente`, `trabajos`, `contrataciones`, `desde_anio`, más los que `volcarPerfil` copia (plan, verificación, rubro, localidades, bio, etc.).

## `pedidos`

Pedido del cliente: rubro, localidad, urgencia, detalle, presupuesto, dueño. El mazo del pro los lista.

## `deslizamientos`

Historial de swipe del profesional sobre un pedido/cliente. El upsert evita volver a mostrar lo ya visto. Derecha puede abrir match.

## `matches`

Par cliente–profesional. Base de la bandeja, el chat y el trabajo.

## `trabajos`

Ciclo de obra ligado a un match. Estados y cancelación vía RPC.

## `mensajes`

`id`, `autor_id`, `texto`, `leido`, `creado_en`, y el fk al match/trabajo. El globo cuenta no leídos.

## `calificaciones`

Nota de un lado hacia el otro. Se usan para el promedio del perfil y para el freno `tengo_pendiente_calificar`.

## `interes_plan`

Cola “me interesa Verificado/Pro”. El admin aprueba o descarta.

## `contratos_publicidad`

Casillero localidad × rubro ocupado por un anunciante, vigencia, llave de canje, imagen.

## `avisos`

Cola de notificaciones: `titulo`, `cuerpo`, `tipo`, `destino_id`, `match_id`, `creado_en`, `leido_en`, `correo_en`, `push_en`, `intentos`, `error`.

## `suscripciones_push`

`usuario_id`, `endpoint`, `p256dh`, `auth`, `usada_en`, `fallos`.

## Auth

`auth.users` lo lee el despachador con service role para sacar el email. El browser nunca lo toca.

## Tablas inferidas por RPC (sin from directo)

Denuncias, suspensiones, anunciantes (puede ser tabla `anunciantes` detrás de las RPCs), códigos de beneficio. Ver [[RPCs y storage]].
