@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0scripts\Vaenyx-Repair-Codex-Visual.ps1"
echo.
pause

