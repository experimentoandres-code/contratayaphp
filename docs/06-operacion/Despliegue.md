# Despliegue

## GitHub

El README propone arrastrar archivos (Add file → Upload) **sin** `node_modules`. `.gitignore` debería excluir `node_modules` y `.env`. El zip local puede no traer `.gitignore` visible; no lo asumas.

## Render

`render.yaml`:

```yaml
type: web
runtime: node
plan: free
buildCommand: npm install
startCommand: npm start
NODE_ENV=production
```

Render inyecta `PORT`. `server.js` lo respeta.

HTTPS viene de fábrica en `*.onrender.com`. Es requisito de PWA y push.

## Variables que hay que cargar a mano

Las de [[Variables de entorno]]. Como mínimo, si querés avisos en producción:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE`
- `RESEND_API_KEY`
- `AVISO_CLAVE`
- `APP_URL` (el dominio real, no el default)
- `VAPID_PUBLICA` / `VAPID_PRIVADA` si hay push

## Checklist post-deploy

1. Subir `VERSION` en `public/sw.js` **antes** de pushear
2. Abrir `/api/salud`
3. Abrir `/` y `/app.html` en incógnito (sin SW viejo)
4. En iPhone: Safari → Compartir → Agregar a inicio. Tiene que abrir sin barra
5. Probar Google OAuth (redirect URL del dominio nuevo en el dashboard de Supabase)
6. Si hay admin, entrar a `/admin.html`

## Lo que Render no hace

No migra el SQL. El esquema vive en el proyecto Supabase y se opera allá.
