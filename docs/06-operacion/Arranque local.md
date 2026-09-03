# Arranque local

## Requisitos

- Node 18+ (en esta máquina: 24.19.0)
- npm. En PowerShell la política de scripts bloquea `npm.ps1`: usá `npm.cmd`

No hace falta Git, Python, Docker ni variables de entorno para la demo.

## Pasos

```powershell
cd C:\Users\Andres\contrataya1-main
npm.cmd install
npm.cmd start
```

Queda en:

| URL | Qué es |
|---|---|
| http://localhost:3000 | Landing |
| http://localhost:3000/app.html | App |
| http://localhost:3000/admin.html | Panel (pide Google + ser admin) |
| http://localhost:3000/canje.html | Canje (pide `?c=`) |
| http://localhost:3000/docs | Este vault |
| http://localhost:3000/api/salud | Healthcheck |

## Qué vas a ver en la consola

```
Contratá Ya escuchando en el puerto 3000
[avisos] apagado: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE
```

Es normal. La app igual habla con Supabase **desde el browser** con la clave publishable.

## Auth en local

Google OAuth y el mail de OTP dependen de la config del proyecto Supabase (redirect URLs). Si el redirect no incluye `http://localhost:3000/app.html`, el login no vuelve. Eso no se configura en este repo.

## PowerShell

```
npm : no se puede cargar npm.ps1 porque la ejecución de scripts está deshabilitada
```

Solución puntual: `npm.cmd`. Solución de máquina: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
