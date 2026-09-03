# Decisiones

Las que la GUÍA §10 tomó para cerrar la demo, más las que el código tomó después sin escribirlas.

## De la GUÍA (siguen)

| Decisión | Elección | Dónde se cambia |
|---|---|---|
| Isotipo | Ola con espuma | `public/img/isotipo.svg`, `logo.svg` |
| Retratos | 25 ilustraciones | `public/img/gente/`, campo `foto` |
| Precios | $9.900 y $24.900 | `PLANES` en `data.js` |
| Lanzamiento | Planes sin cargo | textos + `data.js` |
| Orden del mazo | Localidad › plan › puntaje | `candidatos()` y `/api/profesionales` |
| Rubros | 15, con obra completa | `RUBROS` |
| Criterios | 4 por lado | `CRITERIOS` |
| Clientes demo | 10 con pedido y reseñas | `CLIENTES` |
| Comercios demo | 5 ficticios | `SPONSORS` |

## Del código (no estaban en la guía)

| Decisión | Elección |
|---|---|
| Backend | Supabase (Auth + Postgres + Storage + RPC), no un Postgres de Render |
| Auth real | Google OAuth + OTP, no la simulación |
| Admin | Página aparte con RPC `soy_admin`, no un rol en el front |
| Canje | Llave en la query, sin login del comerciante |
| Avisos | Cola SQL + proceso Node (Resend + VAPID), no un worker aparte |
| Sesión UI | `sessionStorage`, reconciliada contra `getSession()` |
| Interés de plan | Cola humana (`interes_plan`) en vez de Mercado Pago |
| Verificación productiva | Sello manual del admin + simulación; sin proveedores |
| Frontend | Sigue sin framework, a propósito |
| Docs | Vault markdown + visor en `/docs` (esta carpeta) |
| Invariantes de producto | `docs/06-operacion/Invariantes.md` — no desarmar (push, interstitial, cancelar, calificar, roles) |

## Registro: lo que todavía no hace

No hay contraseña ni recuperación clásica. Google cubre la mayoría; el correo va por enlace mágico. Coherente con Auth de Supabase.
