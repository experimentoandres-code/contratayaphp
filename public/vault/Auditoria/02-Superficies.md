# Superficies

Lo que un usuario, un comercio o un admin ve hoy. El código vivo es `public/`. Hostinger sirve esos archivos. Express, si corre en local, también.

## Mapa

| Ruta | Quién | Qué es |
|---|---|---|
| `/` | Público | Landing de marca. No pide cuenta. |
| `/app.html` | Usuario | El producto. |
| `/admin.html` | Admin | Panel. `noindex`. Portón `soy_admin`. |
| `/canje.html?c=` | Comercio | Mostrador. `noindex`. Llave en la URL. |
| `/privacidad.html`, `/terminos.html` | Público | Legal. |
| `/offline.html` | PWA | Sin red. |
| Documentos (este vault) | Admin | Markdown en `public/vault/`, no se lista por URL. |

## Landing (`index.html`)

Sigue siendo la pieza de marca: riel de las 14 localidades, mazo de demostración, cómo funciona, confianza, comercios, planes, CTA a la app.

Datos del hero (247 oficios, 14 localidades, 0% comisión) son de pitch, no un `count` de Supabase. El mazo del hero usa `data.js` (16 profesionales y 10 clientes ficticios).

WhatsApp único `5492246552086`: en landing, “quiero la zona de mi comercio”. Instagram y Facebook están linkeados desde `data.js`.

## App (`app.html` + `app.js`)

Shell: barra, escena pintada por JS (sin router), cuatro tabs (Buscar, Matches, Beneficios, Perfil), bottom sheet, toasts. Tutorial en `tutorial.js`.

Scripts, en orden: `data.js?v=57` → `instalar.js` → supabase-js CDN → `supabase.js` → `app.js?v=57` → `tutorial.js?v=2`. CSS `app.css?v=31`.

### Flujo

1. **Registro** — Google OAuth o correo OTP. Obligatorio.
2. **Rol** — `necesito contratar` / `tengo un oficio`. Se puede cambiar. `?rol=pro` fuerza el lado oficio.
3. **Cliente** — pedido (rubro, localidad, urgencia, detalle) → mazo de profesionales → desliz → match → chat → trabajo → calificar.
4. **Profesional** — perfil de oficio → mazo de pedidos (no un catálogo de colegas) → desliz persistido → match → chat → trabajo → calificar al cliente.
5. **Orden del mazo** — localidad exacta, después plan (Pro → Verificado → Gratis), después puntaje.
6. **Freno** — si `tengo_pendiente_calificar`, no se publica ni se desliza hasta cerrar la nota.
7. **Beneficios** — RPC `beneficios_de`. El pro ve código (`mi_codigo_beneficio`) y credencial. La franja usa `banner_*` del anunciante.
8. **Push** — se pide en un momento de intención, no al primer paint. VAPID real en el cliente.
9. **Interstitial** — 2 s al abrir o volver de segundo plano. Pagados primero; si no, de casa. Rotación `interTurno`. Además, aviso puntual de pedidos sin tomar (mañana y tarde) que no pisa la rotación paga.
10. **Baja** — `resumen_borrado` + confirmar `BORRAR` + `borrar_mi_cuenta`. No deja irse con trabajo abierto o calificación pendiente.

El rol de la **sesión** manda para el texto de quién pide el trabajo. `soyClienteEnMatch` se usa para las columnas de inicio/fin, no para decidir el lado de la UI.

## Panel (`admin.html`)

Diez secciones. El vault técnico todavía describe ocho. Lo que el HTML declara hoy:

| Sección | Qué hace |
|---|---|
| Resumen | Métricas 7 / 30 / 90 días, mix de roles, pedidos. |
| Documentos | Este vault. Edición markdown en vivo. |
| Actividad | Movimientos, presencia en app, instalaciones. |
| Usuarios | Listado vía `admin_listar_usuarios` (si la RPC falla, hay fallback a `perfiles`). Ficha, verificar, suspender, plan, borrar. |
| Planes | Cola `interes_plan`. |
| Pedidos | Abiertos y cerrados. Cierre por RPC `admin_cerrar_pedido`. |
| Matches y chats | Trabajos + ficha de conversación. El admin puede avisar a un usuario. |
| Calificaciones | Notas cruzadas. |
| Anunciantes | 14 localidades × 4 rubros de comercio (ferretería, corralón, pinturería, aberturas). Contratos, sueltos, cartel. |
| Creativos | Banners de la franja (`guardar_banner`) e interstitials de pantalla completa (foto / GIF / MP4). |
| Moderación | Denuncias y suspendidos. |

Abono de referencia del casillero: `$80.000`. Alerta a 60 días del vencimiento.

## Canje (`canje.html`)

El comercio no se crea un usuario. Recibe `/canje.html?c=<llave>`. Busca el código del profesional, registra la visita (no la compra) y ve su panel. RPCs: `buscar_codigo`, `registrar_canje`, `panel_anunciante`.

No hay informe mensual PDF ni mail automático al comercio.

## Legal y PWA

`privacidad.html` y `terminos.html` existen. El manifiesto pide `standalone`. El SW precachea landing, app, offline, tokens, CSS/JS núcleo e íconos. `instalar.js` cubre Android, iOS (tres pasos) y navegadores in-app (Instagram / Facebook / WhatsApp).

Notificaciones en iPhone **solo** con la app en inicio. Eso no cambió.

## Catálogo demo (`data.js`)

Sigue en el cliente porque la landing y el fallback lo usan:

- 14 localidades (norte → sur).
- 20 rubros de oficio.
- 5 capas de verificación (modelo; no hay proveedores).
- 16 profesionales y 10 clientes ficticios.
- 5 sponsors de pitch.
- Planes Gratis $0 / Verificado $9.900 / Pro $24.900, “activar sin cargo” en la UI.

Ese mazo **no es la plaza**. Un cliente nuevo tiene que ver perfiles de `perfiles`, no a Rubén Alcaraz.
