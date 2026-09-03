# Invariantes — no volver a desarmar

Estas reglas ya se implementaron, se rompieron al subir un JS viejo o un SQL incompleto, y se volvieron a arreglar. **No se cambian** salvo que Andrés lo pida explícito.

El código vivo es `public/` (Hostinger). No subir `app.js` de la raíz del repo: ahí puede quedar un placeholder.

## Interstitial

- Disparo: **2 segundos** después de abrir la app, y al volver de segundo plano. Constante `INTER_DELAY_MS` en `public/js/app.js`.
- **No** es una vez por día. No reponer `localStorage interDia`.
- Rotación: si hay avisos **pagados** para esa audiencia y zona, sólo esos, en `orden`. Si no, los de casa. Cada apertura muestra el siguiente (`interTurno`).
- Media: foto, GIF o MP4 (mudo, loop, ≤ 15 s, ≤ 8 MB). Bucket `anuncios` con `file_size_limit` 15 MB.

## Push

- Clave pública VAPID en `public/js/app.js` (nunca `PEGA_ACA_TU_CLAVE_PUBLICA`).
- Privada: Edge Function `despachar-avisos`, secreto `VAPID_PRIVADA`.
- Avisos en tabla `avisos` por trigger: match, pedido, trabajo, pasos, mensaje (~1 min), calificación.
- Despacho: Edge Function + cron + trigger `trg_disparar_despacho`.

## Trabajos y baja de cuenta

- `cancelar_trabajo` deja `estado = 'cancelado'` de verdad. `trabajo_guardian` **no** puede revertir un cancelado.
- Se cancela `propuesto` y `en_curso`.
- `borrar_mi_cuenta` **no** escribe `perfiles.telefono` (el teléfono está en `contacto`).
- Panel de usuarios: RPC `admin_listar_usuarios`, no un `select` a `perfiles` a ciegas.

## Cliente / profesional (cuentas que usan los dos lados)

- El **modo de la app** manda: en modo cliente, el usuario pide el trabajo y califica al oficio.
- No usar sólo `cliente_id` del match viejo para el texto de “quién pide el trabajo”.
- `soyClienteEnMatch` sí se usa para marcar inicio/fin (columnas de la base).

## Calificaciones

- Unique: `(trabajo_id, autor_id)`. **No** unique `(match_id, autor_id)`.
- En modo cliente, `hacia = 'pro'`.

## Panel Creativos

- Banners editables igual que interstitials (textos, color, foto, enlace) vía `guardar_banner`.
- Franja de la app usa `banner_*` de `beneficios_de`.
