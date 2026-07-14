@echo off
setlocal

set "TASK=VaenyxAutostart"

echo.
echo Vaenyx Uninstall Autostart
echo =========================
echo This removes the boot-time autostart task. It does NOT stop a running
echo Vaenyx - use Vaenyx-Stop.cmd for that.
echo.

net session >nul 2>nul
if errorlevel 1 (
  echo [Admin needed] Removing a SYSTEM task requires administrator.
  echo Right-click this file and choose "Run as administrator", then try again.
  pause
  exit /b 1
)

schtasks /End /TN "%TASK%" >nul 2>nul
schtasks /Delete /TN "%TASK%" /F
if errorlevel 1 (
  echo Could not delete task "%TASK%". It may not be installed.
) else (
  echo Removed autostart task "%TASK%".
)
pause
exit /b 0
