# Sensident - Pre-push hook (PowerShell, Windows natif)
# Premiere ligne de defense : tsc + no-AI guard (~10s total).
# Les 4 tests E2E tournent dans GitHub Actions (2e ligne de defense).
# Bypass (urgence) : git push --no-verify

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$GitArgs
)

$ErrorActionPreference = "Stop"
$root = & git rev-parse --show-toplevel
$appDir = Join-Path $root "sensident"

if (-not (Test-Path $appDir)) {
    Write-Host "  [pre-push] sensident/ absent, hook desactive." -ForegroundColor DarkGray
    exit 0
}

Set-Location $appDir

Write-Host ""
Write-Host "  [pre-push] Sensident - verifications locales (rapide)..." -ForegroundColor Cyan

# 1. Typecheck (~10s)
Write-Host "    [1/2] tsc --noEmit" -ForegroundColor Yellow -NoNewline
$tscOut = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host ""
    Write-Host $tscOut
    Write-Host ""
    Write-Host "  [pre-push] BLOQUE: erreurs TypeScript ci-dessus." -ForegroundColor Red
    Write-Host "  Bypass (urgence) : git push --no-verify"
    exit 1
}
Write-Host " OK" -ForegroundColor Green

# 2. No-AI guard (<1s)
Write-Host "    [2/2] no-AI guard" -ForegroundColor Yellow -NoNewline
if (Test-Path "scripts/check-no-ai.js") {
    & node scripts/check-no-ai.js 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "  [pre-push] BLOQUE: violation no-AI detectee." -ForegroundColor Red
        exit 1
    }
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " SKIP" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  [pre-push] OK. Tests E2E complets dans GitHub Actions." -ForegroundColor Green
Write-Host ""
exit 0
