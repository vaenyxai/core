# Builds the portable download users get from the website: one zip whose top
# level holds exactly two things to look at -- Vaenyx-Setup.cmd to double-click
# and Read-Me-First.txt to read -- with the whole app tree one level down in
# Vaenyx\. Fewer files at the top means fewer wrong things to click first.
#
# The same script runs locally and in CI (.github/workflows/release.yml), so
# what gets tested is what ships. The payload itself is staged by
# scripts/installer/Vaenyx-Stage-Payload.ps1, shared with the .exe installer
# build so the two downloads can never drift apart.
[CmdletBinding()]
param(
  [string]$OutputDirectory = "",
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $root "release" }

if (-not $Version) {
  $configText = [System.IO.File]::ReadAllText((Join-Path $root "apps\server\src\config.ts"))
  $match = [regex]::Match($configText, 'version:\s*"([^"]+)"')
  if (-not $match.Success) { throw "Could not read the version from apps/server/src/config.ts" }
  $Version = $match.Groups[1].Value
}

Write-Host "Packaging Vaenyx $Version" -ForegroundColor Cyan

$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("vaenyx-release-" + [guid]::NewGuid().ToString("N"))
$payload = Join-Path $staging "Vaenyx"
New-Item -ItemType Directory -Path $staging -Force | Out-Null
& (Join-Path $PSScriptRoot "installer\Vaenyx-Stage-Payload.ps1") -Destination $payload

# The zip layout: only the setup launcher and the read-me at the top,
# everything else inside Vaenyx\. The launcher knows both layouts (it looks
# for scripts\Vaenyx-Setup.ps1 next to itself first, then under Vaenyx\), so
# the same file works here and in a git checkout.
#
# COPY, not move: the app tree keeps its own Vaenyx-Setup.cmd. The in-app
# updater applies the Vaenyx\ folder over an install, and an installed copy
# must keep receiving launcher fixes; the top-level copy exists so the person
# who just unzipped has exactly one obvious thing to double-click.
Copy-Item (Join-Path $payload "Vaenyx-Setup.cmd") (Join-Path $staging "Vaenyx-Setup.cmd")
Copy-Item (Join-Path $payload "scripts\installer\Read-Me-First.txt") (Join-Path $staging "Read-Me-First.txt")

# Assert the top-level contract before packing: exactly these three entries.
# The website's install guide and the release notes describe this layout, and
# a stray extra file at the top would be the first thing every user clicks.
$topLevel = @(Get-ChildItem -Path $staging | Sort-Object Name | ForEach-Object { $_.Name })
$expected = @("Read-Me-First.txt", "Vaenyx", "Vaenyx-Setup.cmd")
if (($topLevel -join "|") -ne ($expected -join "|")) {
  throw "Unexpected zip top level: $($topLevel -join ', ') (wanted: $($expected -join ', '))"
}

if (-not (Test-Path $OutputDirectory)) {
  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}
$zipPath = Join-Path $OutputDirectory "vaenyx-setup.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
# tar.exe (bsdtar, shipped with Windows 10+), NOT Compress-Archive: on
# Windows PowerShell 5.1 the latter writes BACKSLASHES as the in-zip path
# separator, which Windows tolerates but every mac/Linux unzip does not --
# they produce one flat pile of files called "Vaenyx\apps\...". For a public
# download that has to be a correct zip.
Push-Location $staging
try {
  & tar.exe -a -c -f "$zipPath" "Vaenyx-Setup.cmd" "Read-Me-First.txt" "Vaenyx"
  if ($LASTEXITCODE -ne 0) { throw "packing the zip failed ($LASTEXITCODE)" }
} finally {
  Pop-Location
}

$hash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
[System.IO.File]::WriteAllText(
  (Join-Path $OutputDirectory "vaenyx-setup.zip.sha256"),
  "$hash  vaenyx-setup.zip`r`n",
  (New-Object System.Text.UTF8Encoding($false)))

Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  $zipPath" -ForegroundColor Green
Write-Host "  $sizeMb MB, SHA256 $hash"
Write-Host ""
