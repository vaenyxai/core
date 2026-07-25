# Vaenyx one-shot setup (onboarding spec section 3 v1).
#
# The whole install in one double-click: check the machine, install Node if it
# is missing, fetch dependencies, build, register the autostart watchdog, start
# Vaenyx and open the first-run wizard.
#
# Written for Windows PowerShell 5.1 (the powershell.exe every Windows box has)
# - no ternaries, no ?? operator, no PS7-only cmdlets.
#
# Switches exist so the risky steps can be exercised in isolation during
# testing: -SkipAutostart (no scheduled task), -SkipNodeInstall (never touch
# the machine's Node), -Port (run beside a live instance), -SelfTest (assert
# the pure helpers and exit).
[CmdletBinding()]
param(
  [switch]$SkipAutostart,
  [switch]$SkipNodeInstall,
  [switch]$NoBrowser,
  [int]$Port = 3000,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Node 24 is not a preference: the server stores everything in the built-in
# node:sqlite module, which does not exist before it.
$MinimumNodeMajor = 24
$MinimumNpmMajor = 11
# Used when nodejs.org cannot be reached but a download is still wanted.
$FallbackNodeVersion = "v24.18.0"
$TaskName = "VaenyxAutostart"

# -- Pure helpers (covered by -SelfTest) ----

function Get-NodeMajor {
  param([string]$VersionText)
  if (-not $VersionText) { return 0 }
  $match = [regex]::Match($VersionText.Trim(), '^v?(\d+)\.')
  if (-not $match.Success) { return 0 }
  return [int]$match.Groups[1].Value
}

function Get-NodeArch {
  if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { return "arm64" }
  if ($env:PROCESSOR_ARCHITEW6432 -eq "ARM64") { return "arm64" }
  return "x64"
}

function Get-NodeMsiUrl {
  param([string]$Version, [string]$Arch)
  return "https://nodejs.org/dist/$Version/node-$Version-$Arch.msi"
}

# Returns a reason code when the install location will cause trouble, or an
# empty string when it is fine. Cloud-synced folders are the dangerous one:
# the live SQLite database (with its -wal/-shm sidecars) must never be synced.
function Get-InstallPathWarning {
  param([string]$Path)
  if (-not $Path) { return "empty" }
  if ($Path -match '(?i)[\\/](OneDrive|Dropbox|Google Drive|GoogleDrive|iCloudDrive)([\\/]|$)') {
    return "cloud-synced"
  }
  if ($Path.Length -gt 120) { return "too-long" }
  if ($Path -match '\s') { return "has-spaces" }
  return ""
}

# -- Output helpers ----

function Write-Head {
  param([string]$Text)
  Write-Host ""
  Write-Host $Text -ForegroundColor Cyan
}

function Write-Info {
  param([string]$Text)
  Write-Host "  $Text"
}

function Write-Good {
  param([string]$Text)
  Write-Host "  $Text" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Text)
  Write-Host "  $Text" -ForegroundColor Yellow
}

function Write-Bad {
  param([string]$Text)
  Write-Host "  $Text" -ForegroundColor Red
}

# -- Self test ----

if ($SelfTest) {
  $failures = 0
  function Assert-Equal {
    param($Expected, $Actual, [string]$What)
    if ("$Expected" -eq "$Actual") {
      Write-Host "  ok   $What" -ForegroundColor Green
    } else {
      Write-Host "  FAIL $What (expected '$Expected', got '$Actual')" -ForegroundColor Red
      $script:failures = $script:failures + 1
    }
  }
  Write-Head "Vaenyx Setup - self test"
  Assert-Equal 24 (Get-NodeMajor "v24.14.0") "Get-NodeMajor parses a v-prefixed version"
  Assert-Equal 20 (Get-NodeMajor "20.11.1") "Get-NodeMajor parses a bare version"
  Assert-Equal 0 (Get-NodeMajor "") "Get-NodeMajor treats empty as 0"
  Assert-Equal 0 (Get-NodeMajor "not a version") "Get-NodeMajor treats junk as 0"
  Assert-Equal 0 (Get-NodeMajor $null) "Get-NodeMajor treats null as 0"
  Assert-Equal "https://nodejs.org/dist/v24.18.0/node-v24.18.0-x64.msi" (Get-NodeMsiUrl "v24.18.0" "x64") "Get-NodeMsiUrl builds the official x64 URL"
  Assert-Equal "https://nodejs.org/dist/v24.18.0/node-v24.18.0-arm64.msi" (Get-NodeMsiUrl "v24.18.0" "arm64") "Get-NodeMsiUrl builds the official arm64 URL"
  Assert-Equal "cloud-synced" (Get-InstallPathWarning "C:\Users\a\OneDrive\Vaenyx") "OneDrive path is refused"
  Assert-Equal "cloud-synced" (Get-InstallPathWarning "C:\Users\a\Google Drive\Vaenyx") "Google Drive path is refused"
  Assert-Equal "" (Get-InstallPathWarning "C:\Vaenyx") "a short plain path is fine"
  Assert-Equal "has-spaces" (Get-InstallPathWarning "C:\Program Files\Vaenyx") "a path with spaces is flagged"
  Assert-Equal "too-long" (Get-InstallPathWarning ("C:\" + ("x" * 130))) "an over-long path is flagged"
  Write-Host ""
  if ($failures -gt 0) {
    Write-Bad "$failures self-test check(s) failed."
    exit 1
  }
  Write-Good "All self-test checks passed."
  exit 0
}

# -- 0. Where are we ----

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host ""
Write-Host "  Vaenyx Setup" -ForegroundColor White
Write-Host "  Your own private AI, running on this computer." -ForegroundColor DarkGray
Write-Host "  Folder: $root" -ForegroundColor DarkGray

if (-not (Test-Path (Join-Path $root "apps\server\package.json"))) {
  Write-Bad "This does not look like a Vaenyx folder (apps\server is missing)."
  Write-Info "Unzip the whole download and run Vaenyx-Setup.cmd from inside it."
  exit 1
}

$logDirectory = Join-Path $root "userdata\logs"
if (-not (Test-Path $logDirectory)) {
  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
}
$setupLog = Join-Path $logDirectory "setup.log"
try { Start-Transcript -Path $setupLog -Append | Out-Null } catch { }

$failed = $false
try {
  # Files that arrive inside a downloaded zip are marked "from the internet"
  # and PowerShell refuses to run them. Clear that mark on our own scripts.
  Write-Head "[1/6] Checking this computer"
  try {
    Get-ChildItem -Path $root -Filter *.cmd -File | Unblock-File -ErrorAction SilentlyContinue
    Get-ChildItem -Path (Join-Path $root "scripts") -File | Unblock-File -ErrorAction SilentlyContinue
    Write-Good "Downloaded files unblocked."
  } catch {
    Write-Warn "Could not unblock the downloaded files; continuing."
  }

  $pathWarning = Get-InstallPathWarning $root
  if ($pathWarning -eq "cloud-synced") {
    Write-Bad "This folder is inside a cloud-synced drive (OneDrive/Dropbox/Google Drive)."
    Write-Info "Vaenyx keeps a live database here; cloud sync will corrupt it."
    Write-Info "Move the folder somewhere like C:\Vaenyx and run this again."
    throw "cloud-synced install path"
  }
  if ($pathWarning -eq "too-long") {
    Write-Bad "This folder path is very long, which breaks the install on Windows."
    Write-Info "Move the folder somewhere short, like C:\Vaenyx, and run this again."
    throw "install path too long"
  }
  if ($pathWarning -eq "has-spaces") {
    Write-Warn "This folder path contains spaces. It usually works, but C:\Vaenyx is safer."
  }

  $windows = [Environment]::OSVersion.Version
  Write-Info "Windows $($windows.Major).$($windows.Minor) build $($windows.Build), $(Get-NodeArch)."
  if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    Write-Warn "Windows curl.exe was not found; Vaenyx-Start.cmd needs it later."
  }

  if (Get-Command node.exe -ErrorAction SilentlyContinue) {
    $nodeVersionText = & node.exe --version
    Write-Info "Node.js found: $nodeVersionText"
  } else {
    $nodeVersionText = ""
    Write-Info "Node.js is not installed yet."
  }
  $nodeMajor = Get-NodeMajor $nodeVersionText

  # -- 1. Node ----
  Write-Head "[2/6] Making sure Node.js $MinimumNodeMajor or newer is installed"
  if ($nodeMajor -ge $MinimumNodeMajor) {
    Write-Good "Node.js $nodeVersionText is new enough."
  } elseif ($SkipNodeInstall) {
    Write-Bad "Node.js $MinimumNodeMajor or newer is required and -SkipNodeInstall was passed."
    throw "node too old and install skipped"
  } else {
    if ($nodeMajor -gt 0) {
      Write-Info "Node.js $nodeVersionText is too old. Vaenyx needs $MinimumNodeMajor or newer."
    }
    Write-Info "Installing the official Node.js LTS. Windows will ask for permission."

    $installed = $false
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
      Write-Info "Using the Windows package manager (winget)..."
      try {
        $wingetArguments = "install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements"
        $wingetProcess = Start-Process -FilePath "winget.exe" -ArgumentList $wingetArguments -Verb RunAs -Wait -PassThru
        if ($wingetProcess.ExitCode -eq 0) {
          $installed = $true
          Write-Good "Node.js installed."
        } else {
          Write-Warn "winget could not install Node.js (code $($wingetProcess.ExitCode)); trying the direct download."
        }
      } catch {
        Write-Warn "winget was cancelled or unavailable; trying the direct download."
      }
    }

    if (-not $installed) {
      $nodeVersion = $FallbackNodeVersion
      try {
        $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 30 -UseBasicParsing
        $latest = $index | Where-Object { $_.version -like "v$MinimumNodeMajor.*" -and $_.lts } | Select-Object -First 1
        if ($latest) { $nodeVersion = $latest.version }
      } catch {
        Write-Warn "Could not check nodejs.org for the newest version; using $FallbackNodeVersion."
      }
      $msiUrl = Get-NodeMsiUrl $nodeVersion (Get-NodeArch)
      $msiPath = Join-Path $env:TEMP "node-$nodeVersion-$(Get-NodeArch).msi"
      Write-Info "Downloading Node.js $nodeVersion (about 30 MB)..."
      try {
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing -TimeoutSec 600
      } catch {
        Write-Bad "The Node.js download failed. Check the internet connection and run this again."
        throw "node download failed"
      }
      Write-Info "Installing Node.js. Windows will ask for permission..."
      try {
        $msiProcess = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$msiPath`" /qn /norestart" -Verb RunAs -Wait -PassThru
        if ($msiProcess.ExitCode -ne 0) {
          Write-Bad "The Node.js installer stopped with code $($msiProcess.ExitCode)."
          throw "node install failed"
        }
      } catch {
        Write-Bad "Node.js could not be installed (permission was declined, or the installer failed)."
        Write-Info "You can install it yourself from https://nodejs.org and run this again."
        throw "node install failed"
      }
      Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
      Write-Good "Node.js installed."
    }

    # A fresh install is not on this window's PATH yet - reload it.
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
  }

  # Resolve the exact executables everything below uses, so a just-installed
  # Node is picked up even if PATH is still stale.
  $nodeExe = $null
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($nodeCommand) { $nodeExe = $nodeCommand.Source }
  if (-not $nodeExe) {
    foreach ($candidate in @(
        (Join-Path $env:ProgramFiles "nodejs\node.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\nodejs\node.exe"))) {
      if ($candidate -and (Test-Path $candidate)) { $nodeExe = $candidate; break }
    }
  }
  if (-not $nodeExe) {
    Write-Bad "Node.js still cannot be found after installing."
    Write-Info "Restart the computer and run Vaenyx-Setup.cmd again."
    throw "node not found after install"
  }
  $npmCmd = Join-Path (Split-Path $nodeExe -Parent) "npm.cmd"
  if (-not (Test-Path $npmCmd)) {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCommand) { $npmCmd = $npmCommand.Source }
  }
  if (-not (Test-Path $npmCmd)) {
    Write-Bad "npm was not found next to Node.js."
    throw "npm not found"
  }

  $finalNodeVersion = & $nodeExe --version
  $finalNodeMajor = Get-NodeMajor $finalNodeVersion
  if ($finalNodeMajor -lt $MinimumNodeMajor) {
    Write-Bad "Node.js $finalNodeVersion is still too old (need $MinimumNodeMajor or newer)."
    throw "node too old"
  }
  $npmVersion = & $npmCmd --version
  if ((Get-NodeMajor $npmVersion) -lt $MinimumNpmMajor) {
    Write-Bad "npm $npmVersion is too old (need $MinimumNpmMajor or newer)."
    Write-Info "Installing the current Node.js LTS from https://nodejs.org fixes this."
    throw "npm too old"
  }
  Write-Good "Using Node.js $finalNodeVersion with npm $npmVersion."

  # -- 2. Dependencies ----
  Write-Head "[3/6] Downloading what Vaenyx needs (a few minutes on first run)"
  & $npmCmd ci
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "That did not finish. Trying once more..."
    & $npmCmd ci
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Bad "The download failed twice."
    Write-Info "This step needs a working internet connection. Check it and run Vaenyx-Setup.cmd again."
    Write-Info "The full log is at $setupLog"
    throw "npm ci failed"
  }
  Write-Good "Everything downloaded."

  # -- 3. Build ----
  Write-Head "[4/6] Preparing Vaenyx"
  & $npmCmd run build
  if ($LASTEXITCODE -ne 0) {
    Write-Bad "Vaenyx could not be prepared."
    Write-Info "The full log is at $setupLog"
    throw "build failed"
  }
  Write-Good "Ready to run."

  # -- 4. Autostart ----
  Write-Head "[5/6] Starting Vaenyx with Windows"
  $autostartRegistered = $false
  if ($SkipAutostart) {
    Write-Info "Skipped (asked for with -SkipAutostart)."
  } else {
    $runner = Join-Path $root "Vaenyx-Service-Run.cmd"
    if (-not (Test-Path $runner)) {
      Write-Warn "Vaenyx-Service-Run.cmd is missing; skipping the autostart step."
    } else {
      Write-Info "Windows will ask for permission once - this is the only step that needs it."
      Write-Info "It registers Vaenyx to start with the computer and restart itself if it stops."
      # Single-quoted concatenation on purpose: the schtasks /TR value needs
      # literal \" escapes, and building that inside a double-quoted
      # PowerShell string is where quoting goes to die.
      $schtasksArguments = '/c schtasks /Create /TN "' + $TaskName +
        '" /TR "cmd /c \"' + $runner + '\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F' +
        ' && schtasks /Run /TN "' + $TaskName + '"'
      try {
        $taskProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $schtasksArguments -Verb RunAs -Wait -PassThru
        if ($taskProcess.ExitCode -eq 0) {
          $autostartRegistered = $true
          Write-Good "Vaenyx will now start with Windows."
        } else {
          Write-Warn "The autostart step did not finish (code $($taskProcess.ExitCode))."
          Write-Info "Vaenyx still works - start it with Vaenyx-Start.cmd."
        }
      } catch {
        Write-Warn "Permission was declined, so Vaenyx will not start with Windows."
        Write-Info "You can set that up later by right-clicking Vaenyx-Install-Autostart.cmd and choosing Run as administrator."
      }
    }
  }

  # -- 5. Start + open ----
  Write-Head "[6/6] Starting Vaenyx"
  $statusUrl = "http://127.0.0.1:$Port/v1/system/status"

  function Test-VaenyxUp {
    param([string]$Url)
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
      return ($response.StatusCode -eq 200)
    } catch {
      return $false
    }
  }

  if (Test-VaenyxUp $statusUrl) {
    Write-Good "Vaenyx is already running."
  } else {
    if (-not $autostartRegistered) {
      # No watchdog (skipped or declined): start the server directly, the same
      # way Vaenyx-Start.cmd does.
      $env:NODE_ENV = "production"
      $env:VAENYX_HOST = "127.0.0.1"
      $env:VAENYX_PORT = "$Port"
      $env:VAENYX_LOG_LEVEL = "info"
      $env:VAENYX_DATA_DIR = Join-Path $root "userdata\db"
      $env:VAENYX_BACKUPS_DIR = Join-Path $root "userdata\backups"
      $env:VAENYX_LIBRARY_DIR = Join-Path $root "userdata\library\methods"
      $env:VAENYX_ROUTINES_DIR = Join-Path $root "userdata\library\routines"
      foreach ($needed in @($env:VAENYX_DATA_DIR, $env:VAENYX_BACKUPS_DIR)) {
        if (-not (Test-Path $needed)) {
          New-Item -ItemType Directory -Path $needed -Force | Out-Null
        }
      }
      # Absolute path on purpose: Vaenyx-Stop.ps1 and the diagnose script find
      # the running server by looking for the project root inside the process
      # command line. A relative argument makes this instance invisible to
      # them (found while testing the setup end to end).
      $serverEntry = Join-Path $root "apps\server\dist\index.js"
      Start-Process -FilePath $nodeExe `
        -ArgumentList "`"$serverEntry`"" `
        -WorkingDirectory $root `
        -WindowStyle Minimized `
        -RedirectStandardOutput (Join-Path $logDirectory "vaenyx.log") `
        -RedirectStandardError (Join-Path $logDirectory "vaenyx-error.log") | Out-Null
    }

    $ready = $false
    for ($attempt = 1; $attempt -le 40; $attempt++) {
      Start-Sleep -Seconds 2
      if (Test-VaenyxUp $statusUrl) { $ready = $true; break }
    }
    if ($ready) {
      Write-Good "Vaenyx is running."
    } else {
      Write-Bad "Vaenyx did not start."
      Write-Info "Look at $logDirectory\vaenyx-error.log, or run Vaenyx-Diagnose.cmd."
      throw "server did not become ready"
    }
  }

  $appUrl = "http://localhost:$Port"
  if (-not $NoBrowser) {
    try { Start-Process $appUrl | Out-Null } catch { }
  }

  Write-Host ""
  Write-Host "  Vaenyx is ready." -ForegroundColor Green
  Write-Host "  Open $appUrl in your browser and follow the short setup." -ForegroundColor White
  if (-not $autostartRegistered -and -not $SkipAutostart) {
    Write-Host "  Note: Vaenyx will not start with Windows yet." -ForegroundColor Yellow
  }
  Write-Host ""
} catch {
  $failed = $true
  Write-Host ""
  Write-Bad "Setup stopped: $($_.Exception.Message)"
  Write-Info "The full log is at $setupLog"
  Write-Host ""
} finally {
  try { Stop-Transcript | Out-Null } catch { }
}

if ($failed) { exit 1 }
exit 0
