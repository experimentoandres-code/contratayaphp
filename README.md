# CONTRATÁ YA

Plataforma web e instalable (PWA) que conecta oficios de la construcción con vecinos y propietarios del **Partido de la Costa**, provincia de Buenos Aires.

Registro obligatorio con Google o correo, perfiles con foto de los dos lados, calificación de doble vía, mecánica de deslizamiento, verificación automática en cinco capas y comercios auspiciantes con exclusividad por rubro y localidad.

---

## Arrancar en local

```bash
npm install
npm start
```

Queda en `http://localhost:3000`.

## Desplegar en Render

1. Subir este repositorio a GitHub.
2. En Render: **New → Web Service** y conectar el repositorio.
3. Configuración:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Variable de entorno:** `NODE_ENV = production`

El archivo `render.yaml` ya trae esta configuración. Render asigna el puerto por la variable `PORT`, que `server.js` toma automáticamente.

> **Importante:** la instalación como app y las notificaciones exigen HTTPS. Render lo provee por defecto en el dominio `.onrender.com`.

---

## Estructura

```
contrata-ya/
├── server.js                    Servidor Express + API de demostración
├── package.json
├── render.yaml                  Configuración de despliegue
├── .gitignore
├── GUIA.md                      Guía explicativa completa
└── public/
    ├── index.html               Landing pública
    ├── app.html                 Aplicación
    ├── manifest.webmanifest     Manifiesto de la PWA
    ├── sw.js                    Service worker
    ├── offline.html             Pantalla sin conexión
    ├── css/
    │   ├── tokens.css           Sistema de diseño
    │   ├── landing.css
    │   └── app.css
    ├── js/
    │   ├── data.js              Profesionales, clientes, comercios, planes
    │   ├── instalar.js          Detección de plataforma e instalación
    │   ├── landing.js
    │   └── app.js               Registro, mazos, matches, calificación
    └── img/
        ├── isotipo.svg          La ola
        ├── logo.svg             Marca completa
        ├── icon-*.png           Íconos de instalación
        └── gente/               25 retratos (p = profesionales, c = clientes)
```

## API de demostración

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/api/salud` | Estado del servicio |
| GET | `/api/localidades` | Las 14 localidades |
| GET | `/api/rubros` | Rubros disponibles |
| GET | `/api/planes` | Planes para profesionales |
| GET | `/api/profesionales?rubro=&localidad=` | Perfiles ordenados |
| GET | `/api/sponsors?localidad=` | Comercios de esa zona |
| POST | `/api/verificar` | Simula una capa de verificación |

## Al desplegar una versión nueva

Subir el número de versión en `public/sw.js`:

```js
const VERSION = 'contrataya-v2';
```

Si no se cambia, los navegadores siguen sirviendo la copia guardada en caché.

---

Datos de demostración. Personas, comercios y cifras son ficticios.
