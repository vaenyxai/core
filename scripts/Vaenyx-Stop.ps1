$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pidFiles = @(
  (Join-Path $projectRoot "userdata\db\vaenyx.pid"),
  (Join-Path $projectRoot "private\data\vaenyx.pid")
)
$stopped = $false

# Tell the autostart watchdog to stay stopped: an owner-initiated stop wins
# over auto-restart. Vaenyx-Start (or the in-app start) clears this flag.
$dataDir = Join-Path $projectRoot "userdata\db"
if (-not (Test-Path $dataDir)) {
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
}
Set-Content -LiteralPath (Join-Path $dataDir "autostart-paused.flag") `
  -Value "stopped by owner" -Encoding utf8

Write-Host "Stopping Vaenyx..."

# The watchdog runs the server as SYSTEM, so a normal Owner session cannot
# reliably terminate it with Stop-Process. Ask the server to close itself first;
# app.ts deliberately watches this local flag for deploy/restart tooling. The
# stop sentinel above prevents the watchdog from bringing the old build back.
$configDir = Join-Path $projectRoot "userdata\config"
if (-not (Test-Path $configDir)) {
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
}
$restartFlag = Join-Path $configDir "restart-requested.flag"
try {
  $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 2
  if ($status.name -eq "Vaenyx") {
    Set-Content -LiteralPath $restartFlag -Value "stop-requested" -Encoding ASCII
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      Start-Sleep -Milliseconds 500
      try {
        $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 1
        if ($status.name -ne "Vaenyx") { break }
      } catch {
        $stopped = $true
        break
      }
    }
  }
} catch {
  # Vaenyx is not listening; the process fallback below is still harmless.
}

foreach ($pidFile in $pidFiles) {
  if (Test-Path $pidFile) {
    $savedPid = Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue |
      Select-Object -First 1

    if ($savedPid -and (Get-Process -Id $savedPid -ErrorAction SilentlyContinue)) {
      Stop-Process -Id $savedPid -Force -ErrorAction SilentlyContinue
      $stopped = $true
      Start-Sleep -Milliseconds 500
    }
  }
}

for ($attempt = 0; $attempt -lt 3; $attempt++) {
  $vaenyxProcesses = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "node.exe" -and
      $_.CommandLine -and
      $_.CommandLine.IndexOf($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    }

  if (-not $vaenyxProcesses) {
    break
  }

  foreach ($process in $vaenyxProcesses) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    $stopped = $true
  }

  Start-Sleep -Milliseconds 500
}

if (-not $stopped) {
  try {
    $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 2
    if ($status.name -eq "Vaenyx") {
      $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($listener) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
        $stopped = $true
      }
    }
  } catch {
    # Vaenyx is not listening on the production port.
  }
}

try {
  $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 2
  if ($status.name -eq "Vaenyx") {
    $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($listener) {
      Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
      $stopped = $true
      Start-Sleep -Milliseconds 500
    }
  }
} catch {
  # Vaenyx is no longer listening on the production port.
}

try {
  $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 2
  if ($status.name -eq "Vaenyx") {
    Write-Error "Vaenyx is still running. The stop request did not complete."
    exit 1
  }
} catch {
  # No Vaenyx listener remains.
}
Remove-Item -LiteralPath $restartFlag -Force -ErrorAction SilentlyContinue

if ($stopped) {
  Write-Host "Vaenyx has stopped."
} else {
  Write-Host "Vaenyx was not running."
}

foreach ($pidFile in $pidFiles) {
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}
