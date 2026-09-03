# Visión técnica

Contratá Ya es una **PWA de una sola carpeta `public/`** servida por un Express mínimo. No hay bundler, TypeScript ni framework de UI.

```
navegador  ──estáticos──►  Express (server.js)
    │                          │
    ├── supabase-js ──────────► Supabase (Auth, Postgres, Storage, RPC)
    │
    └── POST /api/avisos ─────► enviar-avisos.js ──► Resend + Web Push
```

## Principios que el código respeta

1. **Sin build.** Se edita un JS/CSS y se recarga. Vale más que un framework para una demo que hay que mostrar y cambiar rápido. Sigue valiendo ahora que hay backend: el cliente habla HTTP directo a Supabase.
2. **El servidor no es el dominio.** Express sirve archivos, una API de catálogo demo y el despachador de avisos. El dominio (cuentas, matches, chat, admin, canje) está en Supabase.
3. **La sesión la tiene Supabase.** `sessionStorage['contrataya']` es un cache de UI. Si hay estado guardado y no hay `session`, se limpia. Comentario explícito en `arrancar()`.
4. **Service role nunca en el browser.** `SUPABASE_SERVICE_ROLE` solo en el proceso Node. El browser usa la clave publishable de `supabase.js`.
5. **Caché agresiva de estáticos, nunca de JS/CSS ni de `sw.js`.** Si no, los deploys no se ven.

## Runtime

- Node `>=18` (fetch nativo; el despachador no agrega axios).
- Dependencias npm: `express`, `web-push`. Nada más.
- Frontend CDN: `@supabase/supabase-js@2` y Google Fonts.

## Superficies HTTP

| Ruta | Superficie |
|---|---|
| `/` | Landing |
| `/app.html` | Producto |
| `/admin.html` | Panel (noindex) |
| `/canje.html?c=` | Mostrador (noindex) |
| `/privacidad.html`, `/terminos.html` | Legal |
| `/docs` | Este vault |
| `/api/*` | Salud, catálogo demo, verificar, avisos, docs |

Detalle: [[Servidor Express]], [[API HTTP]], [[PWA e instalacion]].
