# CONTRATÁ YA — Guía completa

Todo lo que se construyó, por qué, y qué falta decidir antes de salir a la calle.

---

## 1. La marca

### El nombre

**CONTRATÁ YA.** Directo, imperativo y sin metáfora: dice exactamente lo que la app hace. En Rioplatense el "ya" carga las dos cosas que importan acá, que es rapidez y decisión.

En la marca escrita, "CONTRATÁ" va en blanco roto y "YA" adentro de una pastilla ámbar. Esa separación hace que el nombre se lea rápido y que la parte que importa quede resaltada, incluso cuando el logo está chico.

### El isotipo

**Una ola.** Es lo único que identifica al Partido de la Costa sin necesidad de explicarlo: una ola rompiendo, con la espuma abajo. La ola es maciza y ámbar, con el rizo tallado en negativo, y la espuma va en un trazo más tenue para dar profundidad.

Probé antes fusionarla con un casco de obra y no funcionó: la cúpula del casco y el rizo de la ola pelean por la misma forma y el resultado se leía como una galera. La solución fue repartir el trabajo: el isotipo dice **la costa**, el nombre dice **contratá ya**, y el oficio lo aporta el producto adentro.

Se sostiene a 22 píxeles en una pestaña y a 512 en el ícono de la pantalla de inicio. Está en SVG, así que escala sin perder nada.

Archivos: `public/img/isotipo.svg`, `logo.svg`, más los PNG generados para la instalación.

### La paleta

| Color | Valor | Para qué |
|---|---|---|
| Asfalto mojado | `#0B1620` | Fondo principal |
| Superficie | `#12222E` | Tarjetas y franjas |
| Cal | `#EDE7DA` | Texto (blanco roto, cálido) |
| **Ámbar de señalización** | `#F0A63A` | Acento principal, la ola |
| Verde marea | `#2FB2A6` | Verificado, aceptar |
| Coral | `#E4574C` | Descartar, urgencias |

El ámbar viene de la señalización de obra. El verde marea, del Atlántico. La combinación es específica de este proyecto: construcción sobre la costa.

### Las tipografías

- **Archivo** en ancho expandido para títulos. Grotesca industrial, con carácter de cartelería.
- **Inter Tight** para lectura. Neutra y clara en pantalla chica.
- **IBM Plex Mono** para todo lo que es dato: puntajes, precios, localidades. Le da al producto un registro de *ficha de obra* en vez de red social.

Esa tercera tipografía es la que hace la diferencia. Sin ella, la app parecería cualquier marketplace.

### Los retratos

Las 25 caras del sistema (15 profesionales, 10 clientes) son **ilustraciones generadas**, no fotos de banco de imágenes. La decisión fue deliberada: una foto de stock de un albañil sonriente arruina la credibilidad de una app cuyo activo es que la gente es real y de acá.

Las ilustraciones varían tono de piel, peinado, barba, ropa de trabajo y casco, sobre fondos apagados que integran con la paleta oscura. Se ven intencionales y dejan clarísimo dónde va la foto real cuando entre.

Están en `public/img/gente/`: `p01` a `p15` para profesionales, `c01` a `c10` para clientes. Se reemplazan cambiando el campo `foto` en `data.js`.

## 2. El elemento distintivo

**El riel de la costa.**

En la landing, fijo a la izquierda, hay una línea vertical con las 14 localidades del partido en orden real de norte a sur, de San Clemente del Tuyú a Costa Esmeralda. Una contrata-ya de color ámbar baja por esa línea a medida que se hace scroll, e ilumina la localidad correspondiente.

No es decoración. El Partido de la Costa **es** una línea: 14 pueblos pegados uno abajo del otro sobre la misma ruta. La página reproduce esa geografía. Cuando alguien de San Bernardo llega a la mitad del scroll y ve iluminado "SAN BERNARDO", entiende que la app es de acá.

En pantallas menores a 1240 píxeles desaparece, porque no hay lugar y no es esencial.

---

## 3. Cómo funciona la app

### Registro obligatorio

**Nadie entra sin cuenta.** La primera pantalla ofrece dos caminos:

- **Continuar con Google** — dos toques, sin escribir nada.
- **Continuar con correo** — nombre y correo, código de seis dígitos para confirmar.

En la demostración los dos están simulados: Google tarda un segundo y medio y devuelve una cuenta, y el código acepta cualquier número de seis cifras.

Que el registro sea obligatorio no es un capricho. Es lo que sostiene todo lo demás: sin cuenta no hay calificación que valga, y sin calificación la app es una guía telefónica. También es lo que permite que la foto que ves sea de quien va a golpear la puerta.

Abajo del registro va la letra chica en una línea: el nombre y la calificación son visibles para la otra parte, el teléfono y la dirección no.

### Elección de rol

Después del registro, la app pregunta de qué lado del mostrador está la persona: **necesito contratar** o **tengo un oficio**. Se cambia en cualquier momento desde el perfil, porque en la costa mucha gente es las dos cosas.

### Flujo del cliente

1. **Pedido** — Rubro (15 opciones), localidad (las 14) y urgencia, más una descripción opcional.
2. **Mazo de profesionales** — Tarjetas con **foto**, nombre, rubro, localidad, especialidades, puntaje, cantidad de trabajos, tiempo de respuesta y precio de arranque. Se arrastra a derecha o izquierda, o se usan los botones. El del medio abre la ficha completa con reseñas y estado de verificación.
3. **Match** — Celebración con las dos fotos enfrentadas, la del profesional y la del usuario, y el comercio auspiciante de la localidad.
4. **Chat** — Conversación abierta.
5. **Calificación** — Cuatro criterios con estrellas.

### Flujo del profesional

Este es el cambio grande respecto de la primera versión: **el profesional no ve un catálogo, ve pedidos.**

1. **Rubro y zona** — Elige su oficio y dónde trabaja.
2. **Mazo de clientes** — Tarjetas con la **foto del cliente**, su localidad, desde cuándo está en la plataforma, **su calificación**, cuántas veces contrató, qué necesita, el presupuesto que maneja y la urgencia. Si el cliente no vive en la costa, la tarjeta lo marca: es información que a un profesional le cambia la decisión.
3. **Match, chat y calificación** — Igual que del otro lado.

Las urgencias se marcan en coral, así que un pedido de hoy salta a la vista sin leer.

### Perfil, para los dos lados

Foto con lápiz de edición (abre una grilla de opciones; en la versión final se sube desde cámara o galería), nombre, correo, método de ingreso, localidad, puntaje, cantidad de trabajos y botón de cerrar sesión.

Mientras no haya calificaciones, el puntaje muestra un guion y una tarjeta explica **por qué te van a calificar a vos**, con los cuatro criterios listados. Al cliente le dice que un buen puntaje hace que lo acepten más rápido en temporada. Eso convierte la calificación de amenaza en incentivo.

Cuando se envía una calificación, el usuario recibe la suya y el promedio se recalcula. Es la forma más clara de mostrar que el sistema corre para los dos lados.

### La calificación de doble vía

| El cliente califica al profesional | El profesional califica al cliente |
|---|---|
| Calidad del trabajo | Pagó en fecha |
| Cumplió el plazo | Fue claro con el pedido |
| Respetó el precio | Dio acceso a la obra |
| Dejó limpio | Trato |

Los diez clientes de demostración vienen con reseñas escritas por profesionales. Valen la pena leerlas porque muestran el tono: no son elogios genéricos, son cosas que a un oficio le importan de verdad.

### El orden del mazo

Esta es la decisión más importante del producto y la tomé así:

1. **Localidad exacta primero.** Quien trabaja en tu pueblo aparece antes que nadie.
2. **Después el plan.** Pro antes que Verificado, Verificado antes que Gratis.
3. **Después el puntaje.**

El orden define si la plataforma es honesta. Si el plan pago se pusiera arriba de la localidad, un contratista de San Clemente le taparía al albañil que vive a tres cuadras. El plan pago da ventaja **dentro** de tu zona, no sobre la geografía. Es lo que hace que el freemium sea vendible sin quemar la confianza.

Está en `public/js/app.js`, función `candidatos()`, y replicado en el servidor.

## 4. La verificación automática

Cinco capas, ninguna con intervención humana. Cada una suma un peso distinto y el total define el porcentaje del perfil.

| Capa | Método | Peso |
|---|---|---|
| Teléfono | Código por SMS | 1 |
| Correo | Enlace de confirmación | 1 |
| CUIT activo | Consulta al padrón de AFIP | 2 |
| Identidad | DNI + selfie con prueba de vida | 3 |
| Zona de trabajo | Ubicación confirmada en la costa | 1 |

El sello de verificado en la tarjeta aparece cuando la capa de identidad está aprobada. Es la única que realmente prueba que la persona es quien dice.

**Para producción**, cada capa necesita su proveedor. El punto de conexión ya está: `POST /api/verificar` en `server.js`. Hoy devuelve verdadero después de una espera simulada; ahí adentro va la llamada real a cada servicio.

---

## 5. El modelo de sponsors

Implementé la **opción 1 que te propuse** — exclusividad por rubro y localidad — combinada con la **opción 3** — beneficio canjeable. Las dos aparecen en cinco lugares distintos de la app:

1. **Franja arriba del mazo** — Mientras la persona busca, ve el comercio de su localidad.
2. **Dentro de la celebración del match** — El momento de mayor intención de compra: la obra se va a hacer, hay que comprar materiales.
3. **Franja dentro del chat** — Permanente mientras dure la conversación.
4. **Sección Beneficios completa** — Con código canjeable de formato `PLM-FARO-48`.
5. **Sección de la landing** — El pitch comercial hacia el comercio.

El beneficio canjeable resuelve el problema más grave del modelo, que es que la gente se conozca y se vaya a WhatsApp. El descuento solo vive dentro de la app y solo lo tienen los profesionales con plan activo y buen puntaje. Así la app deja de ser un intermediario evitable y pasa a ser un beneficio que conviene mantener.

Los cinco comercios que ves son ficticios, con nombres y zonas plausibles, para que puedas mostrar cómo se ve. Están en `public/js/data.js`, constante `SPONSORS`, y se cambian editando ese bloque.

---

## 6. Los planes

| Plan | Precio | Para quién |
|---|---|---|
| **Gratis** | Sin costo | 10 contactos mensuales, perfil básico, calificaciones visibles |
| **Verificado** | $9.900/mes | Contactos sin límite, sello, galería, respuesta a reseñas, beneficios |
| **Pro** | $24.900/mes | Todo lo anterior, primer lugar en la localidad, hasta 3 localidades, presupuestos, estadísticas |

**Decisión que tomé a criterio:** durante el lanzamiento **todos los planes van sin cargo** y así lo dice la app, tanto en la landing como adentro. Los precios están cargados y visibles para que se entienda hacia dónde va, pero el botón dice "Activar sin cargo".

El motivo es el que hablamos: cobrarle al oferente antes de que exista demanda es la forma más rápida de matar este tipo de plataforma. Los oficios son el lado difícil del mercado. Primero se los consigue, después se monetiza.

---

## 7. La instalación

### En Android y escritorio

Aparece un botón **Instalar Contratá Ya** que dispara el diálogo nativo del sistema. La landing lo detecta sola.

### En iPhone

Como hablamos, en iOS no existe el botón automático. Lo resolví en dos lugares:

**En la landing**, un bloque que solo aparece si el visitante entra desde iPhone. Tres pasos, con el ícono real de Compartir dibujado en SVG al lado del texto, porque mucha gente no sabe que ese cuadradito se llama así:

> **¿Tenés iPhone? Instalala en 3 pasos**
> 1. Abrí esta página en **Safari**
> 2. Tocá el ícono **Compartir** (con el ícono dibujado)
> 3. Elegí **Agregar a inicio**
>
> Listo. Queda como una app más en tu pantalla y te avisa cuando tenés un match nuevo.

Arriba del instructivo va el motivo, no el trámite: *"Instalada te avisa cuando entra un trabajo cerca tuyo. Sin instalar, te enterás cuando abrís el navegador."*

**Dentro de la app**, una cinta angosta arriba del formulario y del perfil con el mismo recordatorio en una línea. Se cierra con una cruz y no vuelve a aparecer en esa sesión.

### El caso de Instagram y Facebook

Este era el que más iba a fallar. Si alguien llega desde un link en Instagram, está en el navegador interno de esa app y "Agregar a inicio" no existe. La app lo detecta y muestra un mensaje distinto:

> *Estás viendo esto dentro de otra app. Para poder instalarla, abrí Contratá Ya en Safari.*

Con un botón **Copiar la dirección** que deja el link en el portapapeles.

Está en `public/js/instalar.js`.

---

## 8. Notas técnicas

### Qué usa

Node con Express del lado del servidor. Del lado del navegador, JavaScript sin frameworks ni compilación: no hay build step, no hay `node_modules` que se rompa, y se puede editar cualquier archivo y ver el cambio recargando. Para una demo que hay que mostrar y modificar rápido, eso vale más que cualquier framework.

### El service worker

Guarda todo en caché para que la app abra rápido y funcione con mala señal, que en la costa pasa. Tiene una pantalla propia para cuando no hay conexión.

**Al desplegar una versión nueva hay que subir el número de versión** en `public/sw.js`:

```js
const VERSION = 'contrataya-v2';
```

Si no se cambia, los navegadores siguen mostrando la copia vieja. Es el error más común con este tipo de app.

### Las notificaciones

El código de recepción ya está escrito en el service worker. Falta el servidor que las envía, que es un desarrollo aparte y necesita claves VAPID. En iPhone solo funcionan si la app está instalada en la pantalla de inicio, por eso la insistencia con el instructivo.

### Dos bugs que aparecieron probando

Los menciono porque valen para cualquier proyecto próximo:

**El atributo `hidden` no funcionaba.** La barra superior, las pestañas de abajo y las ventanas emergentes tenían `display: flex` o `display: grid` declarado en su clase, y eso pisa el `hidden` del HTML. Resultado: una capa invisible tapaba toda la pantalla y la app quedaba muerta al primer toque. Se arregla con una línea en `tokens.css`:

```css
[hidden] { display: none !important; }
```

**Las secciones perdían el margen del riel.** La regla que reservaba los 220 píxeles de la izquierda estaba escrita antes de la regla que definía el relleno de las secciones, así que la segunda la anulaba. El texto se montaba encima de los nombres de las localidades. Se arregló moviendo esa regla al final del archivo, donde gana por orden de cascada.

Los dos aparecieron recién al abrir la página en un navegador de verdad. Ninguno se ve leyendo el código.

### Accesibilidad

Foco visible en teclado, contraste alto, respeta la preferencia del sistema de reducir animaciones, áreas de toque de 44 píxeles o más, y textos alternativos en los íconos.

---

## 9. Cómo subirlo

### A GitHub

Como venís trabajando, arrastrando: entrar al repositorio nuevo, **Add file → Upload files**, arrastrar todo el contenido de la carpeta **menos** `node_modules`.

`.gitignore` ya excluye `node_modules` y cualquier `.env`.

### A Render

1. **New → Web Service**, conectar el repositorio.
2. Runtime **Node**, Build `npm install`, Start `npm start`.
3. Variable de entorno: `NODE_ENV` = `production`.
4. Crear.

Render da HTTPS solo, que es requisito para que la app se pueda instalar.

**Para probar la instalación en iPhone:** abrir la dirección `.onrender.com` en Safari, tocar Compartir y Agregar a inicio. Si aparece con el ícono ámbar y abre sin barra de navegador, funciona.

---

## 10. Lo que decidí por vos

Cosas que no habíamos definido y resolví para que la demo esté completa. Todas se cambian fácil:

| Decisión | Qué elegí | Dónde se cambia |
|---|---|---|
| Isotipo | Una ola con espuma | `img/isotipo.svg`, `logo.svg` |
| Retratos | 25 ilustraciones generadas | `img/gente/`, campo `foto` en `data.js` |
| Registro | Google simulado + correo con código | `app.js` → `verRegistro()` |
| Precios | $9.900 y $24.900 | `data.js` → `PLANES` |
| Lanzamiento | Todos los planes sin cargo | `data.js` + textos |
| Orden del mazo | Localidad › plan › puntaje | `app.js` → `candidatos()` |
| Rubros | 15, incluyendo obra completa | `data.js` → `RUBROS` |
| Criterios de calificación | 4 por lado | `data.js` → `CRITERIOS` |
| Clientes de demo | 10 con foto, puntaje y pedido | `data.js` → `CLIENTES` |
| Comercios | 5 ficticios con zonas | `data.js` → `SPONSORS` |
| Datos de la cuenta creada | Nombre y correo de ejemplo | `app.js` → `registroGoogle()` |

Dos aclaraciones sobre lo que el registro **no** hace todavía. No hay contraseña ni recuperación, porque en la versión real Google resuelve la mayoría de los casos y el correo va con enlace mágico. Y la sesión vive solo mientras la pestaña esté abierta: al cerrarla se pierde. Las dos cosas se resuelven con la base de datos.

## 11. Lo que falta para que sea real

Ordenado por lo que bloquea a lo que no:

**Bloquea el lanzamiento**

1. Base de datos. Hoy todo vive en el navegador y se borra al cerrar. Va PostgreSQL, que Render ofrece gratis.
2. Cuentas y sesión. Registro, ingreso, recuperación de contraseña.
3. Los cinco proveedores de verificación, con sus costos por consulta.
4. Chat de verdad, con mensajes que persistan y aviso cuando llega uno.

**Bloquea la monetización**

5. Cobro de planes. Mercado Pago con suscripción, que ya conocés de vd4.
6. Panel de administración: alta de comercios, moderación de reseñas, métricas.
7. Informe mensual para el comercio auspiciante. Es lo que se les prometió en el pitch y es lo que renueva el contrato.

**Mejora el producto**

8. Notificaciones push con su servidor y claves.
9. Fotos de perfil y galería de trabajos.
10. Presupuestos desde la app, que es lo que justifica el plan Pro.

---

## 12. Los tres riesgos

**Huevo y gallina.** Sin oficios no hay clientes y sin clientes no hay oficios. Por eso los planes van gratis al principio y por eso hay que cargar a mano los primeros 50 o 60 perfiles antes de mostrarle la app a un solo cliente. Un mazo vacío es una app muerta.

**Fuga a WhatsApp.** Se conocen y se van. Las defensas que quedaron puestas son la reputación acumulada, que solo vale adentro, y el beneficio en comercios, que solo se canjea adentro. Ninguna es infalible. La única defensa real de largo plazo es que la app le siga sirviendo al profesional después del primer trabajo.

**Fricción del registro.** Pedir cuenta antes de mostrar nada cuesta usuarios: siempre hay gente que se va en esa pantalla. Lo asumí a propósito porque sin cuenta no hay calificación creíble, pero conviene medirlo desde el primer día. Si la caída es grande, la salida es dejar mirar el mazo sin cuenta y pedirla recién al deslizar a la derecha.

**Estacionalidad.** De diciembre a marzo hay demanda; en agosto no. Del lado bueno, hay una demanda invisible todo el año que casi nadie atiende bien: el propietario ausente que necesita alguien de confianza sin poder estar ahí. Varios perfiles de la demo lo mencionan a propósito. Ese segmento es más chico pero es de todo el año y paga mejor.

---

*Demostración funcional. Personas, comercios, cifras y reseñas son ficticios.*
