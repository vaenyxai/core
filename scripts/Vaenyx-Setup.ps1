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
  [switch]$SelfTest,
  # en or zh. Unset means ask; the answer also becomes the app's language.
  [string]$Language = ""
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

# ---- Language ----------------------------------------------------------
# Every user-facing line goes through Say. Keys with no Chinese entry fall
# back to English rather than printing nothing.
$Script:Lang = "en"
$Messages = @{
  "path.cloud"      = @{ en = "This folder is inside a cloud-synced drive (OneDrive/Dropbox/Google Drive)."; zh = "这个文件夹在云同步盘里(OneDrive/Dropbox/Google Drive)。" }
  "path.cloud.why"  = @{ en = "Vaenyx keeps a live database here; cloud sync will corrupt it."; zh = "Vaenyx 会在这里放一个正在使用的数据库,云同步会把它弄坏。" }
  "path.cloud.fix"  = @{ en = "Move the folder somewhere like C:\Vaenyx and run this again."; zh = "把文件夹移到 C:\Vaenyx 这类位置,然后重新运行。" }
  "path.long"       = @{ en = "This folder path is very long, which breaks the install on Windows."; zh = "这个路径太长,Windows 上会导致安装失败。" }
  "path.long.fix"   = @{ en = "Move the folder somewhere short, like C:\Vaenyx, and run this again."; zh = "把文件夹移到短一点的位置(如 C:\Vaenyx),然后重新运行。" }
  "path.spaces"     = @{ en = "This folder path contains spaces. It usually works, but C:\Vaenyx is safer."; zh = "路径里有空格。通常没问题,但放在 C:\Vaenyx 更稳妥。" }
  "notvaenyx"       = @{ en = "This does not look like a Vaenyx folder (apps\server is missing)."; zh = "这看起来不是 Vaenyx 文件夹(缺少 apps\server)。" }
  "notvaenyx.fix"   = @{ en = "Unzip the whole download and run Vaenyx-Setup.cmd from inside it."; zh = "请把下载的压缩包整个解压,再从里面运行 Vaenyx-Setup.cmd。" }
  "step1"           = @{ en = "[1/6] Checking this computer"; zh = "[1/6] 检查这台电脑" }
  "step2"           = @{ en = "[2/6] Making sure Node.js 24 or newer is installed"; zh = "[2/6] 确认已安装 Node.js 24 或更新版本" }
  "step3"           = @{ en = "[3/6] Downloading what Vaenyx needs (a few minutes on first run)"; zh = "[3/6] 下载 Vaenyx 需要的组件(首次需要几分钟)" }
  "step4"           = @{ en = "[4/6] Preparing Vaenyx"; zh = "[4/6] 准备 Vaenyx" }
  "step5"           = @{ en = "[5/6] Starting Vaenyx with Windows"; zh = "[5/6] 让 Vaenyx 随 Windows 启动" }
  "step6"           = @{ en = "[6/6] Starting Vaenyx"; zh = "[6/6] 启动 Vaenyx" }
  "unblocked"       = @{ en = "Downloaded files unblocked."; zh = "已解除下载文件的封锁。" }
  "unblock.fail"    = @{ en = "Could not unblock the downloaded files; continuing."; zh = "无法解除下载文件封锁,继续。" }
  "curl.missing"    = @{ en = "Windows curl.exe was not found; Vaenyx-Start.cmd needs it later."; zh = "没找到 Windows 自带的 curl.exe,之后 Vaenyx-Start.cmd 会用到。" }
  "node.found"      = @{ en = "Node.js found:"; zh = "已安装 Node.js:" }
  "node.missing"    = @{ en = "Node.js is not installed yet."; zh = "尚未安装 Node.js。" }
  "node.ok"         = @{ en = "Node.js is new enough."; zh = "Node.js 版本足够新。" }
  "node.old"        = @{ en = "Node.js is too old. Vaenyx needs 24 or newer."; zh = "Node.js 版本过旧,Vaenyx 需要 24 或更新。" }
  "node.install"    = @{ en = "Installing the official Node.js LTS. Windows will ask for permission."; zh = "正在安装官方的 Node.js LTS,Windows 会请求授权。" }
  "node.winget"     = @{ en = "Using the Windows package manager (winget)..."; zh = "使用 Windows 包管理器(winget)安装..." }
  "node.done"       = @{ en = "Node.js installed."; zh = "Node.js 安装完成。" }
  "node.download"   = @{ en = "Downloading Node.js (about 30 MB)..."; zh = "正在下载 Node.js(约 30 MB)..." }
  "node.dl.fail"    = @{ en = "The Node.js download failed. Check the internet connection and run this again."; zh = "Node.js 下载失败。请检查网络后重新运行。" }
  "node.inst.fail"  = @{ en = "Node.js could not be installed (permission was declined, or the installer failed)."; zh = "Node.js 安装失败(可能是拒绝了授权,或安装程序出错)。" }
  "node.manual"     = @{ en = "You can install it yourself from https://nodejs.org and run this again."; zh = "你也可以自己去 https://nodejs.org 安装,然后重新运行。" }
  "node.notfound"   = @{ en = "Node.js still cannot be found after installing."; zh = "安装之后仍然找不到 Node.js。" }
  "node.reboot"     = @{ en = "Restart the computer and run Vaenyx-Setup.cmd again."; zh = "请重启电脑,然后重新运行 Vaenyx-Setup.cmd。" }
  "deps.retry"      = @{ en = "That did not finish. Trying once more..."; zh = "这一步没完成,再试一次..." }
  "deps.failed"     = @{ en = "The download failed twice."; zh = "下载连续失败两次。" }
  "deps.net"        = @{ en = "This step needs a working internet connection. Check it and run Vaenyx-Setup.cmd again."; zh = "这一步需要正常的网络连接。检查网络后重新运行 Vaenyx-Setup.cmd。" }
  "deps.ok"         = @{ en = "Everything downloaded."; zh = "组件下载完成。" }
  "build.failed"    = @{ en = "Vaenyx could not be prepared."; zh = "Vaenyx 准备失败。" }
  "build.ok"        = @{ en = "Ready to run."; zh = "已准备就绪。" }
  "log.at"          = @{ en = "The full log is at"; zh = "完整日志在" }
  "auto.skipped"    = @{ en = "Skipped (asked for with -SkipAutostart)."; zh = "已跳过(使用了 -SkipAutostart)。" }
  "acl.doing"       = @{ en = "Locking the userdata folder to this Windows account, so other accounts on this computer cannot open your chats, backups and sign-ins."; zh = "把 userdata 文件夹锁定到当前 Windows 账号 —— 这台电脑上的其他账号将打不开你的聊天、备份和登录信息。" }
  "acl.ok"          = @{ en = "userdata is locked to this account (plus Windows itself and Administrators)."; zh = "userdata 已锁定:只有当前账号、管理员和 Windows 系统能打开。" }
  "acl.fail"        = @{ en = "Could not lock the userdata folder. Vaenyx still works, but other accounts on this computer can open it."; zh = "userdata 没锁上。Vaenyx 照常可用,但这台电脑上的其他账号能打开它。" }
  "auto.missing"    = @{ en = "Vaenyx-Service-Run.cmd is missing; skipping the autostart step."; zh = "缺少 Vaenyx-Service-Run.cmd,跳过自启设置。" }
  "auto.ask"        = @{ en = "Windows will ask for permission once - this is the only step that needs it."; zh = "Windows 会请求一次授权 —— 整个安装只有这一步需要。" }
  "auto.why"        = @{ en = "It registers Vaenyx to start with the computer and restart itself if it stops."; zh = "用于让 Vaenyx 随电脑启动,并在意外退出时自动拉起。" }
  "auto.ok"         = @{ en = "Vaenyx will now start with Windows."; zh = "Vaenyx 之后会随 Windows 一起启动。" }
  "auto.fail"       = @{ en = "The autostart step did not finish."; zh = "自启设置没有完成。" }
  "auto.still"      = @{ en = "Vaenyx still works - start it with Vaenyx-Start.cmd."; zh = "Vaenyx 仍然可用 —— 用 Vaenyx-Start.cmd 启动即可。" }
  "auto.declined"   = @{ en = "Permission was declined, so Vaenyx will not start with Windows."; zh = "授权被拒绝,Vaenyx 不会随 Windows 启动。" }
  "auto.later"      = @{ en = "You can set that up later by right-clicking Vaenyx-Install-Autostart.cmd and choosing Run as administrator."; zh = "以后可以右键 Vaenyx-Install-Autostart.cmd 选「以管理员身份运行」来设置。" }
  "run.already"     = @{ en = "Vaenyx is already running."; zh = "Vaenyx 已经在运行。" }
  "run.ok"          = @{ en = "Vaenyx is running."; zh = "Vaenyx 已启动。" }
  "run.fail"        = @{ en = "Vaenyx did not start."; zh = "Vaenyx 没能启动。" }
  "run.diag"        = @{ en = "Run Vaenyx-Diagnose.cmd, or check userdata\logs\vaenyx-service.log and userdata\logs\vaenyx-error.log."; zh = "请运行 Vaenyx-Diagnose.cmd,或查看 userdata\logs\vaenyx-service.log 和 userdata\logs\vaenyx-error.log。" }
  "ready"           = @{ en = "Vaenyx is ready."; zh = "Vaenyx 已就绪。" }
  "ready.open"      = @{ en = "Open this in your browser and follow the short setup:"; zh = "在浏览器打开下面的地址,按提示完成设置:" }
  "ready.noauto"    = @{ en = "Note: Vaenyx will not start with Windows yet."; zh = "提示:Vaenyx 目前不会随 Windows 启动。" }
  "browser.fail"    = @{ en = "The browser did not open by itself. Open one yourself and go to this address:"; zh = "浏览器没有自动打开。请自己打开浏览器,访问下面这个地址:" }
  "browser.copied"  = @{ en = "The address is already copied - press Ctrl+V in the address bar to paste it."; zh = "地址已经复制好了 —— 在浏览器地址栏按 Ctrl+V 粘贴即可。" }
  "stopped"         = @{ en = "Setup stopped:"; zh = "安装中止:" }
}

function Say {
  param([string]$Key)
  $entry = $Messages[$Key]
  if (-not $entry) { return $Key }
  if ($Script:Lang -eq "zh" -and $entry.zh) { return $entry.zh }
  return $entry.en
}

# The answer to the language question. Anything that is not a clear "2" -
# including no answer at all - means English, the documented default.
function Get-LanguageChoice {
  param($Answer)
  if ("$Answer".Trim() -eq "2") { return "zh" }
  return "en"
}

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

  # The language question. A machine with no console answers $null, and that
  # must mean English, not a crash - this is what broke the v0.2.0 release
  # build, where the packaged setup died at the prompt (2026-07-26).
  Assert-Equal "en" (Get-LanguageChoice $null) "no answer means English"
  Assert-Equal "en" (Get-LanguageChoice "") "an empty answer means English"
  Assert-Equal "en" (Get-LanguageChoice "1") "1 means English"
  Assert-Equal "en" (Get-LanguageChoice "banana") "junk means English"
  Assert-Equal "zh" (Get-LanguageChoice "2") "2 means Chinese"
  Assert-Equal "zh" (Get-LanguageChoice " 2 ") "a padded 2 still means Chinese"

  # Language plumbing. A missing translation must degrade to English, never to
  # a blank line, and an unknown key must be visible rather than silent.
  $Script:Lang = "en"
  Assert-Equal "Setup stopped:" (Say "stopped") "Say speaks English by default"
  $Script:Lang = "zh"
  Assert-Equal "安装中止:" (Say "stopped") "Say speaks Chinese when asked"
  $Messages["selftest.enonly"] = @{ en = "English only" }
  Assert-Equal "English only" (Say "selftest.enonly") "Say falls back to English"
  Assert-Equal "selftest.missing" (Say "selftest.missing") "Say shows an unknown key"
  $Script:Lang = "en"

  $blank = 0
  $untranslated = 0
  foreach ($key in $Messages.Keys) {
    if (-not $Messages[$key].en) { $blank = $blank + 1 }
    if ($key -ne "selftest.enonly" -and -not $Messages[$key].zh) {
      $untranslated = $untranslated + 1
    }
  }
  Assert-Equal 0 $blank "every message has English text"
  Assert-Equal 0 $untranslated "every message has Chinese text"

  # Every key this script asks for must exist, or the user sees a raw key.
  $selfText = [System.IO.File]::ReadAllText($PSCommandPath)
  $missingKeys = @()
  foreach ($use in [regex]::Matches($selfText, '\(Say "([^"]+)"\)')) {
    $key = $use.Groups[1].Value
    if ($key.StartsWith("selftest.")) { continue }
    if (-not $Messages.ContainsKey($key)) { $missingKeys += $key }
  }
  Assert-Equal "" ($missingKeys -join ",") "every key used by the script exists"

  # Windows PowerShell accepts typographic quotes as string delimiters, so one
  # inside a message is a parse error, not a character. This file broke on
  # exactly that once (dev.180).
  Assert-Equal $false ($selfText -match "[\u2018\u2019\u201c\u201d]") "no typographic quotes in the script"
  # And the file must keep its UTF-8 BOM, or 5.1 reads the Chinese as cp1252.
  $selfBytes = [System.IO.File]::ReadAllBytes($PSCommandPath)
  Assert-Equal "239,187,191" ($selfBytes[0..2] -join ",") "the script keeps its UTF-8 BOM"

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

# Language first, before anything else is printed: the rest of the install
# speaks it, and the app opens in it too (Oskar, dev.180). Enter = English.
if ($Language -eq "en" -or $Language -eq "zh") {
  $Script:Lang = $Language
} else {
  Write-Host ""
  Write-Host "  Choose a language / 选择语言" -ForegroundColor White
  Write-Host "    1) English (default)"
  Write-Host "    2) 中文"
  # Read-Host returns $null where there is no console to answer with (a CI
  # runner, a scheduled task, output piped to a file). Never let the language
  # question be the thing that stops an install.
  $answer = $null
  try { $answer = Read-Host "  1 or 2" } catch { $answer = $null }
  $Script:Lang = Get-LanguageChoice $answer
}

Write-Host ""
if ($Script:Lang -eq "zh") {
  Write-Host "  属于你自己的 AI,运行在这台电脑上。" -ForegroundColor DarkGray
} else {
  Write-Host "  Your own private AI, running on this computer." -ForegroundColor DarkGray
}
Write-Host "  $root" -ForegroundColor DarkGray

if (-not (Test-Path (Join-Path $root "apps\server\package.json"))) {
  Write-Bad (Say "notvaenyx")
  Write-Info (Say "notvaenyx.fix")
  exit 1
}

$logDirectory = Join-Path $root "userdata\logs"
if (-not (Test-Path $logDirectory)) {
  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
}
$setupLog = Join-Path $logDirectory "setup.log"

# Hand the language choice to the app, so the browser does not open in a
# different language from the one the install just spoke. Only a default:
# whatever the Owner picks in Settings wins from then on.
try {
  $configDirectory = Join-Path $root "userdata\config"
  if (-not (Test-Path $configDirectory)) {
    New-Item -ItemType Directory -Path $configDirectory -Force | Out-Null
  }
  [System.IO.File]::WriteAllText(
    (Join-Path $configDirectory "language.json"),
    "{ ""language"": ""$($Script:Lang)"" }`r`n",
    (New-Object System.Text.UTF8Encoding($false)))
} catch {
  # The app simply defaults to English if this cannot be written.
}
try { Start-Transcript -Path $setupLog -Append | Out-Null } catch { }

# The steps that need admin rights (winget, msiexec, schtasks) only ask for
# elevation when this session does not already have it. When it does — the GUI
# installer always runs setup elevated — they run directly: -Verb RunAs goes
# through ShellExecute, which needs the consent UI, and in an unattended
# session (CI, a service, a scheduled run) that request can hang forever with
# nobody there to click it.
$Script:IsElevated = ([Security.Principal.WindowsPrincipal] `
  [Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Start-Elevated {
  param([string]$FilePath, [string]$Arguments)
  if ($Script:IsElevated) {
    return Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -PassThru
  }
  return Start-Process -FilePath $FilePath -ArgumentList $Arguments -Verb RunAs -Wait -PassThru
}

$failed = $false
try {
  # Files that arrive inside a downloaded zip are marked "from the internet"
  # and PowerShell refuses to run them. Clear that mark on our own scripts.
  Write-Head (Say "step1")
  try {
    Get-ChildItem -Path $root -Filter *.cmd -File | Unblock-File -ErrorAction SilentlyContinue
    Get-ChildItem -Path (Join-Path $root "scripts") -File | Unblock-File -ErrorAction SilentlyContinue
    Write-Good (Say "unblocked")
  } catch {
    Write-Warn (Say "unblock.fail")
  }

  $pathWarning = Get-InstallPathWarning $root
  if ($pathWarning -eq "cloud-synced") {
    Write-Bad (Say "path.cloud")
    Write-Info (Say "path.cloud.why")
    Write-Info (Say "path.cloud.fix")
    throw "cloud-synced install path"
  }
  if ($pathWarning -eq "too-long") {
    Write-Bad (Say "path.long")
    Write-Info (Say "path.long.fix")
    throw "install path too long"
  }
  if ($pathWarning -eq "has-spaces") {
    Write-Warn (Say "path.spaces")
  }

  $windows = [Environment]::OSVersion.Version
  Write-Info "Windows $($windows.Major).$($windows.Minor) build $($windows.Build), $(Get-NodeArch)."
  if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    Write-Warn (Say "curl.missing")
  }

  if (Get-Command node.exe -ErrorAction SilentlyContinue) {
    $nodeVersionText = & node.exe --version
    Write-Info "$(Say 'node.found') $nodeVersionText"
  } else {
    $nodeVersionText = ""
    Write-Info (Say "node.missing")
  }
  $nodeMajor = Get-NodeMajor $nodeVersionText

  # -- 1. Node ----
  Write-Head (Say "step2")
  if ($nodeMajor -ge $MinimumNodeMajor) {
    Write-Good "$nodeVersionText - $(Say 'node.ok')"
  } elseif ($SkipNodeInstall) {
    Write-Bad "Node.js $MinimumNodeMajor or newer is required and -SkipNodeInstall was passed."
    throw "node too old and install skipped"
  } else {
    if ($nodeMajor -gt 0) {
      Write-Info "$nodeVersionText - $(Say 'node.old')"
    }
    Write-Info (Say "node.install")

    $installed = $false
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
      Write-Info (Say "node.winget")
      try {
        $wingetArguments = "install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements"
        $wingetProcess = Start-Elevated -FilePath "winget.exe" -Arguments $wingetArguments
        if ($wingetProcess.ExitCode -eq 0) {
          $installed = $true
          Write-Good (Say "node.done")
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
      Write-Info (Say "node.download")
      try {
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing -TimeoutSec 600
      } catch {
        Write-Bad (Say "node.dl.fail")
        throw "node download failed"
      }
      Write-Info (Say "node.install")
      try {
        $msiProcess = Start-Elevated -FilePath "msiexec.exe" -Arguments "/i `"$msiPath`" /qn /norestart"
        if ($msiProcess.ExitCode -ne 0) {
          Write-Bad "The Node.js installer stopped with code $($msiProcess.ExitCode)."
          throw "node install failed"
        }
      } catch {
        Write-Bad (Say "node.inst.fail")
        Write-Info (Say "node.manual")
        throw "node install failed"
      }
      Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
      Write-Good (Say "node.done")
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
    Write-Bad (Say "node.notfound")
    Write-Info (Say "node.reboot")
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

  # The autostart watchdog runs as SYSTEM under the Task Scheduler service,
  # whose PATH is a boot-time snapshot - a Node.js installed a minute ago is
  # not on it, so a bare "node" there dies instantly (the P0 first-install
  # death). Hand the watchdog the absolute path we just resolved. One line,
  # no BOM, no trailing newline: Vaenyx-Service-Run.cmd reads it with set /p.
  try {
    $configDirectory = Join-Path $root "userdata\config"
    if (-not (Test-Path $configDirectory)) {
      New-Item -ItemType Directory -Path $configDirectory -Force | Out-Null
    }
    [System.IO.File]::WriteAllText(
      (Join-Path $configDirectory "node-path"),
      $nodeExe,
      (New-Object System.Text.UTF8Encoding($false)))
  } catch {
    # Not fatal: the watchdog falls back to probing the default install folder.
  }

  # -- 2. Dependencies ----
  Write-Head (Say "step3")
  & $npmCmd ci
  if ($LASTEXITCODE -ne 0) {
    Write-Warn (Say "deps.retry")
    & $npmCmd ci
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Bad (Say "deps.failed")
    Write-Info (Say "deps.net")
    Write-Info "$(Say 'log.at') $setupLog"
    throw "npm ci failed"
  }
  Write-Good (Say "deps.ok")

  # -- 3. Build ----
  Write-Head (Say "step4")
  & $npmCmd run build
  if ($LASTEXITCODE -ne 0) {
    Write-Bad (Say "build.failed")
    Write-Info "$(Say 'log.at') $setupLog"
    throw "build failed"
  }
  Write-Good (Say "build.ok")

  # Lock userdata to this Windows account. Out of the box the folder inherits
  # BUILTIN\Users:RX + Authenticated Users:M — on a shared family PC every
  # OTHER Windows account can read the database, the chats, the backups and
  # the model sign-in tokens, and write to them. Three principals keep full
  # access: SYSTEM (the watchdog runs the server as SYSTEM), Administrators,
  # and the account installing. This blocks other ACCOUNTS on this computer;
  # it does not restrict anything running AS this account — that is a process
  # sandboxing question, which an ACL cannot answer.
  #
  # No elevation needed: this account created userdata, and an owner may
  # rewrite its ACL. Runs before the server's first start below, so
  # everything the server creates inherits the locked ACL from day one.
  #
  # 🔴 ORDER MATTERS: the reset must target userdata\* (the children only),
  # never the userdata folder itself. Resetting the folder re-inherits the
  # parent's wide ACL and wipes out the grant line above it — first attempt
  # did exactly that, 9,240 files failed.
  $userdataDirectory = Join-Path $root "userdata"
  if (-not (Test-Path $userdataDirectory)) {
    New-Item -ItemType Directory -Path $userdataDirectory -Force | Out-Null
  }
  Write-Info (Say "acl.doing")
  & icacls $userdataDirectory /inheritance:r /grant:r `
    "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "$($env:USERNAME):(OI)(CI)F" | Out-Null
  $aclGrantCode = $LASTEXITCODE
  # Children re-inherit from the now-locked folder. userdata is never empty
  # here (logs\ and config\ were created above), so the glob always matches.
  & icacls "$userdataDirectory\*" /reset /T /C | Out-Null
  if ($aclGrantCode -eq 0 -and $LASTEXITCODE -eq 0) {
    Write-Good (Say "acl.ok")
  } else {
    Write-Warn (Say "acl.fail")
  }

  # -- 4. Autostart ----
  Write-Head (Say "step5")
  $autostartRegistered = $false
  if ($SkipAutostart) {
    Write-Info (Say "auto.skipped")
  } else {
    $runner = Join-Path $root "Vaenyx-Service-Run.cmd"
    if (-not (Test-Path $runner)) {
      Write-Warn (Say "auto.missing")
    } else {
      Write-Info (Say "auto.ask")
      Write-Info (Say "auto.why")
      # Register only, never /Run here. The task runs as SYSTEM with the Task
      # Scheduler service's boot-time PATH snapshot, so on a machine where
      # THIS install just added Node.js the task cannot find it and the first
      # start dies while setup waits (the P0 first-install death). The first
      # start is the direct one below, from this session's fresh PATH; the
      # task takes over at the next boot.
      #
      # The Set-ScheduledTask that follows /Create undoes THREE schtasks
      # defaults that kill real machines:
      #   * a 72-hour execution limit — the watchdog IS this task, so three
      #     days after boot Task Scheduler kills the watchdog and the server
      #     it supervises in one stroke (observed on the reference machine,
      #     2026-08-06 21:51, no log line left behind);
      #   * battery rules under which a laptop off its charger never starts
      #     Vaenyx at boot at all;
      #   * priority 7, which runs the task and everything it starts at
      #     BELOW_NORMAL. That one made Vaenyx feel broken: on a busy machine
      #     the server answered seconds late while using no cpu, because it
      #     was not being given any. Priority 4 is NORMAL — the same footing
      #     as everything else the Owner runs, which is right for a server
      #     they are sitting there waiting for.
      # One elevated child does all three; -EncodedCommand because the /TR
      # value's literal \" escapes inside another quoted layer is where
      # quoting goes to die.
      $registerScript = @"
schtasks /Create /TN "$TaskName" /TR 'cmd /c \"$runner\"' /SC ONSTART /RU SYSTEM /RL HIGHEST /F | Out-Null
if (`$LASTEXITCODE -ne 0) { exit `$LASTEXITCODE }
try {
  Set-ScheduledTask -TaskName "$TaskName" -Settings (New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Priority 4) | Out-Null
} catch { }
exit 0
"@
      $encodedRegister = [Convert]::ToBase64String(
        [System.Text.Encoding]::Unicode.GetBytes($registerScript))
      try {
        $taskProcess = Start-Elevated -FilePath (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe") `
          -Arguments "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $encodedRegister"
        if ($taskProcess.ExitCode -eq 0) {
          $autostartRegistered = $true
          Write-Good (Say "auto.ok")
        } else {
          Write-Warn "$(Say 'auto.fail') (code $($taskProcess.ExitCode))"
          Write-Info (Say "auto.still")
        }
      } catch {
        Write-Warn (Say "auto.declined")
        Write-Info (Say "auto.later")
      }
    }
  }

  # -- 5. Start + open ----
  Write-Head (Say "step6")
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
    Write-Good (Say "run.already")
  } else {
    # The first start is ALWAYS direct, whether or not the autostart task was
    # registered: this session has the fresh PATH and the resolved $nodeExe,
    # while the task's SYSTEM environment will not see a just-installed Node
    # until the next reboot. The watchdog never fights this server - its loop
    # checks the status endpoint and only starts a server of its own when
    # nothing answers.
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

    $ready = $false
    for ($attempt = 1; $attempt -le 40; $attempt++) {
      Start-Sleep -Seconds 2
      if (Test-VaenyxUp $statusUrl) { $ready = $true; break }
    }
    if ($ready) {
      Write-Good (Say "run.ok")
    } else {
      Write-Bad (Say "run.fail")
      Write-Info (Say "run.diag")
      throw "server did not become ready"
    }
  }

  $appUrl = "http://localhost:$Port"
  if (-not $NoBrowser) {
    try {
      Start-Process $appUrl | Out-Null
    } catch {
      # No default browser, a broken http association - whatever it was, never
      # swallow it: Vaenyx IS running, the user just cannot see it yet. Print
      # the address big enough to spot from across the room and put it on the
      # clipboard so a single Ctrl+V finishes the job.
      Write-Host ""
      Write-Warn (Say "browser.fail")
      Write-Host ""
      Write-Host ("  " + ("=" * 60)) -ForegroundColor Yellow
      Write-Host ""
      Write-Host "        $appUrl" -ForegroundColor White
      Write-Host ""
      Write-Host ("  " + ("=" * 60)) -ForegroundColor Yellow
      Write-Host ""
      $copied = $false
      try { Set-Clipboard -Value $appUrl -ErrorAction Stop; $copied = $true } catch { }
      if (-not $copied) {
        # Set-Clipboard can fail on a locked-down machine; clip.exe has shipped
        # with Windows since XP and takes anything on stdin.
        try { $appUrl | clip.exe; $copied = $true } catch { }
      }
      if ($copied) { Write-Info (Say "browser.copied") }
    }
  }

  Write-Host ""
  Write-Host "  $(Say 'ready')" -ForegroundColor Green
  Write-Host "  $(Say 'ready.open') $appUrl" -ForegroundColor White
  if (-not $autostartRegistered -and -not $SkipAutostart) {
    Write-Host "  $(Say 'ready.noauto')" -ForegroundColor Yellow
  }
  Write-Host ""
} catch {
  $failed = $true
  Write-Host ""
  Write-Bad "$(Say 'stopped') $($_.Exception.Message)"
  Write-Info "$(Say 'log.at') $setupLog"
  Write-Host ""
} finally {
  try { Stop-Transcript | Out-Null } catch { }
}

if ($failed) { exit 1 }
exit 0
