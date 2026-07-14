@echo off
setlocal
cd /d "%~dp0"

set "CLOUDFLARED_EXE=%CD%\private\tools\cloudflared\cloudflared.exe"

echo.
echo Vaenyx Cloudflare Connect
echo ========================
echo.

if not exist "%CLOUDFLARED_EXE%" (
  echo [Missing] cloudflared was not found at:
  echo %CLOUDFLARED_EXE%
  echo.
  echo Ask Codex to install the Cloudflare Tunnel tool first.
  pause
  exit /b 1
)

if /I "%~1"=="--version" goto :version
if /I "%~1"=="--login" goto :login
if /I "%~1"=="--install-token" goto :install_token
if /I "%~1"=="--service-status" goto :service_status

echo Tool:
"%CLOUDFLARED_EXE%" --version
echo.
echo Vaenyx is still local-only until you install a Cloudflare Tunnel connector
echo with an Owner-approved Cloudflare Access policy.
echo.
echo Safe commands:
echo   "%~nx0" --version
echo   "%~nx0" --login
echo   "%~nx0" --service-status
echo.
echo Connector command, after Cloudflare Zero Trust gives you a tunnel token:
echo   "%~nx0" --install-token ^<Cloudflare tunnel token^>
echo.
echo Do not install a tunnel token until the Cloudflare Access policy only
echo allows approved Owner email addresses.
echo.
pause
exit /b 0

:version
"%CLOUDFLARED_EXE%" --version
exit /b %ERRORLEVEL%

:login
echo This opens Cloudflare login in your browser. It does not expose Vaenyx.
"%CLOUDFLARED_EXE%" tunnel login
exit /b %ERRORLEVEL%

:install_token
if "%~2"=="" (
  echo [Missing] Paste the tunnel token after --install-token.
  echo Example:
  echo   "%~nx0" --install-token ^<Cloudflare tunnel token^>
  exit /b 1
)
echo Installing the Cloudflare Tunnel Windows service.
echo This should only be used after Cloudflare Access has an allow policy.
"%CLOUDFLARED_EXE%" service install %~2
exit /b %ERRORLEVEL%

:service_status
sc.exe query cloudflared
exit /b %ERRORLEVEL%
