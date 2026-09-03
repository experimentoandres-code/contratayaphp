# Flujos de usuario

Implementados en `public/js/app.js`. Vistas: registro → rol → buscar (formulario / mazo) → matches → beneficios → perfil.

## Registro

Nadie entra sin cuenta. Dos caminos:

1. **Google** — `sb.auth.signInWithOAuth({ provider: 'google' })`.
2. **Correo** — `sb.auth.signInWithOtp`. El usuario pone nombre y correo; llega un enlace / código.

Letra chica: nombre y calificación son visibles para la otra parte; teléfono y dirección no.

La GUÍA describe un Google simulado y un código de 6 dígitos que acepta cualquier número. **Eso ya no es el código actual.** Ver [[Analisis de la documentacion]] y [[Estado y persistencia]].

## Elección de rol

`necesito contratar` o `tengo un oficio`. Se persiste en `perfiles.rol` y se puede cambiar. Query `?rol=pro` en `app.html` fuerza el lado profesional si ya hay sesión.

## Cliente

1. **Pedido** — rubro (15), localidad (14), urgencia (`urgente` / `semana` / `planeado`), detalle opcional. Se inserta en `pedidos`.
2. **Mazo** — tarjetas de profesionales: foto, nombre, rubro, localidad, especialidades, puntaje, trabajos, tiempo de respuesta, precio de arranque. Deslizar o botones. El del medio abre ficha con reseñas y verificación.
3. **Match** — celebración con las dos fotos y el comercio de la localidad.
4. **Chat** — `mensajes` ligados al match/trabajo.
5. **Trabajo** — estados (en curso, cancelar, nuevo trabajo).
6. **Calificación** — 4 criterios al profesional.
7. **Denuncia** — RPC `denunciar`.

## Profesional

1. **Perfil de oficio** — rubro, zona(s), bio. Plan y verificación salen de `perfiles`.
2. **Mazo de pedidos** — foto del cliente, localidad, antigüedad, calificación, contrataciones, qué necesita, presupuesto, urgencia. Si el cliente no vive en la costa, la tarjeta lo marca (`ausente` en el catálogo demo; en real depende del perfil).
3. Deslizar persiste en `deslizamientos`. Match mutuo escribe `matches`.
4. Chat, trabajo y calificación al cliente (otros 4 criterios).

Las urgencias van en coral.

## Orden del mazo

Función `candidatos()` en `app.js`, replicada en `GET /api/profesionales`:

1. Localidad exacta primero
2. Plan: Pro → Verificado → Gratis
3. Puntaje

El plan pago gana **dentro** de la zona, no contra la geografía. Es la condición para que el freemium no queme confianza.

## Perfil

Foto (grilla de ilustraciones o subida real a `storage.fotos`), nombre, correo, método, localidad, puntaje, trabajos, cerrar sesión, borrar cuenta.

Sin calificaciones el puntaje es un guion y se explica **por qué te van a calificar**. Al enviar una nota, el otro lado recibe la suya y el promedio se recalcula.

Hay un freno: si `tengo_pendiente_calificar` es verdadero, no se sigue matcheando hasta cerrar esa nota.

## Beneficios

El profesional con plan activo ve su código (`mi_codigo_beneficio`) y la grilla de comercios (`beneficios_de`). El cliente ve el mismo mapa de sponsors. El canje real se hace en el mostrador: [[Canje comercial]].

## Calificación de doble vía

| Cliente → profesional | Profesional → cliente |
|---|---|
| Calidad del trabajo | Pagó en fecha |
| Cumplió el plazo | Fue claro con el pedido |
| Respetó el precio | Dio acceso a la obra |
| Dejó limpio | Trato |

Definido en `CRITERIOS` de `data.js`.
