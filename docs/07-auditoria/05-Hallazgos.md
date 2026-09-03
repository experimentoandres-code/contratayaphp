# Hallazgos

Ordenados por impacto. “Cerrado” significa: no reabrir salvo que Andrés lo pida. El resto es deuda o desfasaje, no un pedido de cambio.

## P0 — no tocar (ya cerrado)

Ver [[03-Invariantes]]. Interstitial a 2 s, VAPID real, cancelar deja `cancelado`, unique de calificaciones por trabajo, teléfono fuera de `perfiles`, modo de la app para el texto de quién pide, banners por `guardar_banner`.

El `app.js` de la raíz con `interDia` es el fósil de este grupo. No desplegarlo.

## P1 — bloquean un lanzamiento honesto

### 1. Verificación de teatro

Las cinco capas (teléfono SMS, mail, CUIT/AFIP, DNI + liveness, zona) están modeladas. `POST /api/verificar` espera 800 ms y dice que sí. En la app hay simulación de UI. El sello real lo pone el admin (`marcar_verificacion`) o un WhatsApp al número de casa.

Lanzar con badge “verificado” sin esas capas es riesgo reputacional, no un detalle de backlog.

### 2. Plaza: el mazo de `data.js` no cuenta

16 oficios y 10 vecinos ficticios. La mitigación escrita hace meses sigue igual: cargar 50–60 perfiles reales **antes** de abrirle la app a un cliente. Un mazo vacío mata la plaza. Un mazo de ilustraciones la miente.

Esta auditoría no midió cuántos perfiles reales hay en Supabase.

### 3. SQL y RLS fuera del repo

No hay `schema.sql` ni migraciones. Triggers (`trabajo_guardian`, alta de perfil, cola de `avisos`), uniques y policies viven sólo en el dashboard. Ya se rompieron una vez por SQL incompleto. Sin versionado, se van a volver a romper.

### 4. Quién es admin

`soy_admin` es el portón. Cómo se marca a una persona como admin **no está escrito** en el repo. Si se pierde el acceso al proyecto de Supabase, el panel queda ciego.

## P2 — bloquean la monetización

1. Cobro de planes (Mercado Pago / suscripción). Hoy: `me_interesa_plan` → cola → `activar_plan` a mano.
2. Informe mensual del comercio (PDF o mail). El canje anota visitas; nadie las resume al anunciante.
3. Promesas del plan Pro que la UI vende y el código no cumple: presupuestos / firma, estadísticas de vistas y contactos, galería de trabajos (no solo avatar).

La palanca de **publicidad local** sí está construida (casillero, creativos, canje). La de **abono del oficio** no.

## P3 — el mapa no coincide con el terreno

| Documento | Dice | La realidad |
|---|---|---|
| `README.md` | Demo, API, deploy Render | Hostinger + Supabase. No menciona admin, canje, ni tablas. |
| `GUIA.md` §10–11 | Sesión en la pestaña, Google simulado, chat de mentira | Auth real, chat persistido, panel, canje, push. |
| `PWA e instalacion.md` | SW `contrataya-v5` | `contrataya-v60`. |
| `Panel admin.md` | 8 secciones | 10 (faltan Documentos, Actividad, Creativos). |
| `RPCs y storage.md` | Lista corta | Faltan ~15 RPCs (presencia, banners, interstitials, admin_*). |
| `Vision tecnica.md` / Despliegue | Express + Render como producción | Producción = Hostinger. Express es local. |
| Landing | 247 oficios | Pitch. |

Un operador que siga el README al pie configura Render y cree que no hay Supabase. Eso ya está escrito en el análisis de documentación; **sigue sin corregirse**.

## P4 — higiene y riesgo operativo

1. **Duplicados de la raíz.** El archivo que ya rompió el interstitial sigue al lado del código vivo.
2. **`public/js/app.js.js`.** Residual local. El sitio no lo tiene. Borrar cuando se limpie, no “arreglarlo”.
3. **Fotos mixtas.** `.svg` + `.jpg` + `p01 (1).jpg` en `img/gente/`.
4. **Fallback a `perfiles`** si falla `admin_listar_usuarios`. Contraría el espíritu de la invariante.
5. **Dos despachadores.** Node `enviar-avisos.js` (Render/local) vs Edge Function (Hostinger). En producción el que importa es el Edge. Si alguien “arregla avisos” en Express, el celular no se entera.
6. **Token del MCP** en `mcp-config.php`, con comentario de no subirlo a git público. El archivo está en el repo. `mcp.php` acepta `Authorization` o `?token=`. CORS `*`.
7. **Clave publishable** hardcodeada. Es lo correcto para el browser; rotarla implica editar el archivo y bumpear SW.
8. **Sin `.env.example`.** Las variables se infieren de `enviar-avisos.js`.
9. **Bump de SW como folklore.** Hoy está en v60, así que alguien lo está haciendo. No hay checklist de release en el repo más que una nota.
10. **Mazo visible sin cuenta** (plan B de la GUÍA si el registro frena). No implementado. Hay que medirlo; no hay medición.

## P5 — producto menor, no bloquea

- Tutorial in-app: está.
- Presencia (`latir_presencia`) e “app instalada”: están, el panel las usa.
- Interstitial de pedidos sin tomar (mañana / tarde) para el pro: está, y no pisa la rotación paga.
- Galería de trabajos, abandono del registro, unificar fotos: pendientes de producto.

## Qué esta auditoría no afirma

No afirma cuántos usuarios hay, si el push llega hoy a un Android concreto, ni si `trabajo_guardian` en la base sigue siendo el SQL bueno. Esas tres cosas hay que mirarlas en Supabase y en un teléfono, no en el zip.
