@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title UNICROSS Clearance — one-time setup
color 0A

echo.
echo ============================================================
echo   UNICROSS Payment Verification ^& Clearance System
echo   One-time install for this computer
echo ============================================================
echo.

REM ---------- Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Trying Windows Package Manager...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo.
    echo Could not find winget. Please install Node.js LTS yourself:
    echo   https://nodejs.org/en/download
    echo Choose the Windows Installer, then run this file again.
    start "" "https://nodejs.org/en/download"
    goto :end_fail
  )
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was installed but this window cannot see it yet.
  echo Close this window and double-click setup.bat again.
  goto :end_fail
)

echo Node.js:
node -v
echo npm:
call npm -v
echo.

REM ---------- Project packages ----------
echo Installing backend packages (this can take a few minutes)...
call npm install --prefix backend
if errorlevel 1 (
  echo Backend npm install failed. Check your internet connection.
  goto :end_fail
)

echo.
echo Installing frontend packages (this can take a few minutes)...
call npm install --prefix frontend
if errorlevel 1 (
  echo Frontend npm install failed. Check your internet connection.
  goto :end_fail
)

echo.
echo All project dependencies are installed.
echo.

REM ---------- backend/.env ----------
if not exist "backend\.env" (
  copy /Y "backend\.env.example" "backend\.env" >nul
  echo Created backend\.env from the example file.
)

set "DBPASS="
for /f "usebackq tokens=1,* delims==" %%A in ("backend\.env") do (
  if /I "%%A"=="DB_PASSWORD" set "DBPASS=%%B"
)

echo.
echo The database needs the PostgreSQL "postgres" user password
echo (the one you set when you installed PostgreSQL).
if defined DBPASS (
  if not "!DBPASS!"=="your_password" if not "!DBPASS!"=="" (
    echo Current backend\.env already has a DB_PASSWORD.
    set /p KEEP="Keep it? (Y/n): "
    if /I "!KEEP!"=="n" set "DBPASS="
  )
)

if not defined DBPASS (
  set /p DBPASS="Enter PostgreSQL password: "
)
if not defined DBPASS (
  echo No password entered. You can edit backend\.env later and run:
  echo   node setup-database.js
  goto :skip_db
)

set "JWT="
for /f "usebackq delims=" %%H in (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) do set "JWT=%%H"
if not defined JWT set "JWT=unicross-change-me-%RANDOM%%RANDOM%"

> "backend\.env" (
  echo PORT=5000
  echo NODE_ENV=development
  echo JWT_SECRET=!JWT!
  echo BASE_URL=http://localhost:5000
  echo CORS_ORIGINS=http://localhost:3000
  echo.
  echo DB_HOST=localhost
  echo DB_PORT=5432
  echo DB_NAME=payment_verification_db
  echo DB_USER=postgres
  echo DB_PASSWORD=!DBPASS!
  echo.
  echo SMTP_HOST=
  echo SMTP_PORT=587
  echo SMTP_USER=
  echo SMTP_PASS=
  echo SMTP_FROM=noreply@unicross.edu.ng
)

echo Saved backend\.env

REM ---------- PostgreSQL service (best effort) ----------
sc query "postgresql-x64-18" >nul 2>nul && net start "postgresql-x64-18" >nul 2>nul
sc query "postgresql-x64-17" >nul 2>nul && net start "postgresql-x64-17" >nul 2>nul
sc query "postgresql-x64-16" >nul 2>nul && net start "postgresql-x64-16" >nul 2>nul

where psql >nul 2>nul
if errorlevel 1 (
  echo.
  echo PostgreSQL command-line tools were not found on PATH.
  echo If PostgreSQL is not installed, download it from:
  echo   https://www.postgresql.org/download/windows/
  echo Then run this file again.
)

echo.
echo Creating the database and demo users...
node setup-database.js
if errorlevel 1 (
  echo.
  echo Database setup did not finish. Typical causes:
  echo   - PostgreSQL is not installed or not running
  echo   - The password does not match the postgres user
  echo Fix that, then run:  node setup-database.js
  goto :end_fail
)

:skip_db
echo.
echo ============================================================
echo   Install finished.
echo.
echo   Next: double-click  start.bat
echo   Then open http://localhost:3000
echo.
echo   Admin    username=admin      password=admin123
echo   Student  username=student1   password=student123
echo ============================================================
echo.
pause
exit /b 0

:end_fail
echo.
pause
exit /b 1
