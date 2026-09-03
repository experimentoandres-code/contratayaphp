# Cómo usar este vault

El visor está en `docs/index.html` y se sirve en `/docs`.

## Lectura

- Árbol a la izquierda: carpetas y notas.
- Clic en una nota para abrirla.
- Los enlaces `[[así]]` saltan a otra nota.
- **Ctrl+K** abre el buscador / paleta.
- **G** abre el grafo de enlaces entre notas.

## Edición

Tres modos en la barra superior:

| Modo | Qué hace |
|---|---|
| Lectura | Solo el markdown renderizado |
| Edición | Solo el texto fuente |
| Dividido | Fuente a la izquierda, preview a la derecha |

Atajos:

| Tecla | Acción |
|---|---|
| `Ctrl+S` | Guardar en disco |
| `Ctrl+E` | Alternar lectura / edición |
| `Ctrl+K` | Buscar nota |
| `Ctrl+N` | Nueva nota |
| `Esc` | Cerrar paneles |

El guardado escribe el `.md` real dentro de `docs/` a través de `PUT /api/docs/file`. Hay autoguardado a los 1,2 s si hay cambios. El punto ámbar en la barra significa “sin guardar”.

## Crear y borrar

- **Nueva nota:** pide carpeta + nombre. Crea un `.md` vacío con el título.
- **Nueva carpeta:** crea un directorio bajo `docs/`.
- **Borrar:** solo archivos `.md`. Pide confirmación. No borra carpetas.

Nombres válidos: letras, números, espacios, guiones. La API rechaza `..` y cualquier ruta fuera de `docs/`.

## Si el servidor no está

Podés abrir `docs/index.html` como archivo, pero **no vas a poder guardar**. El árbol y la lectura funcionan si el navegador deja cargar los `.md` relativos; Chrome suele bloquearlo en `file://`. Usá siempre:

```bash
cd C:\Users\Andres\contrataya1-main
npm.cmd start
```

y entrá a `http://localhost:3000/docs`.

## Relación con README y GUÍA

`README.md` y `GUIA.md` en la raíz **no se mueven**. Son la documentación original del repo. Este vault las analiza y las actualiza conceptualmente. Si hay contradicción, gana el código y este vault lo declara en [[Analisis de la documentacion]].
