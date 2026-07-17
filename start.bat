@echo off
setlocal

echo Starting Nexus App...
echo.

set BASE=%~dp0

start /min "Nexus-Server" cmd /c "cd /d %BASE%nexus\server && node index.js >nul 2>&1"
start /min "Nexus-Client" cmd /c "cd /d %BASE%nexus\client && npm run dev >nul 2>&1"

echo Nexus started in background!
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo Press any key to close...
pause >nul
