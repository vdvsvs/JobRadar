$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$targetPath = Join-Path $repoRoot 'dist_electron\win-unpacked\JobRadar.exe'

if (-not (Test-Path -LiteralPath $targetPath)) {
  throw "Built app not found: $targetPath. Run pnpm dist:win first."
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'JobRadar.lnk'
$workingDirectory = Split-Path -Parent $targetPath

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $workingDirectory
$shortcut.IconLocation = "$targetPath,0"
$shortcut.Description = 'JobRadar'
$shortcut.Save()

Write-Host "Updated desktop shortcut: $shortcutPath"
