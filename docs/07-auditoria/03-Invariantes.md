# Invariantes verificadas

Reglas ya cerradas. Se rompieron al subir un JS viejo o un SQL incompleto, y se volvieron a arreglar. Esta auditoría las contrastó contra `public/` y contra `contrataya.pro` el 28 de agosto de 2026.

**Ninguna de estas reglas se propone cambiar.**

## 1. Interstitial — 2 segundos, no una vez por día

| Chequeo | Resultado |
|---|---|
| `INTER_DELAY_MS = 2000` en `public/js/app.js` | Cumple. Línea ~2207. |
| Mismo valor en el sitio vivo | Cumple. |
| `localStorage interDia` en `public/js/app.js` | No está. Rotación por `interTurno` / `interTurnoCasa`. |
| Pagados primero, si no los de casa | Cumple. `interstitials_activos` → filtro audiencia/zona → `anunciante_id` gana. |
| Media foto / GIF / MP4 | Cumple. Video mudo, loop. |

**Cuidado:** el `app.js` de la **raíz del repo** todavía tiene `interDia` (una vez por día). Express no lo sirve. Hostinger no lo sirve. Si alguien sube ese archivo a `public/js/app.js`, se desarma la invariante. Es exactamente el accidente que estas reglas existen para evitar.

## 2. Push — VAPID real, nunca el placeholder

| Chequeo | Resultado |
|---|---|
| `VAPID_PUBLICA` en `public/js/app.js` | Clave real (`BNDOVca36…`), no `PEGA_ACA_TU_CLAVE_PUBLICA`. |
| Mismo valor en el sitio vivo | Cumple. |
| Comentario de la privada | Edge Function `despachar-avisos`, secreto `VAPID_PRIVADA`. |

El cliente guarda endpoint + keys en `suscripciones_push`. El permiso se pide después de una pantalla propia, no al primer paint.

## 3. Cancelar trabajo deja `cancelado`

El cliente llama `sb.rpc('cancelar_trabajo', { p_trabajo })`. Cancela `propuesto` y `en_curso` desde la UI.

El trigger `trabajo_guardian` **vive en Supabase, no en este repo**. Esta auditoría no pudo leer el SQL. El contrato documentado es: el guardian no pisa un cancelado. Hay que tratar ese SQL como pieza crítica: si se reescribe a mano en el dashboard, se puede romper otra vez.

## 4. Calificaciones: unique por trabajo, no por match

El insert manda `trabajo_id` + `autor_id` + `match_id`. Si Postgres devuelve `23505`, la UI dice “Ya habías calificado este trabajo”.

En modo cliente, `hacia = 'pro'`.

El unique real `(trabajo_id, autor_id)` está en la base. No está versionado acá. El cliente **asume** esa constraint; no la puede imponer solo.

## 5. Baja de cuenta no escribe `perfiles.telefono`

`borrar_mi_cuenta` se llama con `{ p_confirmacion }`. El cliente no manda teléfono.

El teléfono, según la invariante, vive en `contacto`, no en `perfiles`. El JS de la app no hace `from('contacto')`; eso queda detrás de las RPCs.

## 6. Panel de usuarios: RPC, no un select a ciegas

Camino feliz: `admin_listar_usuarios`.

Si la RPC falla, `traerPerfilesAdmin()` **cae a** `sb.from('perfiles').select(...)`. Ese fallback es el camino que la invariante quiere evitar. Hoy está mitigado (intenta RPC primero) pero no eliminado. Ver [[05-Hallazgos]].

## 7. Cliente / profesional: el modo de la app manda

`soyClienteEnMatch` se usa para columnas de inicio/fin (`inicio_cliente` / `inicio_pro`, igual con el fin). El texto de “quién pide el trabajo” y el lado de la calificación miran `Estado.rol` (y, en calificar, `tipo === 'profesional'`).

No se usa sólo `cliente_id` del match viejo para decidir el modo de la UI.

## 8. Panel Creativos / banners

`guardar_banner` está en el admin. La franja de la app lee `banner_titulo`, `banner_cuerpo`, `banner_rotulo`, `banner_fondo`, `banner_tinta`, `banner_enlace`.

Los interstitials se editan igual (textos, color, foto/GIF/MP4, enlace) con `guardar_interstitial` / `borrar_interstitial`.

## Código vivo vs raíz

| Archivo | Qué hacer |
|---|---|
| `public/js/app.js` | El que manda. FTP a Hostinger. |
| `app.js` en la raíz | Legado. Tiene `interDia`. **No subir.** |
| `public/js/app.js.js` | Residual local. No está en el sitio vivo. No cargar. |

`AGENTS.md` lo dice en una página. Sigue valiendo.
