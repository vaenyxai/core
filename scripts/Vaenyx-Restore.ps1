$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupRoots = @(
  (Join-Path $projectRoot "private\backups"),
  (Join-Path $projectRoot "backups")
)

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
        Where-Object { Test-Path (Join-Path $_.FullName "vaenyx.db") }
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
