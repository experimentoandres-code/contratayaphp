# Panel admin

`public/admin.html` + `css/admin.css` + `js/admin.js`. `robots: noindex`.

## Portón

No se pinta nada hasta confirmar rol. Flujo:

1. `sb.auth.getSession()`
2. Si no hay sesión → botón Google (`signInWithOAuth`)
3. RPC `soy_admin` — si false, `signOut` y rechazo
4. Lee `perfiles` para el nombre del lateral

Cómo se convierte un usuario en admin **no está en este repo**. Vive en Supabase (tabla de admins o claim). Documentar eso en el proyecto de Supabase es un pendiente.

## Secciones

| id | Qué muestra | Fuentes |
|---|---|---|
| resumen | Métricas 7/30/90 días, mix de roles, pedidos | counts sobre tablas |
| usuarios | Listado de perfiles, ficha, verificar, suspender, activar plan | `perfiles`, `marcar_verificacion`, `activar_plan`, `levantar_suspension` |
| planes | Cola de intereses | `intereses_pendientes`, `interes_plan` |
| pedidos | Pedidos abiertos | `pedidos` |
| trabajos | Trabajos + ficha de chat | `trabajos`, `mensajes`, `matches` |
| calificaciones | Notas cruzadas | `calificaciones` |
| anunciantes | Inventario 14 × rubros, contratos, sueltos, carteles | `contratos_publicidad`, RPCs de anunciantes, storage `anuncios` |
| moderacion | Denuncias abiertas y suspendidos | `denuncias_abiertas`, `usuarios_suspendidos`, `resolver_denuncia` |

## Anunciantes

Es el módulo más denso del panel y el que sostiene el modelo de sponsors:

- Casillero libre → `crear_anunciante`
- Asignar suelto → `asignar_casillero`
- Editar / borrar / renovar contrato / liberar
- Imagen del cartel: comprime, sube a `anuncios`, `guardar_imagen_anunciante`
- Llave de mostrador: se muestra una vez para armar `/canje.html?c=`

## Periodo

Botones 7 / 30 / 90 días afectan counts del resumen. Recargar vuelve a pedir todo.
