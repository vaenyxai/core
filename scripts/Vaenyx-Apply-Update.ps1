# Applies a verified staged update as one code + SQLite transaction.
# Called only while the production server is stopped. Windows PowerShell 5.1,
# ASCII only (see Vaenyx-Setup.ps1 for why).
[CmdletBinding()]
param(
  [switch]$SelfTest,
  [string]$RootOverride
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$PreservedFolders = @("userdata", "private", "node_modules", "release", ".git")
$PackageFolders = @("apps", "packages", "scripts", "docs", "sample-library", "tests", ".github")
$RequiredPackageEntries = @(
  "package.json",
  "package-lock.json",
  "apps\server\src",
  "apps\server\migrations",
  "Vaenyx-Service-Run.cmd"
)
$RequiredBuildEntries = @("apps\server\dist\index.js", "apps\web\dist\index.html")

function Write-JsonFile {
  param([string]$Path, [object]$Value)
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  $temporary = "$Path.tmp-$PID"
  $json = $Value | ConvertTo-Json -Depth 12
  [System.IO.File]::WriteAllText($temporary, "$json`n", (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Get-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try { return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null }
}

function Get-PendingUpdate {
  param([string]$ConfigDirectory)
  return Get-JsonFile (Join-Path $ConfigDirectory "update-pending.json")
}

function Get-AppVersion {
  param([string]$Root)
  $config = Join-Path $Root "apps\server\src\config.ts"
  if (-not (Test-Path $config)) { return "unknown" }
  $match = Select-String -LiteralPath $config -Pattern 'version:\s*"([^"]+)"' | Select-Object -First 1
  if ($match -and $match.Matches.Count -gt 0) { return $match.Matches[0].Groups[1].Value }
  return "unknown"
}

function Test-ProcessAlive {
  param([int]$ProcessId)
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Acquire-InstanceLock {
  param([string]$Path, [string]$Role)
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  for ($attempt = 0; $attempt -lt 4; $attempt++) {
    $token = [guid]::NewGuid().ToString("N")
    try {
      $stream = New-Object System.IO.FileStream(
        $Path,
        [System.IO.FileMode]::CreateNew,
        [System.IO.FileAccess]::Write,
        [System.IO.FileShare]::None
      )
      try {
        $owner = [ordered]@{
          version = 1
          pid = $PID
          role = $Role
          token = $token
          createdAt = (Get-Date).ToUniversalTime().ToString("o")
        }
        $bytes = (New-Object System.Text.UTF8Encoding($false)).GetBytes(($owner | ConvertTo-Json -Compress) + "`n")
        $stream.Write($bytes, 0, $bytes.Length)
      } finally {
        $stream.Dispose()
      }
      return [pscustomobject]@{ Path = $Path; Token = $token }
    } catch [System.IO.IOException] {
      $owner = Get-JsonFile $Path
      if ($owner -and $owner.pid -and (Test-ProcessAlive ([int]$owner.pid))) {
        throw "Vaenyx is already running or updating. Close the other Vaenyx window and try again."
      }
      $stale = "$Path.stale-$PID-$([guid]::NewGuid().ToString('N'))"
      try {
        Move-Item -LiteralPath $Path -Destination $stale -ErrorAction Stop
        Remove-Item -LiteralPath $stale -Force -ErrorAction SilentlyContinue
      } catch {
        if (Test-Path $Path) { continue }
      }
    }
  }
  throw "Vaenyx is already running or updating. Close the other Vaenyx window and try again."
}

function Release-InstanceLock {
  param([object]$Lock)
  if (-not $Lock) { return }
  $owner = Get-JsonFile $Lock.Path
  if ($owner -and $owner.token -eq $Lock.Token) {
    Remove-Item -LiteralPath $Lock.Path -Force -ErrorAction SilentlyContinue
  }
}

function Resolve-NodeExecutable {
  param([string]$ConfigDirectory)
  $recorded = Join-Path $ConfigDirectory "node-path"
  if (Test-Path $recorded) {
    $candidate = (Get-Content -LiteralPath $recorded -Raw).Trim()
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  $installed = Join-Path $env:ProgramFiles "nodejs\node.exe"
  if (Test-Path $installed) { return $installed }
  $command = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  throw "Node.js 24 or newer was not found."
}

function Copy-PackageTree {
  param([string]$From, [string]$To, [switch]$IncludeBuild)
  foreach ($folder in $PackageFolders) {
    $sourceFolder = Join-Path $From $folder
    $targetFolder = Join-Path $To $folder
    if (Test-Path $sourceFolder) {
      if ($IncludeBuild) {
        & robocopy $sourceFolder $targetFolder /MIR /NFL /NDL /NJH /NJS /NP /XD node_modules | Out-Null
      } else {
        & robocopy $sourceFolder $targetFolder /MIR /NFL /NDL /NJH /NJS /NP /XD node_modules dist | Out-Null
      }
      if ($LASTEXITCODE -ge 8) { throw "could not copy $folder (robocopy $LASTEXITCODE)" }
    } elseif (Test-Path $targetFolder) {
      Remove-Item -LiteralPath $targetFolder -Recurse -Force
    }
  }
  & robocopy $From $To /LEV:1 /NFL /NDL /NJH /NJS /NP /XF ".env" | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "could not copy top-level package files (robocopy $LASTEXITCODE)" }
}

function Take-CodeSnapshot {
  param([string]$Root, [string]$Destination)
  if (Test-Path $Destination) { Remove-Item -LiteralPath $Destination -Recurse -Force }
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  & robocopy $Root $Destination /E /NFL /NDL /NJH /NJS /NP /XD @PreservedFolders | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "could not take the application rollback snapshot (robocopy $LASTEXITCODE)" }
}

function Invoke-NpmBuild {
  param([string]$Root, [string]$Log)
  Push-Location $Root
  try {
    foreach ($step in @("ci", "run build")) {
      Write-Log "Running npm $step ..."
      cmd.exe /d /s /c "npm $step >> `"$Log`" 2>&1"
      if ($LASTEXITCODE -ne 0) { throw "npm $step failed (see update.log)" }
    }
  } finally { Pop-Location }
}

function Invoke-DatabaseCommand {
  param([string]$Command, [string]$TransactionFile)
  Push-Location $script:root
  try {
    & $script:nodeExe "scripts\Vaenyx-Update-Database.mjs" $Command $TransactionFile
    if ($LASTEXITCODE -ne 0) { throw "database update step '$Command' failed" }
  } finally { Pop-Location }
}

function Set-TransactionPhase {
  param([object]$Context, [string]$Phase)
  $Context.phase = $Phase
  $Context.updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  Write-JsonFile $script:transactionFile $Context
}

function Start-HealthProbe {
  param([string]$DataDirectory, [string]$ExpectedVersion, [string]$Name)
  $port = Get-Random -Minimum 33000 -Maximum 39000
  $probeRoot = Join-Path $script:rollback $Name
  $probeConfig = Join-Path $probeRoot "config"
  New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $probeConfig -Force | Out-Null
  $saved = @{}
  $values = [ordered]@{
    NODE_ENV = "production"
    VAENYX_HOST = "127.0.0.1"
    VAENYX_PORT = [string]$port
    VAENYX_LOG_LEVEL = "warn"
    VAENYX_DATA_DIR = $DataDirectory
    VAENYX_BACKUPS_DIR = (Join-Path $probeRoot "backups")
    VAENYX_LIBRARY_DIR = (Join-Path $probeRoot "library\methods")
    VAENYX_ROUTINES_DIR = (Join-Path $probeRoot "library\routines")
    VAENYX_SECRETS_DIR = (Join-Path $probeRoot "secrets")
    VAENYX_INSTANCE_LOCK_PATH = $script:lockPath
    VAENYX_INSTANCE_LOCK_TOKEN = $script:lock.Token
    VAENYX_UPDATE_PROBE = "1"
    VAENYX_UPDATE_PROBE_NAME = $Name
  }
  foreach ($nameKey in $values.Keys) {
    $saved[$nameKey] = [Environment]::GetEnvironmentVariable($nameKey, "Process")
    [Environment]::SetEnvironmentVariable($nameKey, $values[$nameKey], "Process")
  }
  try {
    $process = Start-Process -FilePath $script:nodeExe `
      -ArgumentList "apps\server\dist\index.js" `
      -WorkingDirectory $script:root `
      -RedirectStandardOutput (Join-Path $probeRoot "server.out.log") `
      -RedirectStandardError (Join-Path $probeRoot "server.error.log") `
      -WindowStyle Hidden -PassThru
  } finally {
    foreach ($nameKey in $values.Keys) {
      [Environment]::SetEnvironmentVariable($nameKey, $saved[$nameKey], "Process")
    }
  }
  $startedProbe = [pscustomobject]@{ Process = $process; DataDirectory = $DataDirectory }
  try {
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
      if ($process.HasExited) { throw "$Name server exited before its health check passed" }
      try {
        $status = Invoke-RestMethod -Uri "http://127.0.0.1:$port/v1/system/status" -TimeoutSec 2
        if (
          $status.name -eq "Vaenyx" -and
          $status.status -eq "ready" -and
          $status.database.status -eq "ready" -and
          $status.version -eq $ExpectedVersion
        ) {
          if ($env:VAENYX_UPDATE_FAULT -eq "health-check" -and $Name -eq "candidate") {
            throw "Injected candidate health-check failure."
          }
          return $startedProbe
        }
      } catch {
        if ($_.Exception.Message -like "Injected*") { throw }
      }
      Start-Sleep -Milliseconds 500
    }
    throw "$Name server did not pass its database-backed health check"
  } catch {
    $probeFailure = $_.Exception
    try { Stop-HealthProbe $startedProbe } catch { }
    throw $probeFailure
  }
}

function Stop-HealthProbe {
  param([object]$Probe)
  if (-not $Probe -or -not $Probe.Process -or $Probe.Process.HasExited) { return }
  $flagDirectory = Join-Path (Split-Path -Parent $Probe.DataDirectory) "config"
  New-Item -ItemType Directory -Path $flagDirectory -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $flagDirectory "restart-requested.flag") -Value "update-probe" -Encoding ASCII
  if (-not $Probe.Process.WaitForExit(15000)) {
    Stop-Process -Id $Probe.Process.Id -Force -ErrorAction SilentlyContinue
    $Probe.Process.WaitForExit(5000) | Out-Null
    throw "health probe did not close its database handle cleanly"
  }
}

function Write-OwnerResult {
  param([string]$Phase, [string]$Message, [string]$Version)
  Write-JsonFile $script:resultFile ([ordered]@{
    phase = $Phase
    message = $Message
    version = $Version
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
  })
}

if ($SelfTest) {
  $failures = 0
  function Assert-True {
    param([bool]$Condition, [string]$What)
    if ($Condition) { Write-Host "  ok   $What" -ForegroundColor Green }
    else { Write-Host "  FAIL $What" -ForegroundColor Red; $script:failures++ }
  }
  Write-Host "Vaenyx Apply-Update - self test"
  $temporary = Join-Path ([System.IO.Path]::GetTempPath()) ("vx-apply-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temporary -Force | Out-Null
  Assert-True ($null -eq (Get-PendingUpdate $temporary)) "no pending file means nothing to do"
  Write-JsonFile (Join-Path $temporary "update-pending.json") @{ version = "9.9.9"; source = "C:\nope" }
  Assert-True ((Get-PendingUpdate $temporary).version -eq "9.9.9") "pending metadata round-trips"
  $first = Acquire-InstanceLock (Join-Path $temporary "instance.lock.json") "self-test"
  $secondBlocked = $false
  try { Acquire-InstanceLock $first.Path "second" | Out-Null } catch { $secondBlocked = $true }
  Assert-True $secondBlocked "a second process cannot take the live lock"
  Release-InstanceLock $first
  Assert-True (-not (Test-Path $first.Path)) "the owner releases its lock"
  Assert-True ($PreservedFolders -contains "userdata") "userdata is never mirrored as application code"
  Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
  if ($failures -gt 0) { exit 1 }
  Write-Host "All self-test checks passed." -ForegroundColor Green
  exit 0
}

if ($RootOverride -and $env:VAENYX_UPDATE_TEST_ROOT -ne "1") {
  throw "RootOverride is available only to the isolated update rehearsal."
}
$script:root = if ($RootOverride) { (Resolve-Path $RootOverride).Path } else { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }
$script:configDirectory = Join-Path $root "userdata\config"
$script:pendingFile = Join-Path $configDirectory "update-pending.json"
$script:transactionFile = Join-Path $configDirectory "update-transaction.json"
$script:resultFile = Join-Path $configDirectory "update-result.json"
$script:lockPath = Join-Path $configDirectory "instance.lock.json"
$script:logDirectory = Join-Path $root "userdata\logs"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$script:log = Join-Path $logDirectory "update.log"
function Write-Log {
  param([string]$Text)
  $line = "$(Get-Date -Format s)  $Text"
  Write-Host $line
  Add-Content -LiteralPath $log -Value $line
}

if (Test-Path (Join-Path $root ".git")) {
  Write-Log "Skipped: this is a git checkout, which updates with git pull."
  Remove-Item -LiteralPath $pendingFile -Force -ErrorAction SilentlyContinue
  exit 0
}

$script:nodeExe = Resolve-NodeExecutable $configDirectory
$script:lock = $null
$script:exitCode = 0
$probe = $null
try {
  $script:lock = Acquire-InstanceLock $lockPath "updater"
} catch {
  Write-Log "Update deferred: another Vaenyx process owns the update lock. The pending update was kept for the next automatic retry."
  exit 1
}
try {
  $env:VAENYX_INSTANCE_LOCK_TOKEN = $lock.Token
  $env:VAENYX_INSTANCE_LOCK_PATH = $lockPath
  $env:VAENYX_DATA_DIR = Join-Path $root "userdata\db"

  $interrupted = Get-JsonFile $transactionFile
  if ($interrupted) {
    $script:rollback = $interrupted.rollbackRoot
    Write-Log "Recovering interrupted update $($interrupted.transactionId)."
    Copy-PackageTree $interrupted.codeRollback $root -IncludeBuild
    Invoke-NpmBuild $root $log
    Invoke-DatabaseCommand "recover" $transactionFile
    $probe = Start-HealthProbe $interrupted.liveDataDirectory $interrupted.previousVersion "rollback"
    if ($env:VAENYX_UPDATE_FAULT -eq "rollback-startup") { throw "Injected rollback startup failure." }
    Stop-HealthProbe $probe
    $probe = $null
    Write-OwnerResult "rolled-back" "The update was interrupted, so Vaenyx restored the previous version and your data automatically." $interrupted.previousVersion
    Remove-Item -LiteralPath $pendingFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $interrupted.switchJournalPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $transactionFile -Force -ErrorAction SilentlyContinue
    if (Test-Path $interrupted.updatesRoot) { Remove-Item -LiteralPath $interrupted.updatesRoot -Recurse -Force }
    Write-Log "Interrupted update recovered; the previous version passed health."
    exit 0
  }

  $pending = Get-PendingUpdate $configDirectory
  if (-not $pending) { exit 0 }
  $source = [string]$pending.source
  if (-not $source -or -not (Test-Path $source)) { throw "the staged update files are missing" }
  foreach ($needed in $RequiredPackageEntries) {
    if (-not (Test-Path (Join-Path $source $needed))) { throw "the staged package has no $needed" }
  }

  $updatesRoot = Join-Path $root "userdata\updates"
  $transactionId = [guid]::NewGuid().ToString("N")
  $script:rollback = Join-Path $updatesRoot "rollback"
  $codeRollback = Join-Path $rollback "code"
  $liveData = Join-Path $root "userdata\db"
  $previousVersion = Get-AppVersion $root
  $targetVersion = [string]$pending.version
  $context = [pscustomobject][ordered]@{
    version = 1
    transactionId = $transactionId
    phase = "preparing"
    previousVersion = $previousVersion
    targetVersion = $targetVersion
    root = $root
    updatesRoot = $updatesRoot
    rollbackRoot = $rollback
    codeRollback = $codeRollback
    liveDataDirectory = $liveData
    liveDatabase = (Join-Path $liveData "vaenyx.db")
    snapshotDatabase = (Join-Path $rollback "snapshot\vaenyx.db")
    candidateDatabase = (Join-Path $rollback "candidate\db\vaenyx.db")
    oldFamilyDatabase = (Join-Path $rollback "live-family\vaenyx.db")
    manifestPath = (Join-Path $rollback "manifest.json")
    switchJournalPath = (Join-Path $configDirectory "update-switch.json")
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  }

  Write-Log "Preparing update $targetVersion as transaction $transactionId."
  if (Test-Path $rollback) { Remove-Item -LiteralPath $rollback -Recurse -Force }
  Take-CodeSnapshot $root $codeRollback
  Write-JsonFile $transactionFile $context
  Invoke-DatabaseCommand "snapshot" $transactionFile
  Set-TransactionPhase $context "snapshotted"
  Write-Log "Application and database rollback snapshots are verified."

  Copy-PackageTree $source $root
  Invoke-NpmBuild $root $log
  foreach ($artefact in $RequiredBuildEntries) {
    if (-not (Test-Path (Join-Path $root $artefact))) { throw "missing $artefact after the build" }
  }
  $builtVersion = Get-AppVersion $root
  if ($builtVersion -ne $targetVersion) { throw "built version $builtVersion does not match staged version $targetVersion" }
  Set-TransactionPhase $context "code-built"

  $candidateData = Split-Path -Parent $context.candidateDatabase
  $probe = Start-HealthProbe $candidateData $targetVersion "candidate"
  Stop-HealthProbe $probe
  $probe = $null
  Invoke-DatabaseCommand "validate-candidate" $transactionFile
  Set-TransactionPhase $context "candidate-verified"
  Write-Log "Candidate migrations, startup, integrity, foreign keys and health passed."

  Invoke-DatabaseCommand "switch" $transactionFile
  Set-TransactionPhase $context "database-switched"
  $probe = Start-HealthProbe $liveData $targetVersion "replacement"
  Stop-HealthProbe $probe
  $probe = $null
  Invoke-DatabaseCommand "commit" $transactionFile
  Set-TransactionPhase $context "committed"
  Write-OwnerResult "success" "Vaenyx updated successfully. Your database was verified before the new version went live." $targetVersion
  Write-Log "Update $targetVersion committed after post-switch database health passed."

  Remove-Item -LiteralPath $pendingFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $context.switchJournalPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $transactionFile -Force -ErrorAction SilentlyContinue
  if (Test-Path $updatesRoot) { Remove-Item -LiteralPath $updatesRoot -Recurse -Force }
} catch {
  $failure = $_.Exception.Message
  Write-Log "Update FAILED: $failure"
  try { Stop-HealthProbe $probe } catch { Write-Log "Probe cleanup failed: $($_.Exception.Message)" }
  $context = Get-JsonFile $transactionFile
  if ($context -and (Test-Path $context.codeRollback)) {
    try {
      Write-Log "Restoring the previous application and database..."
      Copy-PackageTree $context.codeRollback $root -IncludeBuild
      Invoke-NpmBuild $root $log
      Invoke-DatabaseCommand "rollback" $transactionFile
      $probe = Start-HealthProbe $context.liveDataDirectory $context.previousVersion "rollback"
      if ($env:VAENYX_UPDATE_FAULT -eq "rollback-startup") { throw "Injected rollback startup failure." }
      Stop-HealthProbe $probe
      $probe = $null
      Write-OwnerResult "rolled-back" "The update could not be installed, so Vaenyx restored the previous version and your data automatically." $context.previousVersion
      Remove-Item -LiteralPath $context.switchJournalPath -Force -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath $transactionFile -Force -ErrorAction SilentlyContinue
      Remove-Item -LiteralPath $pendingFile -Force -ErrorAction SilentlyContinue
      if (Test-Path $context.updatesRoot) { Remove-Item -LiteralPath $context.updatesRoot -Recurse -Force }
      Write-Log "Rollback passed database-backed startup health."
    } catch {
      Write-Log "ROLLBACK STARTUP FAILED: $($_.Exception.Message). Rollback material was kept at $($context.rollbackRoot)."
      Write-OwnerResult "error" "Vaenyx could not finish the update recovery automatically. The recovery files were kept for support." $context.previousVersion
      $script:exitCode = 1
    }
  } else {
    Write-OwnerResult "rolled-back" "The update was rejected before anything changed. Vaenyx kept the previous version and your data." (Get-AppVersion $root)
    Remove-Item -LiteralPath $pendingFile -Force -ErrorAction SilentlyContinue
  }
} finally {
  Release-InstanceLock $script:lock
}
exit $script:exitCode
