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

$icon192Src = Join-Path $root "icons\icon-192.png"
if (Test-Path $icon192Src) {
  Copy-Item -Path $icon192Src -Destination (Join-Path $webDir "icons\icon-192.png") -Force
}

$appleTouchIconSrc = Join-Path $root "icons\apple-touch-icon.png"
if (Test-Path $appleTouchIconSrc) {
  Copy-Item -Path $appleTouchIconSrc -Destination (Join-Path $webDir "icons\apple-touch-icon.png") -Force
}

$icon512Src = Join-Path $root "icons\icon-512.png"
if (Test-Path $icon512Src) {
  Copy-Item -Path $icon512Src -Destination (Join-Path $webDir "icons\icon-512.png") -Force
}

Write-Host "Prepared Capacitor web assets in: $webDir"
