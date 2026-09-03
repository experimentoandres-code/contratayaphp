# Contratá Ya — reglas de proyecto

Antes de tocar app, panel o SQL, leé `docs/06-operacion/Invariantes.md`. Esas reglas ya se rompieron una vez (push, interstitial, cancelar trabajo, calificar, borrar cuenta). No las desarmar.

- Código vivo: `public/` (FTP a Hostinger). No desplegar el `app.js` de la raíz.
- Espejo obligatorio: todo cambio de la app (MCP `escribir_web` / `reemplazar_web` / `bump_cache` / `set_whatsapp` en Hostinger) se copia **byte a byte** en el repo local `C:\Users\Andres\contrataya1-main\public\`. Ruta MCP `js/app.js` → `public/js/app.js`. No copiar a los duplicados de la raíz. No dar por cerrado un cambio si el local no quedó igual.
- `VAPID_PUBLICA` en `public/js/app.js` tiene que ser la clave real, nunca el placeholder.
- Interstitial: 2 s por sesión (`INTER_DELAY_MS`), no una vez por día; rotación pagados → casa.
- Cancelar trabajo tiene que persistir `cancelado` (el trigger `trabajo_guardian` no lo pisa).
- Calificaciones: unique por trabajo, no por match.
- Teléfono no vive en `perfiles`; vive en `contacto`.
