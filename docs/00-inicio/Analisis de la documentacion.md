# Análisis de la documentación

El repositorio trae **dos documentos oficiales** en la raíz y una cantidad grande de documentación implícita en comentarios de código. Este vault existe porque esas dos capas ya no coinciden.

## Inventario

| Fuente | Dónde | Rol | Estado |
|---|---|---|---|
| README | `README.md` | Arranque, estructura, API de demo, deploy Render | Parcialmente vigente |
| GUÍA | `GUIA.md` | Relato de marca, producto, decisiones, riesgos | Relato vigente; tramo técnico desactualizado |
| `render.yaml` | raíz | Receta de Render | Vigente y mínima |
| Comentarios de cabecera | `server.js`, `app.js`, `enviar-avisos.js`, `canje.js`, `admin.js`, `sw.js`, `instalar.js`, `data.js` | Contrato de cada módulo | Más fiel que el README |
| HTML semántico | `index.html`, `app.html`, `admin.html`, `canje.html` | Intención de cada superficie | Vigente |
| Este vault | `docs/` | Análisis unificado y editable | Fuente de verdad documental |

No hay `CONTRIBUTING`, changelog, OpenAPI, ni esquema SQL versionado en el repo. El esquema real vive en Supabase (tablas + RPCs) y se infiere desde el cliente.

## Qué hace bien el README

Cubre lo mínimo para levantar el proyecto:

- `npm install` + `npm start` → `http://localhost:3000`
- Deploy en Render (runtime Node, `PORT` automático, HTTPS)
- Árbol de `public/` de la **primera versión**
- Tabla de la API de demostración (`/api/salud`, localidades, rubros, planes, profesionales, sponsors, verificar)
- Recordatorio de bump de `VERSION` en `sw.js`

Es un README de demo estática. Cumple ese trabajo.

## Qué hace bien la GUÍA

Es el documento más valioso del repo. No es un manual técnico: es la **memoria de producto**.

Sigue siendo la fuente correcta para:

- Nombre, isotipo (ola), paleta, tipografías, retratos ilustrados
- El riel de la costa como elemento distintivo
- Por qué el registro es obligatorio
- Flujo cliente vs profesional (el pro ve pedidos, no un catálogo)
- Calificación de doble vía y los 8 criterios
- Orden del mazo: localidad → plan → puntaje
- Cinco capas de verificación y sus pesos
- Sponsors: exclusividad por rubro+localidad + beneficio canjeable
- Planes Gratis / Verificado / Pro y la decisión de lanzar sin cargo
- Instalación Android / iOS / in-app browsers
- Bugs reales (`[hidden]` vs `display:flex`, margen del riel)
- Riesgos: huevo y gallina, fuga a WhatsApp, fricción de registro, estacionalidad

Ese relato no se reemplaza. Se enlaza.

## Dónde se rompe

La GUÍA, sección 10 y 11, describe una demo **sin base de datos**: sesión en la pestaña, Google simulado, código de 6 dígitos que acepta cualquier número, chat de mentira, verificación simulada, admin inexistente.

El código de `public/js/app.js`, `admin.js`, `canje.js` y `enviar-avisos.js` ya implementó gran parte de lo que la GUÍA marca como “falta”:

| La GUÍA dice | El código hace hoy |
|---|---|
| Sesión solo en la pestaña | `sb.auth` (Google OAuth + OTP de correo). `sessionStorage` es caché de UI, no la verdad |
| Google simulado + código cualquiera | `signInWithOAuth` y `signInWithOtp` contra el proyecto `cehyemmwhcthijzuatmz` |
| Todo vive en el navegador | Tablas `perfiles`, `pedidos`, `matches`, `deslizamientos`, `trabajos`, `mensajes`, `calificaciones` |
| No hay panel de administración | `admin.html` + `admin.js`, portón con RPC `soy_admin` |
| Informe / canje para el comercio: pendiente | `canje.html` con llave en la URL, RPCs `buscar_codigo`, `registrar_canje`, `panel_anunciante` |
| Chat de mentira | `mensajes` persistidos, leídos, globo de no leídos |
| Push “falta el servidor” | `enviar-avisos.js` + `web-push` + tabla `suscripciones_push` (apagado si no hay VAPID) |
| Admin de comercios pendiente | Contratos, casilleros, anunciantes sueltos, storage `anuncios` |
| Borrado de cuenta no existe | RPC `borrar_mi_cuenta` + `resumen_borrado` |

El README **no menciona** `admin.html`, `canje.html`, `enviar-avisos.js`, `supabase.js`, ni ninguna tabla.

La estructura del README también está incompleta: no lista `public/css/admin.css`, `canje.css`, `public/js/admin.js`, `canje.js`, `supabase.js`, ni las páginas legales (`privacidad.html`, `terminos.html`).

## Contratos que sí siguen valiendo

Estas afirmaciones de README/GUÍA siguen siendo ciertas y el código las respeta:

1. Sin build step. JS vanilla. Se edita y se recarga.
2. Express sirve `public/` y una API chica de demo.
3. `data.js` exporta por `module.exports` para Node y por globals para el navegador.
4. El orden del mazo está en `candidatos()` y se replica en `GET /api/profesionales`.
5. `POST /api/verificar` sigue siendo una simulación con timeout.
6. Hay que bumpear `VERSION` en `sw.js` (hoy está en `contrataya-v5`).
7. `[hidden] { display: none !important; }` es un contrato de CSS, no un detalle.
8. Planes, rubros, localidades y criterios viven en `data.js` como catálogo de demo y de fallback.

## Huecos documentales (antes de este vault)

1. **Esquema de Supabase.** No hay SQL en el repo. Las tablas y RPCs se reconstruyen leyendo llamadas del cliente. Ver [[Tablas Supabase]] y [[RPCs y storage]].
2. **Clave pública hardcodeada.** `public/js/supabase.js` publica URL + `sb_publishable_…`. Es la clave anónima (correcto para el browser) pero no está documentada ni rotada por entorno.
3. **RLS.** Se asume que existe (el service role “saltea todas las políticas”), pero no hay inventario de policies.
4. **Doble `app.js`.** Existen `public/js/app.js` y `public/js/app.js.js`. El HTML carga `app.js`. El otro parece un residual. Nadie lo menciona.
5. **Fotos mixtas.** `data.js` apunta varios profesionales a `.jpg`; el repo tiene mezcla de `.svg` y `.jpg`, más un `p01 (1).jpg`.
6. **Variables de entorno.** Solo se infieren de `enviar-avisos.js` y `server.js`. Ver [[Variables de entorno]].
7. **Auth admin.** Cómo se marca un usuario como admin (`soy_admin`) no está en ningún markdown.
8. **Legal.** Hay `privacidad.html` y `terminos.html` sin resumen en la guía.
9. **Interstitial / anuncios.** `quizasInterstitial` y `beneficios_de` no aparecen en la GUÍA.

## Conclusión

La documentación original es excelente como **manifiesto de producto** y débil como **mapa del sistema actual**. Este vault separa las dos cosas: el relato de marca se conserva en [[Vision]], [[Marca e identidad]] y [[Decisiones]]; el sistema real se describe en [[Aplicacion]], [[Panel admin]], [[Tablas Supabase]] y [[Pendientes]].
