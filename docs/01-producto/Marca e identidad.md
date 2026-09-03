# Marca e identidad

Fuente principal: `GUIA.md` secciones 1 y 2. Archivos: `public/img/isotipo.svg`, `logo.svg`, PNG de instalación.

## Nombre

**CONTRATÁ YA.** Imperativo rioplatense. En la marca escrita, CONTRATÁ va en blanco roto y YA entra en una pastilla ámbar.

## Isotipo

Una ola maciza ámbar, rizo en negativo, espuma más tenue. Identifica el Partido de la Costa sin texto. Se sostiene a 22 px en una pestaña y a 512 en el ícono de inicio.

Se descartó fusionarla con un casco de obra: la cúpula y el rizo peleaban la misma forma y se leía como galera. El isotipo dice **la costa**, el nombre dice **contratá ya**, el oficio lo pone el producto.

## Paleta

| Nombre | Hex | Uso |
|---|---|---|
| Asfalto mojado | `#0B1620` | Fondo |
| Superficie | `#12222E` | Tarjetas |
| Cal | `#EDE7DA` | Texto |
| Ámbar de señalización | `#F0A63A` | Acento, ola, YA |
| Verde marea | `#2FB2A6` | Verificado, aceptar |
| Coral | `#E4574C` | Descartar, urgencias |

Ámbar = señalización de obra. Verde = Atlántico. La mezcla es específica de este producto.

Tokens en `public/css/tokens.css`. Ver [[Sistema visual]].

## Tipografías

| Familia | Rol |
|---|---|
| **Archivo** expandida | Títulos. Cartelería industrial |
| **Inter Tight** | Lectura en pantalla chica |
| **IBM Plex Mono** | Datos: puntajes, precios, localidades. “Ficha de obra” |

Sin la mono, la app se parece a cualquier marketplace.

## Retratos

25 ilustraciones generadas, no stock: `p01`–`p15` profesionales, `c01`–`c10` clientes, en `public/img/gente/`. Varían tono de piel, peinado, barba, ropa de trabajo. Se reemplazan cambiando el campo `foto` en `data.js`.

El código ya admite foto real subida a Storage (`fotos`). El profesional sin foto real queda marcado (`necesitoFoto()`).

## El riel de la costa

En la landing, línea vertical izquierda con las 14 localidades en orden real. Una gota ámbar baja con el scroll e ilumina el pueblo correspondiente. En viewports &lt; 1240 px desaparece.

No es ornamento: el partido **es** una línea de 14 pueblos sobre la misma ruta. Cuando alguien de San Bernardo ve iluminado su nombre a mitad de scroll, entiende que la app es de acá.
