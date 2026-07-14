@echo off
setlocal
cd /d "%~dp0"

set "TASK=VaenyxAutostart"
set "RUNNER=%CD%\Vaenyx-Service-Run.cmd"

echo.
echo Vaenyx Install Autostart
echo =======================
echo This registers a Windows Scheduled Task that starts Vaenyx at boot and
echo restarts it if it crashes. Vaenyx still binds 127.0.0.1 only.
echo.

net session >nul 2>nul
if errorlevel 1 (
  echo [Admin needed] Creating a boot-time SYSTEM task requires administrator.
  echo Right-click this file and choose "Run as administrator", then try again.
  pause
  exit /b 1
)

if not exist "Vaenyx-Service-Run.cmd" (
  echo [Missing] Vaenyx-Service-Run.cmd not found next to this script.
  pause
  exit /b 1
)

echo [1/3] Building Vaenyx production files (one time)...
call npm run build
if errorlevel 1 (
  echo Build failed. Fix the build before installing autostart.
  pause
  exit /b 1
)

echo [2/3] Registering scheduled task "%TASK%" (at startup, as SYSTEM)...
schtasks /Create /TN "%TASK%" /TR "cmd /c \"%RUNNER%\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
if errorlevel 1 (
  echo Failed to create the scheduled task.
  pause
  exit /b 1
)

echo [3/3] Starting it now...
schtasks /Run /TN "%TASK%" >nul 2>nul

echo.
echo Done. Vaenyx will now start automatically at boot and self-restart on crash.
echo Check status:  schtasks /Query /TN "%TASK%"
echo Remove later:  Vaenyx-Uninstall-Autostart.cmd  (run as administrator)
pause
exit /b 0
