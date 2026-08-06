@echo off
rem Vaenyx one-shot setup. Double-click this file after unzipping the download.
rem Everything real happens in scripts\Vaenyx-Setup.ps1; -ExecutionPolicy Bypass
rem is required because files from a downloaded zip are marked "from the
rem internet" and would otherwise be refused.
rem
rem Two layouts are supported: this file next to scripts\ (a git checkout, or
rem an installed copy), and the release zip, where this file sits at the top
rem with the whole app one level down in Vaenyx\.
setlocal
set "APP_DIR=%~dp0"
if not exist "%APP_DIR%scripts\Vaenyx-Setup.ps1" if exist "%APP_DIR%Vaenyx\scripts\Vaenyx-Setup.ps1" set "APP_DIR=%~dp0Vaenyx\"
if not exist "%APP_DIR%scripts\Vaenyx-Setup.ps1" (
  echo   This download looks incomplete: scripts\Vaenyx-Setup.ps1 was not found.
  echo   Please unzip the WHOLE download, then double-click Vaenyx-Setup.cmd again.
  echo.
  pause
  exit /b 1
)
cd /d "%APP_DIR%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%scripts\Vaenyx-Setup.ps1" %*
set "SETUP_EXIT=%ERRORLEVEL%"

if not "%SETUP_EXIT%"=="0" (
  echo.
  echo   Setup did not finish. The message above says what to fix.
  echo   You can safely run this file again after fixing it.
)

echo.
pause
exit /b %SETUP_EXIT%
