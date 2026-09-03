# Canje comercial

`public/canje.html` + `css/canje.css` + `js/canje.js`.

## Idea

El que atiende el mostrador **no se crea cuenta**. Recibe una URL con llave:

```
/canje.html?c=LLAVE
```

Sin `c`, el portón dice que la dirección está incompleta. Si la llave no existe o se dio de baja, el acceso se rechaza.

## Qué hace

1. `panel_anunciante({ p_llave })` — nombre del comercio, beneficio, zonas, números, visitas
2. Busca código del profesional (`buscar_codigo`) — no importan guiones ni mayúsculas
3. Confirma (`registrar_canje`) — registra **la visita, no la compra**
4. Lista “quiénes vinieron”

Pie de página: *No vemos qué vendiste ni a qué precio.*

## Por qué importa

Es la pieza que la GUÍA pedía para que el sponsor renueve: el comercio ve gente real cruzando la puerta gracias a la app. También es la defensa concreta contra “nos pasamos el WhatsApp y listo”: el descuento se valida acá.

La llave la emite el admin al crear / asignar el anunciante. Ver [[Panel admin]] y [[Modelo de negocio]].
