# Pendientes

Relectura de la GUÍA §11 a la luz del código actual.

Corte más reciente: [[00-Indice]] (auditoría del 28 ago 2026). Esta nota no se reescribe: es la lista de huecos, no el dictamen.

## Ya no bloquea (hecho)

- Base de datos (Supabase Postgres)
- Cuentas y sesión (Auth Google + OTP)
- Chat persistido
- Panel de administración (v1)
- Canje / visita del comercio
- Infra de push y correo (falta configurar env y proveedores)

## Sigue bloqueando un lanzamiento honesto

1. **Proveedores de verificación.** SMS, AFIP, DNI+liveness. Hoy el sello lo pone el admin o una simulación.
2. **Redirects y branding de Auth** en el proyecto Supabase (localhost + dominio prod).
3. **Carga inicial de 50–60 oficios reales** antes de abrir a clientes. El mazo de `data.js` no cuenta.
4. **SQL versionado.** El esquema no está en el repo: un `schema.sql` o migraciones.
5. **RLS documentado y testeado.** Se asume que existe.
6. **Definir quién es admin** (`soy_admin`) por escrito.

## Sigue bloqueando la monetización

1. Cobro de planes (Mercado Pago / suscripción). Hoy hay cola de interés + botón del admin.
2. Informe mensual automático para el comercio (el canje registra visitas; no hay PDF/mail mensual).
3. Presupuestos y firma desde la app (promesa del plan Pro).
4. Estadísticas de vistas/contactos (promesa Pro).

## WhatsApp de Contratá Ya

Mismo número `5492246552086` (`WHATSAPP_CONTRATA`):

- Landing → **Quiero la zona de mi comercio**
- Perfil (pro y cliente) → **Verificar por WhatsApp**

## Mejora de producto

- Galería de trabajos (no solo avatar)
- Medir abandono en la pantalla de registro
- Mazo visible sin cuenta, cuenta al swipe (plan B de la GUÍA)
- Limpiar duplicados de la raíz y `app.js.js`
- Unificar fotos `.svg` / `.jpg` del catálogo
- `.env.example`
- Bumpear SW en cada release como checklist, no como folklore

## Documentación

Este vault cubre el hueco. Falta decidir si `README.md` se reescribe para no mentir sobre “todo vive en el navegador”. Recomendación: README corto de arranque + link a `/docs`.
