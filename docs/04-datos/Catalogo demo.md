# Catálogo demo

`public/js/data.js`. Todo ficticio. Lo usa la landing, la API Express y como fallback visual.

## Localidades

14, **el orden es contrato**. Es el riel.

## Rubros (15)

albañilería, electricidad, plomería, gas matriculado, pintura, techos, carpintería, herrería, aire y calefacción, piletas, durlock, pisos y revestimientos, destapaciones, parquización, obra completa.

## Urgencias

`urgente` (hoy o mañana), `semana` (7 días), `planeado` (presupuestando).

## Capas de verificación

| id | Peso | Método declarado |
|---|---|---|
| telefono | 1 | SMS |
| email | 1 | Enlace |
| cuit | 2 | Padrón AFIP |
| identidad | 3 | DNI + selfie + liveness |
| zona | 1 | Ubicación en la costa |

El sello visible aparece cuando `identidad` está aprobada. Hoy la aprobación real es admin o simulación.

## Profesionales

15 perfiles (`p01`–`p15`) con plan, puntaje, bio, especialidades, reseñas, `desde` (precio de arranque). Mezcla de Pro / Verificado / Gratis y de localidades.

Ojo: varias `foto` apuntan a `.jpg` y en disco hay `.svg` y `.jpg` mezclados, más `p01 (1).jpg`.

## Clientes

10 perfiles (`c01`–`c10`) con pedido embebido, presupuesto en texto, `ausente` (propietario que no vive en la costa) y reseñas **escritas por profesionales**. El tono no es de red social: es el que le importa a un oficio.

## Sponsors demo (5)

| id | Comercio | Zonas | Beneficio |
|---|---|---|---|
| faro | Corralón El Faro | San Bernardo, Costa Azul, La Lucila | 12% cemento y hierro |
| medano | Ferretería Médano | Santa Teresita, Mar del Tuyú, Costa Chica | 10% herramienta eléctrica |
| tuyu | Sanitarios del Tuyú | San Clemente, Las Toninas | 15% griferías |
| atlantica | Pinturería Atlántica | Mar de Ajó, Nueva Atlantis, Punta Médanos | 18% látex exterior |
| esmeralda | Aberturas Esmeralda | Costa del Este, Aguas Verdes, Costa Esmeralda | Flete sin cargo |

En producción el inventario sale de `contratos_publicidad` / RPC `beneficios_de`, no de este array.

## Planes

Ver [[Modelo de negocio]]. Precios 0 / 9900 / 24900.
