$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $root "web"

New-Item -ItemType Directory -Force -Path $webDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $webDir "icons") | Out-Null

Copy-Item -Path (Join-Path $root "index.html") -Destination (Join-Path $webDir "index.html") -Force
Copy-Item -Path (Join-Path $root "manifest.webmanifest") -Destination (Join-Path $webDir "manifest.webmanifest") -Force
Copy-Item -Path (Join-Path $root "service-worker.js") -Destination (Join-Path $webDir "service-worker.js") -Force

$iconSrc = Join-Path $root "icons\app-icon.svg"
if (Test-Path $iconSrc) {
  Copy-Item -Path $iconSrc -Destination (Join-Path $webDir "icons\app-icon.svg") -Force
}

Write-Host "Prepared Capacitor web assets in: $webDir"
