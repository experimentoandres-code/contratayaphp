# Lanzamiento

Qué falta, separado en tres listas. No es un plan de implementación: es el corte al 28 de agosto de 2026.

## Ya no bloquea (hecho)

- Base Postgres (Supabase).
- Cuentas: Google + OTP de correo.
- Chat persistido, leídos, globo.
- Ciclo de trabajo (inicio/fin de los dos lados, cancelar, volver a pedir).
- Calificación de doble vía con freno si falta la nota.
- Baja de cuenta con resumen y traba si hay obra abierta.
- Panel de administración (v2: usuarios, actividad, creativos, documentos, matches).
- Canje en el mostrador.
- Interstitials y banners editables.
- Infra de push en el cliente (VAPID real) y cola `avisos`.
- PWA instalable, legal, tutorial.
- Presencia e “instalada” visibles para el admin.

## Para abrir la plaza sin mentir

Hacer estas cuatro, o no decir que la costa ya está llena.

1. **Cargar 50–60 oficios reales** en las 14 localidades, con foto de cara. El mazo de `data.js` no sale a producción como plaza.
2. **Decidir el sello de verificación.** O se conectan SMS / AFIP / liveness, o se habla claro: “lo marca Contratá Ya a mano / por WhatsApp”. No las dos cosas a la vez en la landing.
3. **Redirects de Auth** del dominio real y de localhost, escritos en el proyecto Supabase. Sin eso el login se cae en el celular nuevo.
4. **Versionar el SQL.** Un `schema.sql` o migraciones con triggers, uniques y un párrafo de “quién es admin”. Es el seguro contra el próximo desarme.

Opcional pero barato: medir abandono en el registro. Si se caen antes de ver un oficio, ahí sí tiene sentido el plan B (mazo sin cuenta, cuenta al swipe). Hoy no hay número.

## Para cobrar

| Palanca | Estado | Próximo paso real |
|---|---|---|
| Publicidad localidad × rubro | Producto armado | Llenar casilleros. El abono de referencia del panel es $80.000. |
| Canje en mostrador | Producto armado | Informe mensual al comercio (hoy no hay). |
| Plan Verificado / Pro | UI + cola de interés | Mercado Pago o seguir a mano con el admin. |
| Promesas Pro (presupuestos, stats, galería) | Vendidas, no hechas | No cobrar Pro prometiendo eso hasta que existan, o sacarlas de la ficha. |

Cero comisión por trabajo se mantiene. Es decisión de producto, no un pendiente.

## Higiene antes del próximo cambio grande

No son el lanzamiento, pero evitan el accidente de siempre:

1. No subir `app.js` de la raíz. El vivo es `public/js/app.js`.
2. Bumpear `VERSION` en `public/sw.js` en cada release (hoy `contrataya-v60`).
3. Borrar o aislar `public/js/app.js.js` y los duplicados de la raíz cuando se limpie el zip.
4. Tratar el Edge Function de avisos como el despachador de producción. El `enviar-avisos.js` de Node es local / Render.
5. Reescribir el README a un arranque corto + “el mapa está en `/docs` y en Documentos del panel”. Hoy miente con educación.

## Checklist rápido (operador)

Antes de mostrarle la app a un vecino:

- [ ] Hay oficios reales en su localidad, con foto.
- [ ] Login Google y correo vuelven a `https://contrataya.pro/app.html`.
- [ ] En el celular, “Agregar a inicio” abre sin barra del navegador.
- [ ] Un match de prueba: chat, abrir trabajo, cancelar queda `cancelado`, calificar no deja repetir.
- [ ] Interstitial aparece a los ~2 s, no “mañana”.
- [ ] Un comercio de prueba: casillero, banner, interstitial, canje con llave.
- [ ] El panel lista usuarios por `admin_listar_usuarios`.
- [ ] Nadie subió el JS de la raíz.

## Dónde está cada cosa

| Pregunta | Nota |
|---|---|
| ¿Qué es hoy? | [[01-Dictamen]] |
| ¿Qué ve cada uno? | [[02-Superficies]] |
| ¿Las reglas cerradas siguen? | [[03-Invariantes]] |
| ¿Qué hay en el repo y en el sitio? | [[04-Inventario]] |
| ¿Qué está flojo? | [[05-Hallazgos]] |
