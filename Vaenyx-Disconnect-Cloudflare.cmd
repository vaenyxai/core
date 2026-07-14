@echo off
setlocal
cd /d "%~dp0"

REM Retire the old Cloudflare Tunnel. Vaenyx now uses Tailscale Funnel for remote
REM access; cloudflared (vaenyx.auhs.com.au) is no longer used. This stops and
REM uninstalls the cloudflared Windows service. Self-elevates to admin.

net session >nul 2>nul
if errorlevel 1 (
  echo Requesting administrator rights for service removal...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

echo Stopping cloudflared service...
sc stop cloudflared
echo Uninstalling cloudflared service...
if exist "%~dp0private\tools\cloudflared\cloudflared.exe" "%~dp0private\tools\cloudflared\cloudflared.exe" service uninstall
sc delete cloudflared >nul 2>nul
echo.
echo Done. Cloudflare Tunnel removed. Remote access is Tailscale Funnel only.
echo You can close this window.
pause
