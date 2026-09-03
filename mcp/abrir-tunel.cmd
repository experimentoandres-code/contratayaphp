@echo off
echo Deja esta ventana ABIERTA.
echo Busca la linea que dice trycloudflare.com
echo IGNORA la que dice developers.cloudflare.com
echo.
"C:\Users\Andres\contrataya1-main\mcp\cloudflared.exe" tunnel --url http://127.0.0.1:3847
pause
