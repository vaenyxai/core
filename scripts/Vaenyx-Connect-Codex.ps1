$codexCommand = Join-Path $env:APPDATA "npm\codex.cmd"

if (-not (Test-Path $codexCommand)) {
  Write-Host "Installing the official independent Codex CLI..."
  & npm.cmd install -g "@openai/codex"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Codex CLI installation failed."
    exit $LASTEXITCODE
  }
}

$visualRepair = Join-Path $PSScriptRoot "Vaenyx-Repair-Codex-Visual.ps1"
if (Test-Path -LiteralPath $visualRepair) {
  & powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File $visualRepair
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Codex visual sandbox configuration could not be repaired."
  }
}

$status = (& $codexCommand login status 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -eq 0 -and $status -match "ChatGPT") {
  Write-Host "Codex is already connected with ChatGPT Subscription Auth."
  Write-Host "Vaenyx will never read or store your Codex login tokens."
  exit 0
}

Write-Host "Vaenyx requires Codex sign-in with ChatGPT Subscription Auth."
Write-Host "Complete the official Codex login flow in the browser."
& $codexCommand login
exit $LASTEXITCODE
