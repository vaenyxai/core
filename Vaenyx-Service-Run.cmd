@echo off
setlocal
cd /d "%~dp0"

REM Vaenyx watchdog runner. Keeps the Vaenyx server alive: starts it, and if it
REM exits or crashes, restarts it. Registered to run at boot by
REM Vaenyx-Install-Autostart.cmd. Local-only: still binds 127.0.0.1.
REM
REM Owner stop wins: if the stop sentinel exists (written by Vaenyx-Stop or the
REM in-app Stop button) the watchdog idles instead of restarting, so an
REM explicit stop stays stopped (even across reboots) until Vaenyx-Start clears
REM it. A Windows-update reboot leaves no sentinel, so Vaenyx comes back.

set "NODE_ENV=production"
set "VAENYX_HOST=127.0.0.1"
set "VAENYX_PORT=3000"
set "VAENYX_LOG_LEVEL=info"
REM Publishing routes through the operator-hosted core-cloud service (users sign
REM in there; the service holds the bot token). Unset it to fall back to the
REM operator-direct GitHub path.
if not defined VAENYX_PUBLISH_SERVICE_URL set "VAENYX_PUBLISH_SERVICE_URL=https://publish.vaenyx.ai"
REM Personal data lives under userdata\ (separate from app code; portable; never cloud-synced).
if not defined VAENYX_DATA_DIR set "VAENYX_DATA_DIR=%CD%\userdata\db"
if not defined VAENYX_BACKUPS_DIR set "VAENYX_BACKUPS_DIR=%CD%\userdata\backups"
if not defined VAENYX_LIBRARY_DIR set "VAENYX_LIBRARY_DIR=%CD%\userdata\library\methods"
if not defined VAENYX_ROUTINES_DIR set "VAENYX_ROUTINES_DIR=%CD%\userdata\library\routines"
if not exist "%VAENYX_DATA_DIR%" mkdir "%VAENYX_DATA_DIR%"
if not exist "userdata\logs" mkdir "userdata\logs"
set "STOP_SENTINEL=%VAENYX_DATA_DIR%\autostart-paused.flag"

:loop
REM Owner asked Vaenyx to stay stopped: idle and keep checking.
if exist "%STOP_SENTINEL%" (
  ping -n 11 127.0.0.1 >nul
  goto loop
)
REM If Vaenyx is already serving (e.g. started manually), just monitor.
curl.exe -fsS "http://127.0.0.1:3000/v1/system/status" >nul 2>nul
if not errorlevel 1 (
  ping -n 11 127.0.0.1 >nul
  goto loop
)
REM A staged update is applied HERE, with the server down, so nothing being
REM replaced is in use. The script takes a rollback snapshot first and puts
REM the old version back if anything fails; it exits immediately when there
REM is nothing pending.
if exist "userdata\config\update-pending.json" (
  echo [%date% %time%] Applying staged update >> "userdata\logs\vaenyx-service.log"
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Vaenyx-Apply-Update.ps1"
)
echo [%date% %time%] Starting Vaenyx server >> "userdata\logs\vaenyx-service.log"
node apps\server\dist\index.js >> "userdata\logs\vaenyx.log" 2>> "userdata\logs\vaenyx-error.log"
echo [%date% %time%] Vaenyx server exited (code %ERRORLEVEL%), restarting in 5s >> "userdata\logs\vaenyx-service.log"
ping -n 6 127.0.0.1 >nul
goto loop
