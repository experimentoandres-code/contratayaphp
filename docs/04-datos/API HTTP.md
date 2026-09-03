# API HTTP

Express, no Supabase. Base `http://localhost:3000`.

## Catálogo y salud

```
GET  /api/salud
GET  /api/localidades
GET  /api/rubros
GET  /api/planes
GET  /api/profesionales?rubro=&localidad=
GET  /api/sponsors?localidad=
POST /api/verificar          body: { capa }
```

`/api/verificar` responde 400 si la capa no está en `CAPAS_VERIFICACION`. Si existe, espera 800 ms y `{ verificado: true, cuando }`.

## Avisos

```
POST /api/avisos/despachar
Header: x-aviso-clave: <AVISO_CLAVE>
```

401 si la clave no coincide. 200 con el resultado de `despachar()` (`{ enviados, fallados }` o `{ salteado }`).

## Vault de documentación

```
GET    /docs
GET    /api/docs/tree
GET    /api/docs/file?path=00-inicio/Bienvenida.md
PUT    /api/docs/file          { path, contenido }
POST   /api/docs/file          { path, contenido? }     alta
POST   /api/docs/folder        { path }
DELETE /api/docs/file?path=
```

Path relativo a `docs/`. Solo `.md` para archivos. `..` y absolutas se rechazan.

## Lo que no es API propia

Auth, perfiles, matches, chat, admin y canje **no pasan por Express**. El browser habla con `https://cehyemmwhcthijzuatmz.supabase.co` usando la clave publishable.
