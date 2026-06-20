#!/usr/bin/env pwsh
# Produce a release build of Parchmint and report the resulting installers.
#
#   pwsh ./scripts/release.ps1            # full release build
#   pwsh ./scripts/release.ps1 -FrontendOnly   # just tsc + vite (fast sanity check)
#
# Windows-only artifacts (.msi / .exe). macOS and Linux builds come from CI —
# they cannot be cross-compiled from Windows.

[CmdletBinding()]
param(
  [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

# Run from the repo root regardless of where the script is invoked from.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$version = (Get-Content "package.json" -Raw | ConvertFrom-Json).version
Write-Host "Parchmint $version — release build" -ForegroundColor Cyan

if ($FrontendOnly) {
  Write-Host "Frontend only (tsc + vite build)..." -ForegroundColor DarkGray
  npm run build
  Write-Host "Frontend build OK." -ForegroundColor Green
  return
}

$started = Get-Date
Write-Host "Building (this takes a while on a cold Rust compile)..." -ForegroundColor DarkGray
npm run tauri build

# PowerShell does not treat a native command's non-zero exit as terminating, so
# check explicitly — otherwise we'd go on to report stale artifacts from a prior
# build as if this run had produced them.
if ($LASTEXITCODE -ne 0) {
  Write-Error "tauri build failed (exit $LASTEXITCODE). No installers produced this run."
  exit $LASTEXITCODE
}

$elapsed = [int]((Get-Date) - $started).TotalSeconds
Write-Host "`nBuild finished in ${elapsed}s." -ForegroundColor Green

# Surface the installers with sizes so the artifacts are easy to grab.
$bundle = "src-tauri/target/release/bundle"
$artifacts = Get-ChildItem -Path $bundle -Recurse -Include *.msi, *.exe -ErrorAction SilentlyContinue

if (-not $artifacts) {
  Write-Warning "No installers found under $bundle. Check the build output above."
  exit 1
}

Write-Host "`nInstallers:" -ForegroundColor Cyan
foreach ($a in $artifacts) {
  $mb = [math]::Round($a.Length / 1MB, 1)
  Write-Host ("  {0,-7} {1}" -f "${mb}MB", $a.FullName)
}

Write-Host "`nNote: Windows builds ship unsigned — SmartScreen shows 'More info -> Run anyway'." -ForegroundColor DarkYellow
