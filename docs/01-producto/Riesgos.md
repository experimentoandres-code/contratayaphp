# Riesgos

Tomados de la GUÍA, sección 12, y cruzados con el estado actual del código.

## Huevo y gallina

Sin oficios no hay clientes; sin clientes no hay oficios. Un mazo vacío es una app muerta. Mitigación: planes sin cargo al lanzar y carga manual de los primeros 50–60 perfiles **antes** de mostrarle la app a un cliente.

El código ya puede mostrar profesionales reales (`cargarProfesionalesCli`) y, si la base está vacía, el mazo de demo en `data.js` sigue existiendo como red de seguridad visual — pero no hay que confundir demo con plaza.

## Fuga a WhatsApp

Se conocen y se van. Defensas puestas:

- Reputación que solo vale adentro
- Beneficio de comercio que solo se canjea adentro (`canje.html`)
- Chat persistido (hace menos necesario saltar en el primer mensaje)

Ninguna es infalible. La defensa de largo plazo es que la app le sirva al profesional **después** del primer trabajo (presupuestos Pro, stats, galería). Esos ítems todavía están incompletos. Ver [[Pendientes]].

## Fricción del registro

Pedir cuenta antes de mostrar el mazo cuesta usuarios. Fue a propósito: sin cuenta no hay calificación creíble. Hay que medirlo. Si la caída es grande, la salida que la GUÍA deja escrita es: mirar el mazo sin cuenta y pedirla al deslizar a la derecha. **Hoy no está implementado.**

## Estacionalidad

Demanda fuerte diciembre–marzo; agosto flojo. Segmento que la demo empuja a propósito: el **propietario ausente** (campo `ausente` en clientes de demo). Es más chico, paga mejor y existe todo el año.

## Verificación que todavía es teatro

Las cinco capas están modeladas y `POST /api/verificar` espera 800 ms y dice que sí. En la app, `simularVerificacion` también es UI. El admin puede marcar verificación a mano (`marcar_verificacion`). No hay SMS, AFIP ni prueba de vida reales. Lanzar con sello “verificado” sin esas capas es un riesgo reputacional.

## Documentación desfasada

README y GUÍA venden una demo sin backend. Un operador que las siga al pie puede creer que no hay que configurar Supabase. Ver [[Analisis de la documentacion]].
