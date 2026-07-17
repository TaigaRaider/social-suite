@echo off
setlocal

echo ==========================================
echo   Social Suite - Starting All Apps
echo ==========================================
echo.

set BASE=%~dp0

:: Start all servers and clients minimized in background
echo [1/5] Starting Nexus (port 3001 + 5173)...
start /min "Nexus-Server" cmd /c "cd /d %BASE%nexus\server && node index.js >nul 2>&1"
start /min "Nexus-Client" cmd /c "cd /d %BASE%nexus\client && npm run dev >nul 2>&1"

echo [2/5] Starting Lumina (port 3002 + 5174)...
start /min "Lumina-Server" cmd /c "cd /d %BASE%lumina\server && node index.js >nul 2>&1"
start /min "Lumina-Client" cmd /c "cd /d %BASE%lumina\client && npm run dev >nul 2>&1"

echo [3/5] Starting Pulse (port 3003 + 5175)...
start /min "Pulse-Server" cmd /c "cd /d %BASE%pulse\server && node index.js >nul 2>&1"
start /min "Pulse-Client" cmd /c "cd /d %BASE%pulse\client && npm run dev >nul 2>&1"

echo [4/5] Starting Wave (port 3004 + 5176)...
start /min "Wave-Server" cmd /c "cd /d %BASE%wave\server && node index.js >nul 2>&1"
start /min "Wave-Client" cmd /c "cd /d %BASE%wave\client && npm run dev >nul 2>&1"

echo [5/5] Starting Whisper (port 3005 + 5177)...
start /min "Whisper-Server" cmd /c "cd /d %BASE%whisper\server && node index.js >nul 2>&1"
start /min "Whisper-Client" cmd /c "cd /d %BASE%whisper\client && npm run dev >nul 2>&1"

echo.
echo ==========================================
echo   All apps launched in background!
echo ==========================================
echo.
echo   Nexus:    http://localhost:5173
echo   Lumina:   http://localhost:5174
echo   Pulse:    http://localhost:5175
echo   Wave:     http://localhost:5176
echo   Whisper:  http://localhost:5177
echo.
echo   To stop all: taskkill /F /IM node.exe
echo   Docs: docs\README.md
echo ==========================================
echo.
echo   Press any key to close this window...
pause >nul
