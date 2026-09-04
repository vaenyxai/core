# Deploys one committed, pushed -dev build to the Owner's local Windows
# instance. It never tags, creates a GitHub Release, or updates the website.
# Coding/tests happen in a worktree; this script is the only approved bridge
# to the production checkout and port 3000.
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

function Invoke-LoggedNpm {
  param([string]$Arguments, [string]$Failure)
  cmd.exe /d /s /c "npm $Arguments >> `"$script:deployLog`" 2>&1"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "--- npm output ---"
    if (Test-Path $script:deployLog) {
      Get-Content -LiteralPath $script:deployLog -Tail 80 | ForEach-Object { Write-Host $_ }
    }
    throw $Failure
  }
}

function Get-SourceVersion {
  $config = Get-Content -LiteralPath "apps\server\src\config.ts" -Raw
  $match = [regex]::Match($config, 'version:\s*"([^"]+)"')
  if (-not $match.Success) { throw "Could not read apps/server/src/config.ts." }
  return $match.Groups[1].Value
}

$dirty = & git status --porcelain
if ($dirty) {
  throw "The main checkout is dirty. DEV deployment accepts committed files only."
}
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne "main") { throw "DEV deployment must run from main (currently '$branch')." }

cmd.exe /d /s /c "git fetch origin > nul 2>&1"
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }
$head = (& git rev-parse HEAD).Trim()
$remote = (& git rev-parse origin/main).Trim()
if ($head -ne $remote) {
  throw "Local main and origin/main differ. Finish the reviewed push before local deployment."
}

$version = Get-SourceVersion
$validatedVersion = (& node.exe "scripts\Vaenyx-Version-Policy.mjs" "assert-dev" $version).Trim()
if ($LASTEXITCODE -ne 0 -or $validatedVersion -ne $version) {
  throw "Version '$version' is not an approved DEV version."
}
if (& git tag --list "v$version") {
  throw "DEV version '$version' must never have a release tag."
}

$script:deployLog = Join-Path ([System.IO.Path]::GetTempPath()) `
  ("vaenyx-dev-deploy-" + [guid]::NewGuid().ToString("N") + ".log")
$databasePath = Join-Path $root "userdata\db\vaenyx.db"
if (Test-Path -LiteralPath $databasePath) {
  Write-Host "Creating the required pre-deployment backup..." -ForegroundColor Cyan
  cmd.exe /d /s /c "node scripts\backup.mjs >> `"$script:deployLog`" 2>&1"
  if ($LASTEXITCODE -ne 0) {
    if (Test-Path $script:deployLog) {
      Get-Content -LiteralPath $script:deployLog -Tail 80 | ForEach-Object { Write-Host $_ }
    }
    Remove-Item -LiteralPath $script:deployLog -Force -ErrorAction SilentlyContinue
    throw "The pre-deployment backup failed; nothing was stopped."
  }
}

try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
    (Join-Path $root "scripts\Vaenyx-Stop.ps1")
  if ($LASTEXITCODE -ne 0) { throw "Vaenyx could not be stopped safely." }

  Write-Host "Installing exact dependencies for $version..." -ForegroundColor Cyan
  Invoke-LoggedNpm "ci --no-audit --no-fund" "npm ci failed; Vaenyx remains stopped."
  Write-Host "Building $version..." -ForegroundColor Cyan
  Invoke-LoggedNpm "run build" "The DEV build failed; Vaenyx remains stopped."

  cmd.exe /d /s /c "`"$(Join-Path $root "Vaenyx-Start.cmd")`" --no-browser"
  if ($LASTEXITCODE -ne 0) { throw "Vaenyx did not restart after the DEV build." }

  $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 5
  if (
    $status.name -ne "Vaenyx" -or
    $status.status -ne "ready" -or
    $status.database.status -ne "ready" -or
    $status.version -ne $version
  ) {
    throw "Health verification did not report ready database-backed version $version."
  }
  if (& git status --porcelain) {
    throw "Deployment changed tracked files; inspect the checkout before continuing."
  }

  Write-Host "DEV $version is running with database health ready." -ForegroundColor Green
} catch {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
    (Join-Path $root "scripts\Vaenyx-Stop.ps1") | Out-Null
  throw
} finally {
  Remove-Item -LiteralPath $script:deployLog -Force -ErrorAction SilentlyContinue
}
