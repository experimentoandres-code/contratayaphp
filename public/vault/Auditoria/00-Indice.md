# Auditoría del estado actual

Fecha: **28 de agosto de 2026**.
Producto: **Contratá Ya** (`contrataya.pro` + repo `contrataya1-main`).
Alcance: código vivo, panel, sitio en Hostinger y documentación. No se inspeccionó el SQL interno de Supabase ni el volumen real de usuarios.

## Cómo leer esto

Empezá por el dictamen. El resto son las pruebas.

| Nota | Qué responde |
|---|---|
| [[01-Dictamen]] | ¿Qué es hoy la app? ¿Está lista? |
| [[02-Superficies]] | Qué hay en cada pantalla (landing, app, panel, canje, legal) |
| [[03-Invariantes]] | Las reglas ya cerradas: ¿siguen en pie? |
| [[04-Inventario]] | Archivos, versiones, tablas, RPCs, stack |
| [[05-Hallazgos]] | Deuda, riesgos y desfasajes, ordenados |
| [[06-Lanzamiento]] | Qué falta para un lanzamiento honesto y para cobrar |

Esta carpeta es el resultado de la auditoría. No cambia el producto. No toca las invariantes.

## Método

1. Lectura de `public/` (lo que Hostinger sirve) y contraste con la raíz del repo (duplicados viejos).
2. Lectura de `docs/` (vault técnico) y de `README.md` / `GUIA.md`.
3. Checklist de `docs/06-operacion/Invariantes.md` y `AGENTS.md`.
4. Contraste con el sitio vivo: listado de archivos, `sw.js` (`contrataya-v60`), interstitial a 2 s, clave VAPID real.
5. Inventario de `sb.rpc(...)` y `from(...)` en el cliente.

## Qué no se auditó

- El esquema SQL de Supabase (no está versionado en el repo).
- Las políticas RLS, fila por fila.
- Cantidad real de perfiles, pedidos, matches o anunciantes.
- El secreto `VAPID_PRIVADA` ni si la Edge Function `despachar-avisos` está disparando ahora.
- Un pase de usuario real en el celular (instalación, push, canje en mostrador).

Esas ausencias están marcadas en [[05-Hallazgos]] y [[06-Lanzamiento]].
