$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$requiredFiles = @(
  "index.html",
  "manifest.webmanifest",
  "service-worker.js"
)

$missing = @()
foreach ($file in $requiredFiles) {
  if (-not (Test-Path $file)) {
    $missing += $file
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing required files: " + ($missing -join ", "))
}

$manifestRaw = Get-Content "manifest.webmanifest" -Raw
$manifest = $manifestRaw | ConvertFrom-Json

$manifestChecks = @(
  @{ Name = "name"; Value = $manifest.name },
  @{ Name = "short_name"; Value = $manifest.short_name },
  @{ Name = "start_url"; Value = $manifest.start_url },
  @{ Name = "display"; Value = $manifest.display },
  @{ Name = "theme_color"; Value = $manifest.theme_color },
  @{ Name = "icons"; Value = $manifest.icons }
)

$failed = @()
foreach ($check in $manifestChecks) {
  if ($null -eq $check.Value -or ($check.Value -is [string] -and [string]::IsNullOrWhiteSpace($check.Value))) {
    $failed += $check.Name
  }
}

if ($failed.Count -gt 0) {
  Write-Error ("manifest.webmanifest is missing fields: " + ($failed -join ", "))
}

Write-Host "PWA preflight passed." -ForegroundColor Green
