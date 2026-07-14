param(
  [switch]$CheckOnly,
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$expectedCodexPath = Join-Path $env:APPDATA `
  "npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe"
$sandboxSetupSource = Join-Path (Split-Path $expectedCodexPath -Parent) `
  "..\codex-resources\codex-windows-sandbox-setup.exe"
$desktopBinPath = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin"
$configPath = Join-Path $env:USERPROFILE ".codex\config.toml"
$nativeHostPaths = @(
  (Join-Path $env:LOCALAPPDATA "OpenAI\Codex\chrome-native-hosts-v2.json"),
  (Join-Path $env:USERPROFILE ".codex\chrome-native-hosts-v2.json")
)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$changed = $false
$mismatch = $false

function Write-VaenyxStatus {
  param([string]$Message)
  if (-not $Quiet) { Write-Host $Message }
}

function Backup-VaenyxConfig {
  param([string]$Path)
  $backupPath = "$Path.vaenyx-backup-$timestamp"
  Copy-Item -LiteralPath $Path -Destination $backupPath
  Write-VaenyxStatus "Backup created: $backupPath"
}

function Write-VaenyxUtf8File {
  param(
    [string]$Path,
    [string]$Content
  )
  $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8WithoutBom)
}

function Test-VaenyxSandboxSetupLaunch {
  param([string]$Path)

  try {
    $process = Start-Process `
      -FilePath $Path `
      -PassThru `
      -Wait
    return $true
  } catch {
    Write-VaenyxStatus "[FAIL] Sandbox setup cannot launch without elevation: $Path"
    Write-VaenyxStatus "       $($_.Exception.Message)"
    return $false
  }
}

if (-not (Test-Path -LiteralPath $expectedCodexPath)) {
  Write-VaenyxStatus "[SKIP] Independent Codex CLI is not installed."
  exit 0
}

$signature = Get-AuthenticodeSignature -LiteralPath $expectedCodexPath
if (
  $signature.Status -ne "Valid" -or
  $signature.SignerCertificate.Subject -notmatch "OpenAI"
) {
  Write-Error "Independent Codex CLI does not have a valid OpenAI signature. No configuration was changed."
  exit 1
}

$sandboxSetupSource = (Resolve-Path -LiteralPath $sandboxSetupSource).Path
$sandboxSourceSignature = Get-AuthenticodeSignature -LiteralPath $sandboxSetupSource
if (
  $sandboxSourceSignature.Status -ne "Valid" -or
  $sandboxSourceSignature.SignerCertificate.Subject -notmatch "OpenAI"
) {
  Write-Error "Independent Codex sandbox setup does not have a valid OpenAI signature. No configuration was changed."
  exit 1
}
$sandboxSourceHash = (Get-FileHash -LiteralPath $sandboxSetupSource -Algorithm SHA256).Hash

if (Test-Path -LiteralPath $desktopBinPath) {
  $desktopDirectories = Get-ChildItem -LiteralPath $desktopBinPath -Directory
  foreach ($directory in $desktopDirectories) {
    $desktopCodex = Join-Path $directory.FullName "codex.exe"
    $desktopRunner = Join-Path $directory.FullName "codex-command-runner.exe"
    $desktopSetup = Join-Path $directory.FullName "codex-windows-sandbox-setup.exe"
    if (
      -not (Test-Path -LiteralPath $desktopCodex) -or
      -not (Test-Path -LiteralPath $desktopRunner) -or
      -not (Test-Path -LiteralPath $desktopSetup)
    ) {
      continue
    }

    $desktopSetupSignature = Get-AuthenticodeSignature -LiteralPath $desktopSetup
    if (
      $desktopSetupSignature.Status -ne "Valid" -or
      $desktopSetupSignature.SignerCertificate.Subject -notmatch "OpenAI"
    ) {
      Write-Error "Codex Desktop sandbox setup is not validly signed by OpenAI. No executable was changed: $desktopSetup"
      exit 1
    }

    $desktopSetupHash = (Get-FileHash -LiteralPath $desktopSetup -Algorithm SHA256).Hash
    $desktopSetupLaunches = Test-VaenyxSandboxSetupLaunch $desktopSetup
    if ($desktopSetupHash -eq $sandboxSourceHash -and $desktopSetupLaunches) {
      continue
    }

    $mismatch = $true
    if ($CheckOnly) { continue }

    Backup-VaenyxConfig $desktopSetup
    Copy-Item -LiteralPath $sandboxSetupSource -Destination $desktopSetup -Force
    $changed = $true
  }
}

foreach ($path in $nativeHostPaths) {
  if (-not (Test-Path -LiteralPath $path)) { continue }

  $document = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $incorrectEntries = @(
    $document.entries |
      Where-Object {
        $_.paths.codexCliPath -and
        $_.paths.codexCliPath -ne $expectedCodexPath
      }
  )
  if ($incorrectEntries.Count -eq 0) { continue }

  $mismatch = $true
  if ($CheckOnly) { continue }

  Backup-VaenyxConfig $path
  foreach ($entry in $incorrectEntries) {
    $entry.paths.codexCliPath = $expectedCodexPath
  }
  Write-VaenyxUtf8File $path ($document | ConvertTo-Json -Depth 20)
  $changed = $true
}

if (Test-Path -LiteralPath $configPath) {
  $content = Get-Content -LiteralPath $configPath -Raw
  $pattern = "(?m)^CODEX_CLI_PATH\s*=\s*'.*?'\s*$"
  $expectedLine = "CODEX_CLI_PATH = '$expectedCodexPath'"
  $currentLine = [regex]::Match($content, $pattern).Value

  if ($currentLine -and $currentLine -ne $expectedLine) {
    $mismatch = $true
    if (-not $CheckOnly) {
      Backup-VaenyxConfig $configPath
      $updated = [regex]::Replace($content, $pattern, $expectedLine, 1)
      Write-VaenyxUtf8File $configPath $updated
      $changed = $true
    }
  }
}

if ($CheckOnly) {
  if ($mismatch) {
    Write-VaenyxStatus "[FAIL] Codex visual sandbox configuration needs repair."
    Write-VaenyxStatus "Double-click Vaenyx-Repair-Codex-Visual.cmd."
    exit 1
  }
  Write-VaenyxStatus "[OK] Codex visual sandbox configuration."
  exit 0
}

if ($changed) {
  Write-Host "Codex visual sandbox configuration repaired."
  Write-Host "Visual checks can be retried now."
} else {
  Write-VaenyxStatus "Codex visual sandbox configuration is already correct."
}
