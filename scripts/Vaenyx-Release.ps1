# Cuts a release: stamps the version, commits, tags, pushes. The GitHub
# release workflow (.github/workflows/release.yml) takes it from there - it
# builds the zip AND the installer exe on a Windows runner, installs the zip
# for real as a smoke test, and only then publishes the GitHub Release that
# the website's latest/download links point at.
#
# Usage, only after the Owner directly says the exact formal-release phrase,
# from the repo root, on clean and fully pushed main:
#   powershell -File scripts\Vaenyx-Release.ps1 -Version 0.4.1.0 -OwnerApproval RELEASE
#
# It stops at the first thing that is not right, and in this order:
#   1. The approval token is present and the source is a tested -dev build.
#      The exact next production version bumps the THIRD and resets the fourth
#      to 0. Production versions never carry a suffix.
#   2. Tree is clean, branch is main, origin fetched, main exactly equals
#      origin/main, and the tag does not already exist.
#   3. CHANGELOG.md already has a "## v0.4.1.0" section - notes first, then the
#      button. Commit the notes before releasing.
#   4. Full release checks and the Windows update rehearsal pass while the
#      tested DEV version remains intact.
#   5. The formal version is stamped into apps/server/src/config.ts, then the
#      shipped licence manifest is regenerated.
#   6. Commit the version/licence manifest, tag v0.4.1.0, push main and the tag.
#      The tag starts the release workflow.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [Parameter(Mandatory = $true)][string]$OwnerApproval
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

if ($OwnerApproval -cne "RELEASE") {
  throw "Formal release approval is missing. DEV deployment never supplies this token."
}
if ($Version -notmatch '^\d+\.\d+\.\d+\.0$') {
  throw "A production version must be plain w.x.y.0 (got '$Version')."
}
$tag = "v$Version"

# -- 1. State of the tree ----
$dirty = git status --porcelain
if ($dirty) {
  throw "The working tree is not clean. Commit or stash everything first (a release must come from a committed state).`n$($dirty -join "`n")"
}
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne "main") { throw "Releases are cut from main (currently on '$branch')." }

cmd.exe /d /s /c "git fetch origin --tags > nul 2>&1"
if ($LASTEXITCODE -ne 0) { throw "git fetch failed - is the network up?" }
$behind = [int](git rev-list --count "HEAD..origin/main")
if ($behind -gt 0) { throw "main is $behind commit(s) behind origin/main. Pull first, then release." }
$ahead = [int](git rev-list --count "origin/main..HEAD")
if ($ahead -gt 0) { throw "main is $ahead commit(s) ahead of origin/main. Push and review the DEV build before releasing." }
$existing = git tag --list $tag
if ($existing) { throw "Tag $tag already exists. Each release gets a fresh version." }

$configPath = Join-Path $root "apps\server\src\config.ts"
$configText = [System.IO.File]::ReadAllText($configPath)
$currentMatch = [regex]::Match($configText, 'version:\s*"([^"]+)"')
if (-not $currentMatch.Success) {
  throw "Could not find the version line in apps/server/src/config.ts"
}
$currentVersion = $currentMatch.Groups[1].Value
$expectedVersion = (& node.exe "scripts\Vaenyx-Version-Policy.mjs" "next-production" $currentVersion).Trim()
if ($LASTEXITCODE -ne 0) { throw "The current version '$currentVersion' is not a releasable DEV build." }
if ($Version -ne $expectedVersion) {
  throw "The tested DEV build '$currentVersion' can only become '$expectedVersion' (got '$Version')."
}

# -- 2. Release notes discipline ----
$changelog = [System.IO.File]::ReadAllText((Join-Path $root "CHANGELOG.md"))
if ($changelog -notmatch [regex]::Escape("## $tag")) {
  throw "CHANGELOG.md has no '## $tag' section yet. Write what changed (it becomes the What's New people read), commit it, then run this again."
}

# -- 3. Prove the DEV build before changing its identity ----
# Keeping the stamp until after these gates means a failed test never leaves a
# half-released production version in the working tree.
$checkLog = Join-Path ([System.IO.Path]::GetTempPath()) `
  ("vaenyx-release-check-" + [guid]::NewGuid().ToString("N") + ".log")
foreach ($command in @(
    "run check",
    "run test:production",
    "run test:ops",
    "run test:update:windows"
  )) {
  cmd.exe /d /s /c "npm $command >> `"$checkLog`" 2>&1"
  if ($LASTEXITCODE -ne 0) {
    if (Test-Path $checkLog) { Get-Content $checkLog -Tail 120 | Write-Host }
    Remove-Item $checkLog -Force -ErrorAction SilentlyContinue
    throw "npm $command failed; the DEV version was left unchanged."
  }
}
Remove-Item $checkLog -Force -ErrorAction SilentlyContinue
Write-Host "Release checks passed for tested DEV $currentVersion" -ForegroundColor Cyan

# -- 4. Stamp the formal version ----
# Only the version line changes: the file's BOM (it has one) is preserved,
# and the pattern requires a digit so `version: string;` in the type can
# never be hit. Replace exactly one occurrence.
$configBytes = [System.IO.File]::ReadAllBytes($configPath)
$hadBom = ($configBytes.Length -ge 3 -and $configBytes[0] -eq 0xEF -and $configBytes[1] -eq 0xBB -and $configBytes[2] -eq 0xBF)
$versionLine = New-Object System.Text.RegularExpressions.Regex 'version:\s*"\d[^"]*"'
if (-not $versionLine.IsMatch($configText)) {
  throw "Could not find the version line in apps/server/src/config.ts"
}
$stamped = $versionLine.Replace($configText, "version: `"$Version`"", 1)
[System.IO.File]::WriteAllText($configPath, $stamped, (New-Object System.Text.UTF8Encoding($hadBom)))
Write-Host "Stamped $Version into apps/server/src/config.ts" -ForegroundColor Cyan

# -- 4b. The licence manifest, regenerated for THIS release ----
# THIRD_PARTY_NOTICES.md section 3 requires the shipped manifest to match the
# release; it used to be a separate step nobody ran (the shipped file was
# stamped four minor versions back — sweep, 2026-08-16). Now the release IS
# the step: regenerated after the stamp so it carries this version, committed
# in the release commit below. If this last preparation step fails, restore the
# DEV identity so a failed release never leaves a half-formal tree behind.
$licencePath = Join-Path $root "THIRD_PARTY_LICENSES.md"
$licenceExisted = Test-Path $licencePath
$licenceBytes = if ($licenceExisted) { [System.IO.File]::ReadAllBytes($licencePath) } else { $null }
cmd.exe /d /s /c "npm run licenses > nul 2>&1"
if ($LASTEXITCODE -ne 0) {
  [System.IO.File]::WriteAllBytes($configPath, $configBytes)
  if ($licenceExisted) {
    [System.IO.File]::WriteAllBytes($licencePath, $licenceBytes)
  } else {
    Remove-Item $licencePath -Force -ErrorAction SilentlyContinue
  }
  throw "npm run licenses failed; the DEV version and licence manifest were restored."
}
Write-Host "Regenerated THIRD_PARTY_LICENSES.md for $Version" -ForegroundColor Cyan

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

Invoke-Git "add apps/server/src/config.ts THIRD_PARTY_LICENSES.md" "git add failed"
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
