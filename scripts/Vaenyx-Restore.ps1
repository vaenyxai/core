$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# Ask the app where backups actually live instead of keeping a second copy of
# that logic here. The hardcoded list this replaces still pointed at
# private\backups and backups, so on a current install (userdata\backups, plus
# whatever destination the owner configured) this script reported "No backups
# folder exists yet" while the backups sat right there.
$backupRoots = @()
try {
  Push-Location $projectRoot
  $rootsOutput = & node.exe --input-type=module -e "import { backupRoots } from './scripts/lib/paths.mjs'; console.log(JSON.stringify(backupRoots));" 2>$null
  Pop-Location
  # -join matters: node's output arrives as an array of lines, and piping that
  # straight into ConvertFrom-Json yields an array nested inside an array,
  # which then unrolls in confusing ways further down.
  $rootsJson = ($rootsOutput -join "").Trim()
  if ($LASTEXITCODE -eq 0 -and $rootsJson) {
    $backupRoots = [string[]](ConvertFrom-Json $rootsJson)
  }
} catch {
  # Fall through to the built-in list below.
}
if ($backupRoots.Count -eq 0) {
  $backupRoots = @(
    (Join-Path $projectRoot "userdata\backups"),
    (Join-Path $projectRoot "private\backups"),
    (Join-Path $projectRoot "backups")
  )
}

$running = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    $_.CommandLine -and
    $_.CommandLine.IndexOf($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  }

try {
  $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/v1/system/status" -TimeoutSec 2
  if ($status.name -eq "Vaenyx") { $running = $true }
} catch {
  # Vaenyx is not listening on the production port.
}

if ($running) {
  Write-Error "Vaenyx is running. Double-click Vaenyx-Stop.cmd before restoring."
  exit 1
}

if (-not ($backupRoots | Where-Object { Test-Path $_ })) {
  Write-Error "No backups folder exists yet. Double-click Vaenyx-Backup.cmd first."
  exit 1
}

$backups = @(
  foreach ($backupsDirectory in $backupRoots) {
    if (Test-Path $backupsDirectory) {
      Get-ChildItem -LiteralPath $backupsDirectory -Directory |
        Where-Object {
          # An encrypted backup has no loose vaenyx.db - everything is inside
          # backup.vbak. Filtering on the database alone hid every encrypted
          # backup from this picker, even though restore.mjs unpacks them.
          (Test-Path (Join-Path $_.FullName "vaenyx.db")) -or
          (Test-Path (Join-Path $_.FullName "backup.vbak"))
        }
    }
  }
) | Sort-Object LastWriteTime -Descending

if ($backups.Count -eq 0) {
  Write-Error "No valid Vaenyx backups were found."
  exit 1
}

Write-Host "Available Vaenyx backups:"
for ($index = 0; $index -lt $backups.Count; $index++) {
  Write-Host "[$($index + 1)] $($backups[$index].Name)"
}

$selection = Read-Host "Enter the backup number to restore"
$number = 0
if (-not [int]::TryParse($selection, [ref]$number) -or $number -lt 1 -or $number -gt $backups.Count) {
  Write-Error "Invalid backup number. Nothing was changed."
  exit 1
}

$selected = $backups[$number - 1]
Write-Host ""
Write-Host "This will replace the current Vaenyx database with:"
Write-Host $selected.FullName
$confirmation = Read-Host "Type RESTORE to continue"

if ($confirmation -cne "RESTORE") {
  Write-Host "Restore cancelled. Nothing was changed."
  exit 0
}

Set-Location $projectRoot
& node.exe "scripts/restore.mjs" $selected.FullName
exit $LASTEXITCODE
