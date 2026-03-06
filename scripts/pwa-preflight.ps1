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

$missingIconFiles = @()
foreach ($icon in $manifest.icons) {
  if ($null -eq $icon -or [string]::IsNullOrWhiteSpace($icon.src)) {
    continue
  }
  $iconPath = Join-Path $root $icon.src
  if (-not (Test-Path $iconPath)) {
    $missingIconFiles += $icon.src
  }
}

if ($missingIconFiles.Count -gt 0) {
  Write-Error ("manifest icon files are missing: " + ($missingIconFiles -join ", "))
}

$has192Png = $false
$has512Png = $false
foreach ($icon in $manifest.icons) {
  if ($null -eq $icon) { continue }
  if ($icon.sizes -eq "192x192" -and $icon.type -eq "image/png") { $has192Png = $true }
  if ($icon.sizes -eq "512x512" -and $icon.type -eq "image/png") { $has512Png = $true }
}

if (-not $has192Png -or -not $has512Png) {
  Write-Error "manifest.webmanifest must include PNG icons for 192x192 and 512x512."
}

Write-Host "PWA preflight passed." -ForegroundColor Green
