@echo off
setlocal
cd /d "%~dp0"

set "TAILSCALE_EXE=%CD%\private\tools\tailscale\tailscale.exe"

echo.
echo Vaenyx Tailscale Connect
echo =======================
echo.

if not exist "%TAILSCALE_EXE%" (
  echo [Missing] tailscale.exe was not found at:
  echo %TAILSCALE_EXE%
  echo.
  echo On Windows, Tailscale is not a single portable file like cloudflared.
  echo Install the official Tailscale client first. It adds the Tailscale
  echo background service. Then copy its tailscale.exe into:
  echo   %CD%\private\tools\tailscale\
  echo.
  echo Vaenyx never downloads this tool for you. Get it from the official
  echo Tailscale website yourself, then place the file above.
  pause
  exit /b 1
)

if /I "%~1"=="--version" goto :version
if /I "%~1"=="--login" goto :login
if /I "%~1"=="--funnel" goto :funnel
if /I "%~1"=="--status" goto :status
if /I "%~1"=="--service-status" goto :service_status

echo Tool:
"%TAILSCALE_EXE%" version
echo.
echo Vaenyx is still local-only until you log in to Tailscale and turn on
echo Funnel for the local Vaenyx port 3000.
echo.
echo Safe commands:
echo   "%~nx0" --version
echo   "%~nx0" --login
echo   "%~nx0" --status
echo   "%~nx0" --service-status
echo.
echo Publish command, after you are logged in and Funnel is enabled for your
echo Tailnet:
echo   "%~nx0" --funnel
echo.
echo Funnel publishes the local Vaenyx port 3000 as a public https://*.ts.net
echo address over TLS only, on Funnel ports 443/8443/10000. The local Vaenyx
echo service still listens on 127.0.0.1 only. Tailscale terminates TLS on this
echo machine and does not decrypt your traffic in transit.
echo.
pause
exit /b 0

:version
"%TAILSCALE_EXE%" version
exit /b %ERRORLEVEL%

:login
echo This opens Tailscale login in your browser so you can sign in with your
echo own free Tailscale account. It does not expose Vaenyx by itself.
"%TAILSCALE_EXE%" up
exit /b %ERRORLEVEL%

:funnel
echo Publishing the local Vaenyx port 3000 through Tailscale Funnel.
echo If your Tailnet has not enabled Funnel yet, Tailscale prints a link to
echo turn it on in the admin console. Open that link, enable Funnel, then run
echo this command again.
"%TAILSCALE_EXE%" funnel 3000
exit /b %ERRORLEVEL%

:status
"%TAILSCALE_EXE%" status
exit /b %ERRORLEVEL%

:service_status
echo The Tailscale background service is usually named "Tailscale".
echo If this query reports the service does not exist, your Tailscale version
echo may use a different service name; check Services with services.msc.
sc.exe query Tailscale
exit /b %ERRORLEVEL%
