#requires -RunAsAdministrator
# Puts phone access back after a Tailscale reinstall has reset it.
#
# WHY THIS EXISTS. Vaenyx's install button reported "Tailscale is not on this
# computer yet" on a machine where it was installed and serving, and the press
# ran the MSI over the top. An MSI over an existing Tailscale is an
# upgrade-in-place: it resets the serve configuration and can leave the old
# daemon running beside the new one, so the tailnet address stops answering
# and every request from a phone or another device dies with
# ERR_CONNECTION_CLOSED (Oskar, 2026-08-08). The lookup and the guard are both
# fixed; this restores the machine that already got hit.
#
# It needs administrator rights because stopping a Windows service does. Run
# it from an elevated PowerShell, or let Vaenyx-Repair-Phone-Access.cmd
# elevate for you.
[CmdletBinding()]
param(
  # The port Vaenyx listens on; must match what the app publishes.
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Say($text, $colour = "Gray") { Write-Host $text -ForegroundColor $colour }

$tailscale = $null
foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, "$env:SystemDrive\Program Files")) {
  if (-not $root) { continue }
  $candidate = Join-Path $root "Tailscale\tailscale.exe"
  if (Test-Path $candidate) { $tailscale = $candidate; break }
}
if (-not $tailscale) {
  Say "Tailscale is not installed on this computer." "Red"
  Say "Install it from https://tailscale.com/download, then run this again."
  exit 1
}
Say "Tailscale: $tailscale"

# 0. ⚠ FIRST, AND BEFORE TOUCHING THE SERVICE: has Windows finished the
#    install at all? A Tailscale MSI upgrade replaces a network driver, and
#    Windows cannot swap those files while they are in use — it queues them
#    for the next boot and sets PendingFileRenameOperations. Until that reboot
#    happens the daemon can never reach a working state, and restarting the
#    service does not hang up so much as refuse to finish: the stop waits on a
#    process that cannot cleanly exit. This script did exactly that, twice,
#    and looked frozen both times (2026-08-08). Ask the cheap question first.
$pendingRename = Get-ItemProperty `
  "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" `
  -Name PendingFileRenameOperations -ErrorAction SilentlyContinue
if ($pendingRename) {
  Say ""
  Say "Windows has not finished installing Tailscale yet." "Yellow"
  Say ""
  Say "  It is waiting for a RESTART OF THE COMPUTER to swap files that are" "Yellow"
  Say "  in use. Until that happens nothing here can help - the service will" "Yellow"
  Say "  not start properly however many times it is restarted." "Yellow"
  Say ""
  Say "  Restart Windows, then run this again if the address is still down."
  Say ""
  Say "  (Last boot: $((Get-CimInstance Win32_OperatingSystem).LastBootUpTime))"
  exit 5
}

# 1. Restart the service. This clears a stale daemon left behind by an upgrade
#    — the symptom is two tailscaled processes and a backend stuck at NoState
#    however long you wait.
Say ""
Say "[1/4] Restarting the Tailscale service..." "Cyan"
Restart-Service -Name Tailscale -Force
Start-Sleep -Seconds 6

$deadline = (Get-Date).AddSeconds(90)
$state = ""
while ((Get-Date) -lt $deadline) {
  $json = & $tailscale status --json 2>$null
  if ($json) {
    try { $state = ($json | ConvertFrom-Json).BackendState } catch { $state = "" }
  }
  if ($state -and $state -ne "NoState" -and $state -ne "Starting") { break }
  Start-Sleep -Seconds 3
}
Say "    backend state: $(if ($state) { $state } else { 'unknown' })"

# 2. Logged in? An upgrade normally keeps the node key, but if it did not, no
#    amount of serve configuration will help and the Owner has to sign in.
if ($state -eq "NeedsLogin" -or $state -eq "Stopped") {
  Say ""
  Say "Tailscale is installed and running but signed out." "Yellow"
  Say "Sign in once, then run this again:" "Yellow"
  Say "    `"$tailscale`" up"
  exit 2
}
if ($state -ne "Running") {
  Say ""
  Say "Tailscale did not finish starting (state: $state)." "Red"
  Say "Wait a minute and run this again; if it stays this way, reboot."
  exit 3
}
Say "    signed in and running." "Green"

# 3. Republish Vaenyx. Deliberately the SAME command the app's own Turn On
#    button runs (`funnel --bg <port>`), so the status check that reads the
#    config back recognises the shape it finds.
Say ""
Say "[2/4] Publishing Vaenyx on the tailnet..." "Cyan"
& $tailscale funnel --bg $Port
Start-Sleep -Seconds 3

Say ""
Say "[3/4] Reading the configuration back..." "Cyan"
$serve = & $tailscale serve status 2>&1
$serve | ForEach-Object { Say "    $_" }

# 4. Prove it from the outside rather than trusting the command's own claims.
Say ""
Say "[4/4] Checking the address actually answers..." "Cyan"
$dnsName = ""
try { $dnsName = ((& $tailscale status --json | ConvertFrom-Json).Self.DNSName).TrimEnd(".") } catch { }
if ($dnsName) {
  $url = "https://$dnsName/v1/system/status"
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 25
    if ($response.StatusCode -eq 200) {
      Say ""
      Say "Phone access is back: https://$dnsName" "Green"
      Say "On the phone, open that address. If the page looks stale, clear the site data once."
      exit 0
    }
    Say "The address answered $($response.StatusCode)." "Yellow"
  } catch {
    Say "The address did not answer: $($_.Exception.Message)" "Red"
    Say "If Funnel is disabled for this tailnet, the line above from Tailscale says so and links the admin console."
  }
} else {
  Say "Could not read this machine's tailnet name." "Yellow"
}
exit 4
