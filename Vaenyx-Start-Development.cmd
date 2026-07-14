@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing Vaenyx dependencies...
  call npm ci
  if errorlevel 1 goto :failed
)

echo Starting Vaenyx development mode...
echo Open http://localhost:5173 after both services are ready.
echo Press Ctrl+C to stop development mode.
echo.

call npm run dev
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo Vaenyx development mode could not start.
pause
exit /b 1
