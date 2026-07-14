$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

$running = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    $_.CommandLine -and
    $_.CommandLine.IndexOf($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  }

try {
  $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 2
  if ($status.name -eq "Vaenyx") { $running = $true }
} catch {
  # Vaenyx is not listening on the production port.
}

if ($running) {
  Write-Error "Vaenyx is running. Double-click Vaenyx-Stop.cmd before updating."
  exit 1
}

if (git status --porcelain) {
  Write-Error "Vaenyx has local code changes. Update stopped to protect them."
  exit 1
}

if (
  (Test-Path (Join-Path $projectRoot "private\data\vaenyx.db")) -or
  (Test-Path (Join-Path $projectRoot "data\vaenyx.db"))
) {
  Write-Host "Creating a backup before updating..."
  & node.exe "scripts/backup.mjs"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Downloading the latest Vaenyx code..."
& git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Installing exact dependencies..."
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running release checks..."
& npm.cmd run release:check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Vaenyx update completed. Double-click Vaenyx-Start.cmd."
