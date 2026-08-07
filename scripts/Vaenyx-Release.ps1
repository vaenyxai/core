# Cuts a release: stamps the version, commits, tags, pushes. The GitHub
# release workflow (.github/workflows/release.yml) takes it from there - it
# builds the zip AND the installer exe on a Windows runner, installs the zip
# for real as a smoke test, and only then publishes the GitHub Release that
# the website's latest/download links point at.
#
# Usage, from the repo root, on main, with a clean tree:
#   powershell -File scripts\Vaenyx-Release.ps1 -Version 0.4.0
#
# It stops at the first thing that is not right, and in this order:
#   1. Version is plain x.y.z (production versions never carry a suffix).
#   2. Tree is clean, branch is main, origin fetched, main not behind,
#      tag does not already exist.
#   3. CHANGELOG.md already has a "## v0.4.0" section - notes first, then the
#      button. Commit the notes before releasing.
#   4. The version is stamped into apps/server/src/config.ts (the single
#      source of truth the app, the zip build and the exe build all read).
#   5. npm run check - a broken build must never tag.
#   6. Commit "release: v0.4.0" (config.ts only), tag v0.4.0, push main and
#      the tag. The push of the tag is what starts the release workflow.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Version,
  # For emergencies only: the workflow runs the same checks on the runner
  # anyway, and publishing is blocked there until they pass.
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
  throw "Version must be plain x.y.z (got '$Version'). Production versions never carry a -dev suffix."
}
$tag = "v$Version"

# -- 1. State of the tree ----
$dirty = git status --porcelain
if ($dirty) {
  throw "The working tree is not clean. Commit or stash everything first (a release must come from a committed state).`n$($dirty -join "`n")"
}
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne "main") { throw "Releases are cut from main (currently on '$branch')." }

git fetch origin --tags
if ($LASTEXITCODE -ne 0) { throw "git fetch failed - is the network up?" }
$behind = [int](git rev-list --count "HEAD..origin/main")
if ($behind -gt 0) { throw "main is $behind commit(s) behind origin/main. Pull first, then release." }
$existing = git tag --list $tag
if ($existing) { throw "Tag $tag already exists. Each release gets a fresh version." }

# -- 2. Release notes discipline ----
$changelog = [System.IO.File]::ReadAllText((Join-Path $root "CHANGELOG.md"))
if ($changelog -notmatch [regex]::Escape("## $tag")) {
  throw "CHANGELOG.md has no '## $tag' section yet. Write what changed (it becomes the What's New people read), commit it, then run this again."
}

# -- 3. Stamp the version ----
# Only the version line changes: the file's BOM (it has one) is preserved,
# and the pattern requires a digit so `version: string;` in the type can
# never be hit. Replace exactly one occurrence.
$configPath = Join-Path $root "apps\server\src\config.ts"
$configBytes = [System.IO.File]::ReadAllBytes($configPath)
$hadBom = ($configBytes.Length -ge 3 -and $configBytes[0] -eq 0xEF -and $configBytes[1] -eq 0xBB -and $configBytes[2] -eq 0xBF)
$configText = [System.IO.File]::ReadAllText($configPath)
$versionLine = New-Object System.Text.RegularExpressions.Regex 'version:\s*"\d[^"]*"'
if (-not $versionLine.IsMatch($configText)) {
  throw "Could not find the version line in apps/server/src/config.ts"
}
$stamped = $versionLine.Replace($configText, "version: `"$Version`"", 1)
[System.IO.File]::WriteAllText($configPath, $stamped, (New-Object System.Text.UTF8Encoding($hadBom)))
Write-Host "Stamped $Version into apps/server/src/config.ts" -ForegroundColor Cyan

# -- 4. The same gate CI runs ----
if (-not $SkipChecks) {
  # Through cmd.exe WITH ITS OWN REDIRECT, and the redirect is the point. This
  # script sets $ErrorActionPreference = "Stop", and PowerShell 5.1 turns
  # anything a native command writes to stderr into a terminating error — node
  # prints "SQLite is an experimental feature" there on every run, so a
  # perfectly green check killed the release (2026-08-08). Wrapping in cmd
  # alone does not help; cmd passes the stream straight through. The output is
  # shown either way, so a real failure is still readable.
  $checkLog = Join-Path ([System.IO.Path]::GetTempPath()) `
    ("vaenyx-release-check-" + [guid]::NewGuid().ToString("N") + ".log")
  cmd.exe /c "npm run check > ""$checkLog"" 2>&1"
  if (Test-Path $checkLog) { Get-Content $checkLog | Write-Host }
  if ($LASTEXITCODE -ne 0) {
    # Leave the stamp in place so the fix-and-retry loop is short; the tree
    # being dirty now also stops an accidental immediate re-run from tagging.
    throw "npm run check failed. Fix it, commit, and run this again."
  }
}

# -- 5. Commit, tag, push ----
# git goes through cmd.exe for the same reason npm does above: git writes its
# ordinary progress ("To https://github.com/...") to stderr, and under
# $ErrorActionPreference = "Stop" PowerShell 5.1 treats that as fatal. The
# push of main SUCCEEDED and the script threw anyway, leaving the tag behind
# unpushed - which is the one state this step must never end in (2026-08-08).
function Invoke-Git {
  param([string]$Arguments, [string]$Failure)
  cmd.exe /c "git $Arguments 2>&1"
  if ($LASTEXITCODE -ne 0) { throw $Failure }
}

Invoke-Git "add apps/server/src/config.ts" "git add failed"
Invoke-Git "commit -m ""release: $tag""" "git commit failed"
Invoke-Git "tag $tag" "git tag failed"
Invoke-Git "push origin main" "git push of main failed - the tag was NOT pushed. Resolve, then push main and the tag yourself."
Invoke-Git "push origin $tag" "git push of $tag failed - push it yourself with: git push origin $tag"

Write-Host ""
Write-Host "Release $tag is on its way." -ForegroundColor Green
Write-Host "  Watch the build:  https://github.com/vaenyxai/core/actions"
Write-Host "  It appears at:    https://github.com/vaenyxai/core/releases/tag/$tag"
Write-Host "  The website's latest/download links update by themselves once it is published."
Write-Host ""
