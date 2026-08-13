@echo off
cd /d "%~dp0"
title UNICROSS Clearance — starting app

if not exist "backend\node_modules\" (
  echo Dependencies are not installed yet.
  echo Double-click setup.bat first, then run this file.
  pause
  exit /b 1
)

echo Starting backend on http://localhost:5000
start "UNICROSS API" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo Starting website on http://localhost:3000
start "UNICROSS Website" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo Two windows opened. Leave them open.
echo Browser should open http://localhost:3000
echo Swagger docs: http://localhost:5000/api-docs
echo.
timeout /t 4 >nul
start "" "http://localhost:3000"
exit /b 0
