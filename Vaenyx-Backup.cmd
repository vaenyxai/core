@echo off
setlocal
cd /d "%~dp0"

node scripts\backup.mjs
echo.
pause
