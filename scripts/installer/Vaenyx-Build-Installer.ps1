# Compiles the GUI installer (release/vaenyx-setup.exe) with Inno Setup 6.
#
# Stages the exact payload the zip download carries (Vaenyx-Stage-Payload.ps1,
# tracked files only) and hands it to ISCC with the version read from
# apps/server/src/config.ts. Runs locally and in CI
# (.github/workflows/release.yml) - same script, same output.
#
# Inno Setup is free. If it is missing:  winget install JRSoftware.InnoSetup
[CmdletBinding()]
param(
  [string]$OutputDirectory = "",
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $root "release" }

if (-not $Version) {
  # Same source of truth the zip build reads (scripts/Vaenyx-Make-Release-Zip.ps1).
  $configText = [System.IO.File]::ReadAllText((Join-Path $root "apps\server\src\config.ts"))
  $match = [regex]::Match($configText, 'version:\s*"([^"]+)"')
  if (-not $match.Success) { throw "Could not read the version from apps/server/src/config.ts" }
  $Version = $match.Groups[1].Value
}
# Windows VERSIONINFO wants plain numbers; a -dev suffix stays visible in
# AppVersion but must be stripped here.
$numericVersion = ($Version -replace "[-+].*$", "")
if ($numericVersion -notmatch '^\d+\.\d+\.\d+$') { $numericVersion = "0.0.0" }

# Find the compiler: PATH first, then the per-user and per-machine defaults.
$iscc = $null
$isccCommand = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if ($isccCommand) { $iscc = $isccCommand.Source }
if (-not $iscc) {
  foreach ($candidate in @(
      (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe"),
      (Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"),
      (Join-Path $env:ProgramFiles "Inno Setup 6\ISCC.exe"))) {
    if ($candidate -and (Test-Path $candidate)) { $iscc = $candidate; break }
  }
}
if (-not $iscc) {
  throw "Inno Setup 6 was not found. It is free - install it with:  winget install JRSoftware.InnoSetup"
}

$icon = Join-Path $PSScriptRoot "vaenyx.ico"
if (-not (Test-Path $icon)) {
  throw "scripts\installer\vaenyx.ico is missing. Regenerate it with scripts\installer\Vaenyx-Make-Icon.ps1 (it is normally committed)."
}

Write-Host "Building vaenyx-setup.exe for Vaenyx $Version" -ForegroundColor Cyan
Write-Host "  Compiler: $iscc"

$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("vaenyx-installer-" + [guid]::NewGuid().ToString("N"))
$payload = Join-Path $staging "payload"
try {
  & (Join-Path $PSScriptRoot "Vaenyx-Stage-Payload.ps1") -Destination $payload

  if (-not (Test-Path $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  }
  $exePath = Join-Path $OutputDirectory "vaenyx-setup.exe"
  if (Test-Path $exePath) { Remove-Item $exePath -Force }

  & $iscc `
    "/DAppVersion=$Version" `
    "/DAppNumericVersion=$numericVersion" `
    "/DPayloadDir=$payload" `
    "/O$OutputDirectory" `
    (Join-Path $PSScriptRoot "vaenyx.iss")
  if ($LASTEXITCODE -ne 0) { throw "ISCC failed ($LASTEXITCODE)" }
  if (-not (Test-Path $exePath)) { throw "ISCC reported success but $exePath does not exist" }

  $hash = (Get-FileHash -Path $exePath -Algorithm SHA256).Hash
  $sizeMb = [math]::Round((Get-Item $exePath).Length / 1MB, 2)
  [System.IO.File]::WriteAllText(
    (Join-Path $OutputDirectory "vaenyx-setup.exe.sha256"),
    "$hash  vaenyx-setup.exe`r`n",
    (New-Object System.Text.UTF8Encoding($false)))

  Write-Host ""
  Write-Host "  $exePath" -ForegroundColor Green
  Write-Host "  $sizeMb MB, SHA256 $hash"
  Write-Host ""
} finally {
  Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
}
