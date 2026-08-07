# Stages the exact tree a release ships: the tracked files only, straight out
# of git, CRLF-normalised for the launcher scripts. Shared by the zip build
# (scripts/Vaenyx-Make-Release-Zip.ps1) and the installer build
# (scripts/installer/Vaenyx-Build-Installer.ps1) so the two downloads can never
# drift apart.
#
# What goes in by default: the tracked source tree only, and the machine that
# receives it fetches and builds. That is what the ZIP download still carries.
#
# -WithDependencies also puts node_modules and the built dist folders in, which
# is what the exe carries: the user then downloads ~115 MB once instead of
# fetching ~230 MB in 18,000 files and compiling it, and the two steps that
# have broken most often on other people's machines stop running there at all.
#
# ⚠ THE WORKSPACE-JUNCTION PROBLEM, and the decision.
# npm links the workspace packages (@vaenyx/contracts) into node_modules as
# Windows JUNCTIONS. Neither a zip nor an Inno payload can carry a junction:
# they would arrive as empty folders or dangling links, and the failure would
# be an import error at first boot rather than anything the build noticed.
# The options were to recreate the links on the user's machine (a step that can
# fail, on the install path with the worst track record) or to not have links
# at all. This takes the second: after the dependency install, every @vaenyx
# junction is replaced by a REAL COPY of the package. They are a few hundred
# kilobytes of type definitions, a copy behaves identically to a link at
# runtime, and it survives being zipped, compiled into an exe, extracted,
# moved and restored from a backup. Nothing has to work on the user's machine
# for it to be right.
[CmdletBinding()]
param(
  # The folder to fill with the payload tree. Created by this script.
  [Parameter(Mandatory = $true)][string]$Destination,
  # Also install production dependencies and build, so the receiving machine
  # does neither. Used by the exe; the zip stays source-only.
  [switch]$WithDependencies
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

if ($WithDependencies) {
  Push-Location $Destination
  try {
    # Everything, because the build needs typescript and vite; pruned below.
    Write-Host "  Installing dependencies into the payload..."
    & npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed while staging the payload" }

    Write-Host "  Building..."
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "the build failed while staging the payload" }

    # The user needs none of the build tooling. This is the difference between
    # shipping ~230 MB and ~115 MB.
    Write-Host "  Removing build-only dependencies..."
    & npm prune --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm prune failed while staging the payload" }
  } finally {
    Pop-Location
  }

  # De-junction (see the note at the top): a link cannot survive the trip, a
  # copy can. Done AFTER prune, because prune rewrites node_modules.
  $workspaceLinks = Join-Path $Destination "node_modules\@vaenyx"
  $replaced = 0
  if (Test-Path $workspaceLinks) {
    foreach ($link in Get-ChildItem $workspaceLinks -Force) {
      $source = Join-Path $Destination "packages\$($link.Name)"
      if (-not (Test-Path $source)) {
        throw "node_modules\@vaenyx\$($link.Name) points at a workspace that is not in the payload."
      }
      Remove-Item $link.FullName -Recurse -Force
      Copy-Item $source $link.FullName -Recurse -Force
      $replaced = $replaced + 1
    }
  }
  if ($replaced -lt 1) { throw "No @vaenyx workspace packages were staged -- the payload would not start." }
  Write-Host "  Replaced $replaced workspace link(s) with real copies."

  # 🔴 Prove it rather than assume it: a junction reports as a ReparsePoint,
  # and one surviving here is a payload that arrives broken with no other sign.
  foreach ($item in Get-ChildItem $workspaceLinks -Force) {
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      throw "node_modules\@vaenyx\$($item.Name) is still a link, not a copy."
    }
  }

  # And that the pieces a prebuilt install cannot start without are really here.
  foreach ($item in @(
      "node_modulesastify",
      "node_modules\@vaenyx\contracts\package.json",
      "apps\server\dist\index.js",
      "apps\web\dist\index.html")) {
    if (-not (Test-Path (Join-Path $Destination $item))) {
      throw "The prebuilt payload is missing $item -- refusing to build a broken download."
    }
  }
  $bytes = (Get-ChildItem $Destination -File -Recurse -Force -ErrorAction SilentlyContinue |
    Measure-Object Length -Sum).Sum
  Write-Host ("  Prebuilt payload staged: {0:N0} MB." -f ($bytes / 1MB))
}
