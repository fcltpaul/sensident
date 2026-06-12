# Sensident — Installation des git hooks
# Usage: .\scripts\install-hooks.ps1
# Copie githooks/* vers .git/hooks/ et configure core.hooksPath.

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = & git rev-parse --show-toplevel
Set-Location $root

$srcDir = Join-Path $root "githooks"
$gitDir = & git rev-parse --git-dir | ForEach-Object { $_ }
$dstDir = Join-Path $gitDir "hooks"

if (-not (Test-Path $srcDir)) {
    Write-Error "Dossier githooks/ introuvable a la racine."
    exit 1
}

Write-Host "Installation des hooks depuis $srcDir vers $dstDir"
Write-Host ""

Get-ChildItem $srcDir | ForEach-Object {
    $name = $_.Name
    $src = $_.FullName
    $dst = Join-Path $dstDir $name
    Copy-Item -Path $src -Destination $dst -Force
    Write-Host "  + $name"
}

# Pour les hooks Git (.git/hooks/pre-push), il faut un wrapper qui appelle le .ps1
# On ecrase le wrapper bash s'il existe
$wrapper = Join-Path $dstDir "pre-push"
$wrapperContent = @"
#!/usr/bin/env sh
# Auto-genere par scripts/install-hooks.ps1
DIR=`$(git rev-parse --git-dir)
exec powershell.exe -ExecutionPolicy Bypass -File "`$DIR/hooks/pre-push.ps1" "`$@"
"@
Set-Content -Path $wrapper -Value $wrapperContent -Force
Write-Host "  + pre-push (wrapper)"

Write-Host ""
Write-Host "OK. Pour tester : git push (un commit de test declenchera le hook)"
Write-Host "Pour bypasser en urgence : git push --no-verify"
