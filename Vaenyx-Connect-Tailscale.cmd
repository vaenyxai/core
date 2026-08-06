@echo off
setlocal
cd /d "%~dp0"

rem The installed Tailscale client lives under Program Files (the MSI puts it
rem there). The old arrangement of copying tailscale.exe into private\tools is
rem retired: a copied CLI drifts out of sync with the background service it
rem talks to, and the installer already provides the real one.
rem
rem No parenthesized blocks around these paths on purpose: the ")" inside an
rem expanded %ProgramFiles(x86)% closes a block early and corrupts the script.
set "TAILSCALE_EXE=%ProgramFiles%\Tailscale\tailscale.exe"
if not exist "%TAILSCALE_EXE%" set "TAILSCALE_EXE=%ProgramFiles(x86)%\Tailscale\tailscale.exe"

echo.
echo Vaenyx Tailscale Connect
echo =======================
echo.

if exist "%TAILSCALE_EXE%" goto :have_tool
echo [Missing] The Tailscale client is not installed on this computer.
echo Looked under Program Files for Tailscale\tailscale.exe.
echo.
echo The easiest way to set up phone access is inside Vaenyx itself:
echo   Settings -^> Phone Access
echo installs, signs in and opens the channel for you, with a QR code at
echo the end.
echo.
echo To install just the client by hand instead, get it from the official
echo Tailscale website: https://tailscale.com/download
pause
exit /b 1

:have_tool
if /I "%~1"=="--version" goto :version
if /I "%~1"=="--login" goto :login
if /I "%~1"=="--funnel" goto :funnel
if /I "%~1"=="--status" goto :status
if /I "%~1"=="--service-status" goto :service_status

echo Tool:
"%TAILSCALE_EXE%" version
echo.
echo Vaenyx is still local-only until you log in to Tailscale and turn on
echo Funnel for the local Vaenyx port 3000. Settings -^> Phone Access inside
echo Vaenyx walks through all of this with buttons; this window is the manual
echo route for people who prefer a console.
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
echo Publishing the local Vaenyx port 3000 through Tailscale Funnel, in the
echo background so it stays on after this window closes.
echo If your Tailnet has not enabled Funnel yet, Tailscale prints a link to
echo turn it on in the admin console. Open that link, enable Funnel, then run
echo this command again.
"%TAILSCALE_EXE%" funnel --bg 3000
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
