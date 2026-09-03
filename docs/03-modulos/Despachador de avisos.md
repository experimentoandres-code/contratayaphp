# Despachador de avisos

`enviar-avisos.js`. Corre **dentro del proceso Node**, no en el browser.

## Para qué

La tabla `avisos` es una cola. Si el usuario no vio el aviso en la app (`leido_en` nulo), se le manda:

1. **Push inmediato** (si hay VAPID y suscripción)
2. **Correo a los 2 minutos** (Resend), como respaldo lento

El delay del correo evita spamear a quien ya tiene la app abierta.

## Arranque

`arrancarDespachador()` en el `listen` de Express:

- Sin `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE` → se apaga (es el warning que ves en local)
- Sin `RESEND_API_KEY` → push puede vivir, correo no
- Sin VAPID → correo puede vivir, push no
- Si hay URL + service role → `setInterval(despachar, 60000)`

También se puede disparar a mano / desde webhook:

```
POST /api/avisos/despachar
Header: x-aviso-clave: $AVISO_CLAVE
```

## Service role

La clave de servicio **salta RLS**. Por eso el archivo se pone pesado en el comentario de cabecera: nunca en `public/`, nunca en el repo, solo env de Render.

Lee `auth.users` por Admin API para obtener el correo (`correoDe`). Cachea en memoria.

## Push

`web-push` + tabla `suscripciones_push`. 404/410 = el dispositivo ya no existe → se borra la fila. Otros errores incrementan `fallos` y se dejan de usar al llegar a 3.

## Plantilla de correo

HTML inline, fondo asfalto, botón ámbar “Abrir la app” hacia `APP_URL/app.html`.
