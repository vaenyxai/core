# Prepares exactly one internal build version in an isolated feature worktree.
# Run after the implementation is complete and before the required checks and
# commit. Re-running is safe: an already prepared version is left unchanged.
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

function Get-VersionFromText {
  param([string]$Text, [string]$Source)
  $match = [regex]::Match($Text, 'version:\s*"([^"]+)"')
  if (-not $match.Success) { throw "Could not read the version from $Source." }
  return $match.Groups[1].Value
}

$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not determine the current git branch." }
if ($branch -eq "main") {
  throw "DEV versions must be prepared in an isolated branch/worktree, not directly on main."
}

$configRelative = "apps/server/src/config.ts"
$configPath = Join-Path $root "apps\server\src\config.ts"
$headText = (& git show "HEAD:$configRelative") -join "`n"
if ($LASTEXITCODE -ne 0) { throw "Could not read the committed version from HEAD." }

$configBytes = [System.IO.File]::ReadAllBytes($configPath)
$hadBom = (
  $configBytes.Length -ge 3 -and
  $configBytes[0] -eq 0xEF -and
  $configBytes[1] -eq 0xBB -and
  $configBytes[2] -eq 0xBF
)
$configText = [System.IO.File]::ReadAllText($configPath)
$baseVersion = Get-VersionFromText $headText "HEAD"
$currentVersion = Get-VersionFromText $configText $configRelative
$expectedVersion = (& node.exe "scripts\Vaenyx-Version-Policy.mjs" "next-dev" $baseVersion).Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not calculate the next DEV version." }

if ($currentVersion -eq $expectedVersion) {
  Write-Host "DEV version $currentVersion is already prepared." -ForegroundColor Cyan
  exit 0
}
if ($currentVersion -ne $baseVersion) {
  throw "The version changed unexpectedly from '$baseVersion' to '$currentVersion'; refusing a second or conflicting bump."
}

$versionLine = New-Object System.Text.RegularExpressions.Regex 'version:\s*"\d[^"]*"'
if (($versionLine.Matches($configText)).Count -ne 1) {
  throw "Expected exactly one version line in $configRelative."
}
$stamped = $versionLine.Replace($configText, "version: `"$expectedVersion`"", 1)
[System.IO.File]::WriteAllText(
  $configPath,
  $stamped,
  (New-Object System.Text.UTF8Encoding($hadBom))
)

Write-Host "Prepared internal build $expectedVersion." -ForegroundColor Green
