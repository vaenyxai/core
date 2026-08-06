# Stages the exact tree a release ships: the tracked files only, straight out
# of git, CRLF-normalised for the launcher scripts. Shared by the zip build
# (scripts/Vaenyx-Make-Release-Zip.ps1) and the installer build
# (scripts/installer/Vaenyx-Build-Installer.ps1) so the two downloads can never
# drift apart.
#
# What goes in: the tracked source tree only. No node_modules and no dist --
# setup fetches and builds those on the user's machine. A fat payload would be
# worse, not better: npm creates the @vaenyx/* workspace links as Windows
# junctions, and neither a zip nor an installer can carry those, so a
# pre-populated node_modules would arrive silently broken.
[CmdletBinding()]
param(
  # The folder to fill with the payload tree. Created by this script.
  [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
New-Item -ItemType Directory -Path $Destination -Force | Out-Null

# git archive gives exactly the tracked files -- no node_modules, no dist, no
# userdata, no .git, and nothing a stray local file could smuggle in.
Push-Location $root
try {
  $tarPath = Join-Path ([System.IO.Path]::GetTempPath()) ("vaenyx-payload-" + [guid]::NewGuid().ToString("N") + ".tar")
  & git archive --format=tar --output="$tarPath" HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed (is this a git checkout?)" }
  & tar -xf "$tarPath" -C "$Destination"
  if ($LASTEXITCODE -ne 0) { throw "extracting the archive failed" }
  Remove-Item $tarPath -Force
} finally {
  Pop-Location
}

# Never ship a package inside the package. A previous build's output was once
# committed by accident, which quietly doubled the download size.
$nestedRelease = Join-Path $Destination "release"
if (Test-Path $nestedRelease) {
  Remove-Item $nestedRelease -Recurse -Force
  Write-Host "  Dropped a stale release/ folder from the payload."
}

# Normalise the launchers to CRLF. git archive writes whatever is in the
# object database (LF), and a LF .cmd is a broken .cmd.
# .ps1 keeps a UTF-8 BOM: Windows PowerShell 5.1 reads a BOM-less script as the
# ANSI codepage, which turns the Chinese setup messages into parse errors.
# The read-me is normalised too: it carries Chinese text and gets opened in
# whatever editor the user has, so CRLF + BOM is the safe combination.
$crlfCount = 0
foreach ($file in Get-ChildItem -Path $Destination -Recurse -File -Include *.cmd, *.ps1, Read-Me-First.txt) {
  $text = [System.IO.File]::ReadAllText($file.FullName)
  $normalised = ($text -replace "`r`n", "`n") -replace "`n", "`r`n"
  $wantsBom = ($file.Extension -eq ".ps1") -or ($file.Extension -eq ".txt")
  [System.IO.File]::WriteAllText($file.FullName, $normalised, (New-Object System.Text.UTF8Encoding($wantsBom)))
  $crlfCount = $crlfCount + 1
}
Write-Host "  CRLF-normalised $crlfCount launcher/read-me file(s)."

# Sanity: the things a fresh install cannot start without.
$required = @(
  "Vaenyx-Setup.cmd",
  "scripts\Vaenyx-Setup.ps1",
  "scripts\installer\Read-Me-First.txt",
  "Vaenyx-Start.cmd",
  "Vaenyx-Service-Run.cmd",
  "package.json",
  "package-lock.json",
  "apps\server\migrations",
  "sample-library",
  "docs\legal"
)
foreach ($item in $required) {
  if (-not (Test-Path (Join-Path $Destination $item))) {
    throw "The payload is missing $item -- refusing to build a broken download."
  }
}
$migrationCount = (Get-ChildItem (Join-Path $Destination "apps\server\migrations") -Filter *.sql).Count
if ($migrationCount -lt 1) { throw "No migrations in the payload." }
Write-Host "  Payload verified ($migrationCount migrations)."
