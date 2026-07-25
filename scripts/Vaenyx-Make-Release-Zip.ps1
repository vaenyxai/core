# Builds the download users get from the website: one zip whose top folder is
# "Vaenyx", with Vaenyx-Setup.cmd sitting right there to double-click.
#
# The same script runs locally and in CI (.github/workflows/release.yml), so
# what gets tested here is what ships.
#
# What goes in: the tracked source tree only. No node_modules and no dist --
# Vaenyx-Setup.cmd fetches and builds those on the user's machine. A fat zip
# would be worse, not better: npm creates the @vaenyx/* workspace links as
# Windows junctions, and a zip cannot carry those, so a pre-populated
# node_modules would arrive silently broken.
#
# Line endings matter: .cmd files with LF endings break cmd.exe's goto/for
# parsing. Everything is normalised to CRLF for the scripts a user runs.
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

# git archive gives exactly the tracked files -- no node_modules, no dist, no
# userdata, no .git, and nothing a stray local file could smuggle in.
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("vaenyx-release-" + [guid]::NewGuid().ToString("N"))
$payload = Join-Path $staging "Vaenyx"
New-Item -ItemType Directory -Path $payload -Force | Out-Null

Push-Location $root
try {
  $tarPath = Join-Path $staging "source.tar"
  & git archive --format=tar --output="$tarPath" HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed (is this a git checkout?)" }
  & tar -xf "$tarPath" -C "$payload"
  if ($LASTEXITCODE -ne 0) { throw "extracting the archive failed" }
  Remove-Item $tarPath -Force
} finally {
  Pop-Location
}

# Never ship a package inside the package. A previous build's output was once
# committed by accident, which quietly doubled the download size.
$nestedRelease = Join-Path $payload "release"
if (Test-Path $nestedRelease) {
  Remove-Item $nestedRelease -Recurse -Force
  Write-Host "  Dropped a stale release/ folder from the payload."
}

# Normalise the launchers to CRLF. git archive writes whatever is in the
# object database (LF), and a LF .cmd is a broken .cmd.
$crlfCount = 0
foreach ($file in Get-ChildItem -Path $payload -Recurse -File -Include *.cmd, *.ps1) {
  $text = [System.IO.File]::ReadAllText($file.FullName)
  $normalised = ($text -replace "`r`n", "`n") -replace "`n", "`r`n"
  [System.IO.File]::WriteAllText($file.FullName, $normalised, (New-Object System.Text.UTF8Encoding($false)))
  $crlfCount = $crlfCount + 1
}
Write-Host "  CRLF-normalised $crlfCount launcher script(s)."

# Sanity: the things a fresh install cannot start without.
$required = @(
  "Vaenyx-Setup.cmd",
  "scripts\Vaenyx-Setup.ps1",
  "Vaenyx-Start.cmd",
  "Vaenyx-Service-Run.cmd",
  "package.json",
  "package-lock.json",
  "apps\server\migrations",
  "sample-library",
  "docs\legal"
)
foreach ($item in $required) {
  if (-not (Test-Path (Join-Path $payload $item))) {
    throw "The package is missing $item -- refusing to publish a broken download."
  }
}
$migrationCount = (Get-ChildItem (Join-Path $payload "apps\server\migrations") -Filter *.sql).Count
if ($migrationCount -lt 1) { throw "No migrations in the package." }
Write-Host "  Contents verified ($migrationCount migrations)."

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
  & tar.exe -a -c -f "$zipPath" "Vaenyx"
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
