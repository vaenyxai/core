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
  if errorlevel 1 (
    echo [%date% %time%] Update is still recovering or another Vaenyx process is active; retrying shortly. >> "userdata\logs\vaenyx-service.log"
    ping -n 11 127.0.0.1 >nul
    goto loop
  )
)
REM Find node.exe without trusting PATH. This script runs as SYSTEM under the
REM Task Scheduler service, whose environment is a boot-time snapshot: a
REM Node.js that setup installed minutes ago is NOT on that PATH until the
REM next reboot, and a bare "node" here dies instantly. Setup writes the
REM absolute path it detected into userdata\config\node-path; trust that
REM first, then the default install folder, then PATH as the last resort.
set "NODE_EXE="
if exist "userdata\config\node-path" set /p NODE_EXE=<"userdata\config\node-path"
if defined NODE_EXE if not exist "%NODE_EXE%" set "NODE_EXE="
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if defined NODE_EXE goto found_node
REM No Node anywhere. Say why once per outage, then retry slowly - a 5-second
REM loop on a command that fails instantly floods the log.
if not defined NODE_MISSING_LOGGED (
  echo [%date% %time%] Cannot start Vaenyx: node.exe was not found. Checked userdata\config\node-path, %ProgramFiles%\nodejs\node.exe and PATH. Install Node.js 24 or newer, or run Vaenyx-Setup.cmd again. Retrying every 60s. >> "userdata\logs\vaenyx-service.log"
  set "NODE_MISSING_LOGGED=1"
)
ping -n 61 127.0.0.1 >nul
goto loop
:found_node
set "NODE_MISSING_LOGGED="
echo [%date% %time%] Starting Vaenyx server using "%NODE_EXE%" >> "userdata\logs\vaenyx-service.log"
REM /normal is load-bearing, not tidiness. schtasks creates tasks at priority
REM 7, which runs them - and everything they start - at BELOW_NORMAL. On a
REM quiet machine nobody notices; on a working one Vaenyx loses the processor
REM to whatever else is running and answers seconds late while using no cpu at
REM all. That is what the Owner saw on 2026-08-06/07: a 26.7-second stall in
REM the log, the models list taking 85 seconds, sign-in crawling - and a
REM hand-started copy of the same build, at normal priority, answering in one
REM millisecond. Measured: task-started server = priority 6, everything else
REM on that machine = 8.
REM
REM Set here as well as on the task itself (Vaenyx-Setup.ps1 registers it with
REM -Priority 4) because this line reaches installs that were registered
REM before the fix, without asking anyone for an elevated prompt. /b keeps it
REM in this console so the redirects below still apply, and /wait keeps the
REM watchdog waiting on the server exactly as it did before.
start "Vaenyx Server" /b /wait /normal "%NODE_EXE%" apps\server\dist\index.js >> "userdata\logs\vaenyx.log" 2>> "userdata\logs\vaenyx-error.log"
echo [%date% %time%] Vaenyx server exited (code %ERRORLEVEL%), restarting in 5s >> "userdata\logs\vaenyx-service.log"
ping -n 6 127.0.0.1 >nul
goto loop
