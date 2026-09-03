# Modelo de negocio

Dos palancas: **planes del profesional** y **publicidad local**. Cero comisión por trabajo.

## Planes

Definidos en `data.js` → `PLANES`. Durante el lanzamiento la UI dice “Activar sin cargo”; los precios están a la vista para anclar el valor.

| Plan | Precio de lista | Para quién | Qué abre |
|---|---|---|---|
| Gratis | $0 | Entrar hoy | 10 contactos/mes, perfil básico, calificaciones, tel/mail |
| Verificado | $9.900/mes | Quien ya vive de esto | Contactos ilimitados, sello, identidad+CUIT, galería, respuesta a reseñas, beneficios |
| Pro | $24.900/mes | Equipos y contratistas | Todo lo anterior + primer lugar en la localidad, hasta 3 zonas, presupuestos, stats, perfil de empresa |

Cobro real (Mercado Pago) **no está**. Lo que hay es interés: RPC `me_interesa_plan` y cola `interes_plan` que el admin cierra con `activar_plan`. Ver [[Panel admin]] y [[Pendientes]].

## Sponsors

Opción 1 + opción 3 de la GUÍA: **exclusividad por rubro y localidad** más **beneficio canjeable**.

Cinco puntos de aparición:

1. Franja arriba del mazo
2. Celebración del match
3. Franja en el chat
4. Sección Beneficios (código tipo `PLM-FARO-48` / código real vía RPC)
5. Pitch en la landing

El descuento solo vive adentro. Es la defensa contra la fuga a WhatsApp: la reputación y el canje no se llevan al chat privado.

Inventario comercial del admin: 14 localidades × rubros de anuncio. Contratos en `contratos_publicidad`. Anunciantes “sueltos” se asignan a un casillero.

## Canje en el mostrador

El comercio no se crea un usuario. Recibe una URL con llave (`/canje.html?c=…`). Busca el código del profesional, registra la visita (no la compra) y ve sus números. Ver [[Canje comercial]].

## Por qué gratis al principio

Cobrarle al oferente antes de que exista demanda mata este tipo de plaza. Los oficios son el lado difícil. Primero se los consigue (50–60 perfiles cargados a mano), después se monetiza.
