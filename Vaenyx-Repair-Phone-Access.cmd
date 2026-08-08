@echo off
REM Puts phone access back after a Tailscale reinstall reset it.
REM Double-click this; Windows will ask for administrator rights once, because
REM restarting a service needs them.
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoExit','-NoProfile','-ExecutionPolicy','Bypass','-File','\"%~dp0scripts\Vaenyx-Repair-Phone-Access.ps1\"'"
endlocal
