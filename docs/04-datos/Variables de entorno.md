# Variables de entorno

No hay `.env.example` en el repo. Lista completa según el código.

## Express / avisos (`server.js`, `enviar-avisos.js`)

| Variable | Obligatoria para | Default |
|---|---|---|
| `PORT` | listen | `3000` |
| `NODE_ENV` | Render | — |
| `SUPABASE_URL` | despachador | — (apagado) |
| `SUPABASE_SERVICE_ROLE` | despachador, salta RLS | — |
| `RESEND_API_KEY` | correo | — |
| `MAIL_FROM` | remitente | `Contratá Ya <onboarding@resend.dev>` |
| `APP_URL` | links del mail/push | `https://contrataya1.onrender.com` |
| `VAPID_PUBLICA` | web push | — |
| `VAPID_PRIVADA` | web push | — |
| `MAIL_CONTACTO` | `mailto:` VAPID | `hola@contrataya.com.ar` |
| `AVISO_CLAVE` | webhook `/api/avisos/despachar` | — (si no está, el header nunca matchea) |

En local **ninguna es necesaria** para ver landing + app + este vault. Vas a ver:

```
[avisos] apagado: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE
```

## Browser (`public/js/supabase.js`)

Hardcodeado, no env:

```
SUPABASE_URL = https://cehyemmwhcthijzuatmz.supabase.co
SUPABASE_KEY = sb_publishable_…
```

Es la clave anónima / publishable. No es la service role. Igual: rotarla implica editar el archivo y bumpear el SW.

## Qué no hay

- No hay `DATABASE_URL` de Postgres propio: el SQL está en Supabase.
- No hay keys de Mercado Pago, SMS, AFIP ni liveness.
- `render.yaml` solo setea `NODE_ENV=production`. El resto hay que cargarlo a mano en el dashboard de Render.
