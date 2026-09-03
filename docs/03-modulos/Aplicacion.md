# Aplicación

`public/app.html` + `css/app.css` + `js/app.js` (~3500 líneas). Es el producto.

## Shell

- `#barra` — marca, título de vista, botón de zona
- `#escena` — se pinta entero por JS (no hay router de páginas)
- `#tabs` — Buscar, Matches (con globo), Beneficios, Perfil
- `#hoja` — bottom sheet
- `#brindis` — toasts

Scripts, en orden: `data.js` → `instalar.js` → supabase-js CDN → `supabase.js` → `app.js`.

## Máquina de vistas

`irA(vista)` + `Estado.vista`. Pintores principales:

| Vista | Funciones |
|---|---|
| Registro | `verRegistro`, `registroGoogle`, `registroCorreo` |
| Rol | `verBienvenida`, `guardarRol` |
| Buscar | `verBuscar` → formulario o mazo |
| Mazo | `verMazo`, `pintarMazo`, `arrastrable`, `resolver` |
| Matches | `verMatches`, `verMatchDetalle`, `verMatchChat` |
| Beneficios | `verBeneficios`, `verCredencial` |
| Perfil | `verPerfilPro` / `verPerfilCliente`, planes, verificación, borrar |

## Matching

- Cliente pide → `pedidos`
- Pro carga pedidos no deslizados → `cargarPedidosPro` (resta `deslizamientos`)
- Cliente carga profesionales → `cargarProfesionalesCli` (resta matches propios)
- Desliz del pro: `persistirDeslizPro` (upsert deslizamiento; si es derecha, upsert match)
- Desliz del cliente: `persistirMatchCli`
- Festejo: `festejarMatch`

El sort local `candidatos()` aplica el contrato localidad → plan → puntaje sobre la lista ya bajada.

## Trabajo y chat

Un match puede abrir `trabajos`. Acciones: marcar en curso, cancelar (`cancelar_trabajo`), pedir de nuevo. El chat lee/escribe `mensajes`, marca leídos, y un latido (`arrancarLatido`) refresca globo y puntajes.

## Calificación y denuncia

`calificarReal` inserta en `calificaciones`. `denunciar` llama RPC. El admin resuelve en [[Panel admin]].

## Push en el cliente

`hayPush()`, `registrarSuscripcion()` guarda endpoint + keys en `suscripciones_push`. Se pide permiso con `quizasPedirAvisos` en un momento de alta intención, no al primer paint.

## Fotos

`prepararFoto` recorta / comprime. `subirFotoPerfil` → bucket `fotos`. `guardarFotoEnPerfil` actualiza `perfiles.foto_url`.

## Borrado

`verBorrarCuenta` muestra `resumen_borrado` y confirma con `borrar_mi_cuenta` + `signOut`.
