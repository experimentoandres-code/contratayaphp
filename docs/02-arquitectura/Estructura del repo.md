# Estructura del repo

Árbol real (el del README está corto). Se omiten `node_modules` e imágenes individuales.

```
contrataya1-main/
├── server.js                 Express: estáticos + API demo + avisos + docs
├── enviar-avisos.js          Cola de correo y push
├── package.json              express, web-push, start = node server.js
├── package-lock.json
├── render.yaml               Web service Node, npm install, npm start
├── README.md                 Arranque y API demo (parcial)
├── GUIA.md                   Relato de producto
├── app.html / app.js / app.css          duplicados en raíz (legado)
├── index.html, sw.js, manifest…         duplicados en raíz (legado)
├── css/, js/, img/                      duplicados en raíz (legado)
├── docs/                     este vault
│   ├── index.html            visor tipo Obsidian
│   └── …notas.md
└── public/                   lo que Express sirve de verdad
    ├── index.html            landing
    ├── app.html
    ├── admin.html
    ├── canje.html
    ├── offline.html
    ├── privacidad.html
    ├── terminos.html
    ├── legal.css
    ├── manifest.webmanifest
    ├── sw.js
    ├── css/  tokens, landing, app, admin, canje
    ├── js/   data, instalar, landing, app, supabase, admin, canje
    └── img/  isotipo, logo, iconos PWA, gente/
```

## Duplicados raíz vs `public/`

En la raíz hay `app.html`, `app.js`, `app.css`, `index.html`, `sw.js`, `css/`, `js/`, `img/`. **Express no los sirve**: `express.static` apunta a `public/`. Son copias o residuales del zip. El que manda es `public/`.

Además, `public/js/app.js.js` parece un residual de `app.js`. El HTML carga `/js/app.js`.

## Punto de entrada

`package.json` → `"main": "server.js"`, `"start": "node server.js"`. Puerto `process.env.PORT || 3000`.
