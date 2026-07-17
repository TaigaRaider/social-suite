@echo off
echo Starting Facebook Clone...
echo.
echo Starting backend server...
start "Facebook Server" cmd /c "cd server && node index.js"
timeout /t 2 >nul
echo Starting frontend...
start "Facebook Client" cmd /c "cd client && npm run dev"
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
