# Bienvenida

Vault de documentación de **Contratá Ya**. Vive en `docs/` en la raíz del proyecto y se lee como un Obsidian: carpetas a la izquierda, notas en markdown, enlaces `[[entre corchetes]]` y edición en el mismo navegador.

Abrilo en local: [http://localhost:3000/docs](http://localhost:3000/docs)

## Qué es este vault

Un análisis completo de lo que el repositorio **dice** (README, GUÍA) y de lo que el código **hace hoy**. No es un espejo de la guía original: esa guía describe una demo de agosto; el código ya tiene autenticación real, base en Supabase, panel de administración, canje comercial y avisos.

Empezá por estas tres notas:

1. [[Analisis de la documentacion]] — qué cubren README y GUÍA, qué quedó viejo, qué falta
2. [[Mapa del vault]] — índice de todas las carpetas
3. [[Vision]] — el producto en una página
4. [[00-Indice]] — auditoría del estado actual (28 ago 2026)

## Cómo está organizado

| Carpeta | Para qué |
|---|---|
| `00-inicio` | Este vault, cómo usarlo, mapa |
| `01-producto` | Marca, flujos, negocio, riesgos |
| `02-arquitectura` | Servidor, PWA, estado, estructura |
| `03-modulos` | Landing, app, admin, canje, avisos |
| `04-datos` | Catálogo demo, tablas, RPCs, API HTTP |
| `05-diseno` | Paleta, tipografías, decisiones |
| `06-operacion` | Local, Hostinger, invariantes, pendientes |
| `07-auditoria` | Corte del 28 ago 2026: dictamen, superficies, invariantes verificadas, hallazgos |

## Lectura rápida

- **Producto:** marketplace de oficios de la construcción para las 14 localidades del Partido de la Costa. Registro obligatorio, mazo de deslizamiento, match, chat, calificación de doble vía, sponsors por rubro y localidad.
- **Stack:** Node 18+ / Express, frontend sin build, PWA, Supabase (Auth + Postgres + Storage + RPC), Resend y Web Push opcionales.
- **Superficies:** `/` landing, `/app.html` producto, `/admin.html` panel, `/canje.html?c=` mostrador, `/docs` este vault.

## Convención de enlaces

Escribí `[[Nombre de la nota]]` o `[[01-producto/Vision]]`. El visor resuelve por título o por ruta. Los archivos `.md` se pueden editar acá mismo: **Ctrl+S** guarda en disco si el servidor está arriba.
