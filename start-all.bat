@echo off
echo ==========================================
echo   Social Suite - Starting All Apps
echo ==========================================
echo.

set BASE=%~dp0

echo [1/5] Starting Facebook (port 3001 + 5173)...
start "Facebook-Server" cmd /c "cd /d %BASE%facebook\server && node index.js"
start "Facebook-Client" cmd /c "cd /d %BASE%facebook\client && npm run dev"

echo [2/5] Starting Lumina (port 3002 + 5174)...
start "Lumina-Server" cmd /c "cd /d %BASE%lumina\server && node index.js"
start "Lumina-Client" cmd /c "cd /d %BASE%lumina\client && npm run dev"

echo [3/5] Starting Pulse (port 3003 + 5175)...
start "Pulse-Server" cmd /c "cd /d %BASE%pulse\server && node index.js"
start "Pulse-Client" cmd /c "cd /d %BASE%pulse\client && npm run dev"

echo [4/5] Starting Wave (port 3004 + 5176)...
start "Wave-Server" cmd /c "cd /d %BASE%wave\server && node index.js"
start "Wave-Client" cmd /c "cd /d %BASE%wave\client && npm run dev"

echo [5/5] Starting Whisper (port 3005 + 5177)...
start "Whisper-Server" cmd /c "cd /d %BASE%whisper\server && node index.js"
start "Whisper-Client" cmd /c "cd /d %BASE%whisper\client && npm run dev"

echo.
echo ==========================================
echo   All apps are starting!
echo ==========================================
echo.
echo   Facebook:   http://localhost:5173
echo   Lumina:     http://localhost:5174
echo   Pulse:      http://localhost:5175
echo   Wave:       http://localhost:5176
echo   Whisper:    http://localhost:5177
echo.
echo   Docs: docs\README.md
echo ==========================================
