param([string]$StoreUrl = '', [switch]$Preview)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  npm.cmd run build:preview
  if ($LASTEXITCODE -ne 0) { throw 'Website build failed.' }
  $assetRoot = Join-Path $projectRoot 'admin_windows\assets\site'
  if (Test-Path -LiteralPath $assetRoot) {
    $resolvedAssets = [System.IO.Path]::GetFullPath($assetRoot)
    $expectedAssets = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'admin_windows\assets\site'))
    if ($resolvedAssets -ne $expectedAssets -or -not $resolvedAssets.StartsWith([System.IO.Path]::GetFullPath($projectRoot))) { throw 'Unexpected asset directory.' }
    Remove-Item -LiteralPath $resolvedAssets -Recurse -Force
  }
  New-Item -ItemType Directory -Force $assetRoot | Out-Null
  Copy-Item -Path (Join-Path $projectRoot 'dist\*') -Destination $assetRoot -Recurse -Force
  Push-Location (Join-Path $projectRoot 'admin_windows')
  try {
    flutter pub get
    if ($LASTEXITCODE -ne 0) { throw 'Flutter dependency resolution failed.' }
    if ($Preview -or -not $StoreUrl) { flutter build windows --release }
    else { flutter build windows --release "--dart-define=STORE_URL=$StoreUrl" }
    if ($LASTEXITCODE -ne 0) { throw 'Windows build failed.' }
  } finally { Pop-Location }
  $release = Join-Path $projectRoot 'admin_windows\build\windows\x64\runner\Release'
  $output = Join-Path $projectRoot 'releases'
  New-Item -ItemType Directory -Force $output | Out-Null
  $name = if ($Preview -or -not $StoreUrl) { 'MuanoLuxe-Studio-Windows-Preview.zip' } else { 'MuanoLuxe-Studio-Windows.zip' }
  Compress-Archive -Path "$release\*" -DestinationPath (Join-Path $output $name) -Force
  Write-Output "Windows package: $output\$name"
} finally { Pop-Location }
