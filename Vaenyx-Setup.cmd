@echo off
rem Vaenyx one-shot setup. Double-click this file after unzipping the download.
rem Everything real happens in scripts\Vaenyx-Setup.ps1; -ExecutionPolicy Bypass
rem is required because files from a downloaded zip are marked "from the
rem internet" and would otherwise be refused.
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Vaenyx-Setup.ps1" %*
set "SETUP_EXIT=%ERRORLEVEL%"

if not "%SETUP_EXIT%"=="0" (
  echo.
  echo   Setup did not finish. The message above says what to fix.
  echo   You can safely run this file again after fixing it.
)

echo.
pause
exit /b %SETUP_EXIT%
