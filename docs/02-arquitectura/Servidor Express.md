# Servidor Express

Archivo: `server.js`. ~100 líneas más las rutas del vault.

## Middleware

- `express.json()`
- `x-powered-by` apagado
- Cabeceras: `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`
- `GET /sw.js` y `GET /manifest.webmanifest` con `Cache-Control: no-store`
- `express.static('public')` con `extensions: ['html']`
  - `.js` / `.css` → no-cache
  - el resto → `max-age=3600`

## API de demostración

Lee `public/js/data.js` vía `require` (el archivo exporta si existe `module`).

| Método | Ruta | Comportamiento |
|---|---|---|
| GET | `/api/salud` | `{ estado, version, hora }` |
| GET | `/api/localidades` | array de 14 nombres |
| GET | `/api/rubros` | catálogo |
| GET | `/api/planes` | Gratis / Verificado / Pro |
| GET | `/api/profesionales?rubro=&localidad=` | filtro + sort localidad→plan→puntaje |
| GET | `/api/sponsors?localidad=` | comercios de esa zona |
| POST | `/api/verificar` | 800 ms y `{ verificado: true }` si la capa existe |

Estas rutas **no hablan con Supabase**. Sirven a la landing, a tests y como red de demo. La app autenticada consulta Supabase directo.

## Avisos

`POST /api/avisos/despachar` exige header `x-aviso-clave` = `AVISO_CLAVE`. Llama `despachar()` de [[Despachador de avisos]]. Al boot, `arrancarDespachador()` arma un `setInterval` de 60 s si hay `SUPABASE_URL` + service role.

## Catch-all

Cualquier otra ruta GET cae en `public/index.html` (SPA de landing). Por eso `/docs` y `/api/docs/*` tienen que registrarse **antes** del catch-all.

## Docs

Ver [[Como usar este vault]]. Rutas:

- `GET /docs` → `docs/index.html`
- `GET /docs/*` estáticos del vault (los `.md` se pueden fetch-ear)
- `GET /api/docs/tree`
- `GET /api/docs/file?path=`
- `PUT /api/docs/file` `{ path, contenido }`
- `POST /api/docs/file` alta de nota
- `POST /api/docs/folder` alta de carpeta
- `DELETE /api/docs/file?path=`

Toda ruta se normaliza y se rechaza si sale de `docs/` o no termina en `.md` (salvo carpetas).
