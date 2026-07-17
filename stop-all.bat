@echo off
echo Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo Done! All servers and clients stopped.
echo.
pause
