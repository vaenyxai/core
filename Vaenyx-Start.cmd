@echo off
setlocal
cd /d "%~dp0"

if /I "%~1"=="--no-browser" set "VAENYX_NO_BROWSER=1"
if /I "%~1"=="-NoBrowser" set "VAENYX_NO_BROWSER=1"
set "VAENYX_URL=http://localhost:3000"
if not defined VAENYX_CHROME_PROFILE_DIR set "VAENYX_CHROME_PROFILE_DIR=Profile 2"

echo.
echo Vaenyx Start
echo ===========
echo Folder: %CD%
echo.

where curl.exe >nul 2>nul
if errorlevel 1 (
  echo [Missing] Windows curl.exe was not found.
  echo Vaenyx uses curl.exe to check whether the local service is ready.
  goto :failed_preflight
)

curl.exe -fsS "http://127.0.0.1:3000/v1/system/status" >nul 2>nul
if not errorlevel 1 (
  echo Vaenyx is already running at %VAENYX_URL%
  call :open_browser
  exit /b 0
)

call :check_runtime
if errorlevel 1 goto :failed_preflight

if not exist "node_modules" (
  echo [1/4] Installing Vaenyx dependencies. First start may take a while...
  call npm ci
  if errorlevel 1 goto :failed
) else (
  echo [1/4] Dependencies already installed.
)

echo [2/4] Building Vaenyx production files...
call npm run build
if errorlevel 1 goto :failed

echo [3/4] Preparing private local folders...
if not exist "userdata\logs" mkdir "userdata\logs"

set "NODE_ENV=production"
set "VAENYX_HOST=127.0.0.1"
set "VAENYX_PORT=3000"
set "VAENYX_LOG_LEVEL=info"
REM Publish/Google credentials live outside the repo (not in git/OneDrive). This is
REM a path only (no secrets) -> safe to commit. Other machines can override it.
if not defined VAENYX_SECRETS_DIR set "VAENYX_SECRETS_DIR=%USERPROFILE%\.claude\secrets"
REM Personal data lives under userdata\ (separate from app code; portable; never cloud-synced).
if not defined VAENYX_DATA_DIR set "VAENYX_DATA_DIR=%CD%\userdata\db"
if not defined VAENYX_BACKUPS_DIR set "VAENYX_BACKUPS_DIR=%CD%\userdata\backups"
if not defined VAENYX_LIBRARY_DIR set "VAENYX_LIBRARY_DIR=%CD%\userdata\library\methods"
if not defined VAENYX_ROUTINES_DIR set "VAENYX_ROUTINES_DIR=%CD%\userdata\library\routines"
REM Publishing routes through the operator-hosted core-cloud service. Unset to
REM use the operator-direct GitHub path instead.
if not defined VAENYX_PUBLISH_SERVICE_URL set "VAENYX_PUBLISH_SERVICE_URL=https://publish.vaenyx.ai"
if not exist "%VAENYX_DATA_DIR%" mkdir "%VAENYX_DATA_DIR%"

REM Explicit owner start clears any autostart "stay stopped" sentinel.
del /q "%VAENYX_DATA_DIR%\autostart-paused.flag" >nul 2>nul

echo [4/4] Starting Vaenyx Service...
echo Vaenyx Service will stay minimized while Vaenyx is running. Use Settings ^> Stop Vaenyx to stop it.
start "Vaenyx Service" /MIN cmd.exe /d /s /c "node apps\server\dist\index.js >> userdata\logs\vaenyx.log 2>> userdata\logs\vaenyx-error.log"
for /L %%A in (1,1,30) do (
  curl.exe -fsS "http://127.0.0.1:3000/v1/system/status" >nul 2>nul
  if not errorlevel 1 goto :ready
  ping -n 2 127.0.0.1 >nul
)

echo Vaenyx could not become ready. Run Vaenyx-Diagnose.cmd for details.
exit /b 1

:ready
echo Vaenyx is ready: %VAENYX_URL%
call :open_browser
exit /b 0

:failed
echo.
echo Vaenyx could not start. Run Vaenyx-Diagnose.cmd for details.
pause
exit /b 1

:failed_preflight
echo.
echo Vaenyx could not start because this computer is missing a required tool.
echo Check the [Missing] or [Old] line above.
echo For Node.js or npm problems, install Node.js 24 or newer, then double-click Vaenyx-Start.cmd again.
echo If you already installed Node.js, close this window and open Vaenyx-Start.cmd again.
echo.
pause
exit /b 1

:check_runtime
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [Missing] Node.js was not found.
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [Missing] npm was not found.
  exit /b 1
)

set "NODE_MAJOR="
for /f "delims=" %%V in ('node -p "process.versions.node.split('.')[0]" 2^>nul') do set "NODE_MAJOR=%%V"
if "%NODE_MAJOR%"=="" (
  echo [Missing] Vaenyx could not read the Node.js version.
  exit /b 1
)
if %NODE_MAJOR% LSS 24 (
  echo [Old] Node.js 24 or newer is required. Current major version: %NODE_MAJOR%
  exit /b 1
)

set "NPM_MAJOR="
for /f "tokens=1 delims=." %%V in ('npm.cmd --version 2^>nul') do set "NPM_MAJOR=%%V"
if "%NPM_MAJOR%"=="" (
  echo [Missing] Vaenyx could not read the npm version.
  exit /b 1
)
if %NPM_MAJOR% LSS 11 (
  echo [Old] npm 11 or newer is required. Current major version: %NPM_MAJOR%
  exit /b 1
)

echo [OK] Node.js and npm are ready.
exit /b 0

:open_browser
if defined VAENYX_NO_BROWSER exit /b 0
set "VAENYX_CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%VAENYX_CHROME_EXE%" set "VAENYX_CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%VAENYX_CHROME_EXE%" (
  start "" "%VAENYX_CHROME_EXE%" --profile-directory="%VAENYX_CHROME_PROFILE_DIR%" "%VAENYX_URL%"
  exit /b 0
)
start "" "%VAENYX_URL%"
exit /b 0
