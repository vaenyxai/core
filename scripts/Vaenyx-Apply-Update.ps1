# Applies an update that the running server already downloaded, verified and
# staged. Called by the watchdog (and by Vaenyx-Start.cmd) BEFORE the server
# starts, so nothing being replaced is in use.
#
# Order is the whole point:
#   1. snapshot the current source tree (rollback insurance),
#   2. copy the staged tree over the install, never touching userdata/private,
#   3. reinstall + rebuild,
#   4. only then throw the snapshot away.
# Any failure restores the snapshot, so a broken package cannot leave the
# owner with an install that will not start.
#
# Windows PowerShell 5.1, ASCII only (see Vaenyx-Setup.ps1 for why).
[CmdletBinding()]
param(
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Folders that belong to the owner (or to npm), never to the package. Given to
# robocopy as BARE NAMES on purpose: an absolute path only matches the side it
# was built from, and `private` exists in BOTH the package (a README) and the
# install (the secrets), so a path-based exclusion silently mirrored it and
# deleted the owner's API keys. That happened in rehearsal; it must never
# happen on a real machine.
$PreservedFolders = @("userdata", "private", "node_modules", "release", ".git")

# The directories the package owns outright. Only these are mirrored, so a
# file the new version deleted really goes away, while nothing outside this
# list can ever be purged.
$PackageFolders = @(
  "apps",
  "packages",
  "scripts",
  "docs",
  "sample-library",
  "tests",
  ".github"
)

function Get-PendingUpdate {
  param([string]$ConfigDirectory)
  $file = Join-Path $ConfigDirectory "update-pending.json"
  if (-not (Test-Path $file)) { return $null }
  try {
    $raw = Get-Content -LiteralPath $file -Raw -Encoding UTF8
    return $raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

if ($SelfTest) {
  $failures = 0
  function Assert-True {
    param([bool]$Condition, [string]$What)
    if ($Condition) {
      Write-Host "  ok   $What" -ForegroundColor Green
    } else {
      Write-Host "  FAIL $What" -ForegroundColor Red
      $script:failures = $script:failures + 1
    }
  }
  Write-Host "Vaenyx Apply-Update - self test"
  $temporary = Join-Path ([System.IO.Path]::GetTempPath()) ("vx-apply-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temporary -Force | Out-Null
  Assert-True ($null -eq (Get-PendingUpdate $temporary)) "no pending file means nothing to do"
  Set-Content -LiteralPath (Join-Path $temporary "update-pending.json") -Value '{"version":"9.9.9","source":"C:\\nope"}' -Encoding UTF8
  $pending = Get-PendingUpdate $temporary
  Assert-True ($pending.version -eq "9.9.9") "a pending file is read back"
  Set-Content -LiteralPath (Join-Path $temporary "update-pending.json") -Value 'not json' -Encoding UTF8
  Assert-True ($null -eq (Get-PendingUpdate $temporary)) "a corrupt pending file is ignored, not obeyed"
  Assert-True ($PreservedFolders -contains "userdata") "userdata is never overwritten"
  Assert-True ($PreservedFolders -contains "private") "private (secrets) is never overwritten"
  Remove-Item $temporary -Recurse -Force -ErrorAction SilentlyContinue
  if ($failures -gt 0) { Write-Host "$failures check(s) failed." -ForegroundColor Red; exit 1 }
  Write-Host "All self-test checks passed." -ForegroundColor Green
  exit 0
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$configDirectory = Join-Path $root "userdata\config"
$pending = Get-PendingUpdate $configDirectory
if (-not $pending) { exit 0 }

$pendingFile = Join-Path $configDirectory "update-pending.json"
$logDirectory = Join-Path $root "userdata\logs"
if (-not (Test-Path $logDirectory)) {
  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
}
$log = Join-Path $logDirectory "update.log"
function Write-Log {
  param([string]$Text)
  $line = "$(Get-Date -Format s)  $Text"
  Write-Host $line
  Add-Content -LiteralPath $log -Value $line
}

# Second line of defence, checked before anything else is even looked at: the
# server refuses to stage an update on a git checkout, but if a pending marker
# ever reaches one another way, stop here rather than mirror release files
# over someone's working copy.
if (Test-Path (Join-Path $root ".git")) {
  Write-Log "Skipped: this is a git checkout, which updates with git pull."
  Remove-Item $pendingFile -Force -ErrorAction SilentlyContinue
  exit 0
}

$source = $pending.source
if (-not $source -or -not (Test-Path $source)) {
  Write-Log "Update $($pending.version): the staged files are gone; nothing applied."
  Remove-Item $pendingFile -Force -ErrorAction SilentlyContinue
  exit 0
}

Write-Log "Applying update $($pending.version) from $source"

# Before mirroring anything: prove the staged tree is a real Vaenyx package.
# Mirroring from an empty or truncated folder would erase the install, so this
# guard is the difference between a failed update and a destroyed one.
foreach ($needed in @("package.json", "package-lock.json", "apps\server\src", "Vaenyx-Service-Run.cmd")) {
  if (-not (Test-Path (Join-Path $source $needed))) {
    Write-Log "Refusing to apply: the staged package has no $needed."
    Remove-Item $pendingFile -Force -ErrorAction SilentlyContinue
    exit 0
  }
}
$rollback = Join-Path $root "userdata\updates\rollback"
$applied = $false

try {
  # 1. Rollback snapshot of everything the update may overwrite.
  if (Test-Path $rollback) { cmd.exe /c rmdir /s /q "$rollback" | Out-Null }
  New-Item -ItemType Directory -Path $rollback -Force | Out-Null
  & robocopy $root $rollback /E /NFL /NDL /NJH /NJS /NP /XD @PreservedFolders | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "could not take a rollback snapshot (robocopy $LASTEXITCODE)" }
  Write-Log "Rollback snapshot taken."

  # 2a. Mirror each package-owned directory, so files the new version deleted
  # actually disappear (a stale source file that no longer compiles breaks the
  # build - found in rehearsal). Build output is left alone here; the rebuild
  # below replaces it, and until then the install stays runnable.
  foreach ($folder in $PackageFolders) {
    $from = Join-Path $source $folder
    if (-not (Test-Path $from)) { continue }
    & robocopy $from (Join-Path $root $folder) /MIR /NFL /NDL /NJH /NJS /NP /XD node_modules dist | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "could not update $folder (robocopy $LASTEXITCODE)" }
  }
  # 2b. Root-level files only (launchers, package.json, lockfile, README...).
  # Deliberately NOT mirrored: purging at the root is where a small mistake
  # deletes someone's whole instance. A stale launcher left behind is inert.
  # .env is the owner's own configuration and is never overwritten.
  & robocopy $source $root /LEV:1 /NFL /NDL /NJH /NJS /NP /XF ".env" | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "could not update the top-level files (robocopy $LASTEXITCODE)" }
  Write-Log "New files copied in."

  # 3. Dependencies may have changed with the lockfile; rebuild from scratch.
  #
  # Run npm through cmd.exe with its output appended to the log. Calling it
  # directly is a trap: PowerShell turns anything a native command writes to
  # stderr into an error, and vite's harmless "chunks are larger than 500 kB"
  # notice goes to stderr -- which failed a perfectly good build during the
  # first rehearsal of this script. This way the exit code is the only
  # verdict, and a real failure leaves the npm output in update.log instead
  # of a bare "build failed".
  Push-Location $root
  try {
    foreach ($step in @("ci", "run build")) {
      Write-Log "Running npm $step ..."
      cmd.exe /c "npm $step >> `"$log`" 2>&1"
      if ($LASTEXITCODE -ne 0) { throw "npm $step failed (see update.log)" }
    }
  } finally {
    Pop-Location
  }

  # 4. Refuse to call it done unless the app actually built.
  foreach ($artefact in @("apps\server\dist\index.js", "apps\web\dist\index.html")) {
    if (-not (Test-Path (Join-Path $root $artefact))) { throw "missing $artefact after the build" }
  }
  $applied = $true
  Write-Log "Update $($pending.version) applied."
} catch {
  Write-Log "Update FAILED: $($_.Exception.Message)"
  if (Test-Path $rollback) {
    Write-Log "Restoring the previous version..."
    & robocopy $rollback $root /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) {
      Write-Log "ROLLBACK FAILED. The snapshot is still at $rollback"
    } else {
      Push-Location $root
      try {
        cmd.exe /c "npm ci >> `"$log`" 2>&1"
        cmd.exe /c "npm run build >> `"$log`" 2>&1"
      } catch {
        Write-Log "Rebuild after rollback failed: $($_.Exception.Message)"
      } finally {
        Pop-Location
      }
      Write-Log "Previous version restored."
    }
  }
}

# Always clear the marker: a pending update that keeps failing must not put
# the watchdog into an endless update loop.
Remove-Item $pendingFile -Force -ErrorAction SilentlyContinue
if ($applied) {
  cmd.exe /c rmdir /s /q "$rollback" | Out-Null
  # The whole working folder goes, not just the staged tree: the downloaded
  # checksum file has no use once the update is in.
  $updates = Join-Path $root "userdata\updates"
  if (Test-Path $updates) { cmd.exe /c rmdir /s /q "$updates" | Out-Null }
}
exit 0
