# Sensident — Pre-push hook (PowerShell, Windows natif)
# Bloque le push si les tests E2E echouent en local.
# Complement du pipeline CI GitHub Actions (premiere ligne de defense).
#
# Pour bypasser en cas d'urgence : git push --no-verify
#
# Installation : ce fichier est reference via core.hooksPath (config global)
# ou via .git/config (local). Pour l'activer :
#   git config core.hooksPath .git/hooks-ps1
#   # puis copier ce fichier vers .git/hooks-ps1/pre-push
#
# Alternative : creer un .git/hooks/pre-push qui contient :
#   powershell.exe -ExecutionPolicy Bypass -File "$(git rev-parse --git-dir)/hooks/pre-push.ps1" "$@"
# (et chmod +x le pre-push wrapper)

[CmdletBinding()]
param(
    [int]$RemoteIdx,
    [string]$RemoteName,
    [string]$RemoteUrl
)

$ErrorActionPreference = "Stop"
$root = & git rev-parse --show-toplevel
Set-Location $root

Write-Host ""
Write-Host "  [pre-push] Sensident - verifications locales..." -ForegroundColor Cyan
Write-Host ""

# 1. Typecheck (~10s)
Write-Host "  [1/4] tsc --noEmit" -ForegroundColor Yellow
$tscOk = $true
try {
    & npx tsc --noEmit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { $tscOk = $false }
} catch { $tscOk = $false }
if (-not $tscOk) {
    Write-Host ""
    Write-Host "  [pre-push] BLOQUE: erreurs TypeScript." -ForegroundColor Red
    Write-Host "  Fix les erreurs puis re-tente le push."
    Write-Host "  Bypass (urgence) : git push --no-verify"
    exit 1
}
Write-Host "  [1/4] OK" -ForegroundColor Green

# 2. No-AI guard
Write-Host ""
Write-Host "  [2/4] no-AI guard" -ForegroundColor Yellow
if (Test-Path "sensident/scripts/check-no-ai.js") {
    & node sensident/scripts/check-no-ai.js 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [pre-push] BLOQUE: violation no-AI detectee." -ForegroundColor Red
        exit 1
    }
    Write-Host "  [2/4] OK" -ForegroundColor Green
} else {
    Write-Host "  [2/4] SKIP (script absent)" -ForegroundColor DarkGray
}

# 3. Init DB
Write-Host ""
Write-Host "  [3/4] Init DB SQLite" -ForegroundColor Yellow
if (Test-Path "sensident") {
    Set-Location sensident
    & npx tsx scripts/init-db.ts 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [pre-push] BLOQUE: init-db a echoue." -ForegroundColor Red
        Set-Location $root
        exit 1
    }
    Set-Location $root
    Write-Host "  [3/4] OK" -ForegroundColor Green
} else {
    Write-Host "  [3/4] SKIP (dossier sensident absent)" -ForegroundColor DarkGray
}

# 4. Tests E2E (lent, ~30s)
Write-Host ""
Write-Host "  [4/4] Tests E2E (~30s, sans Stripe live)" -ForegroundColor Yellow
if (Test-Path "sensident") {
    Set-Location sensident
    # Kill any existing dev server
    Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        $_.Id -ne 10356
    } | ForEach-Object {
        try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
    }
    Start-Sleep -Seconds 1

    # Start dev server in background
    $env:DATABASE_URL = "file:./dev.db"
    $devProc = Start-Process -FilePath "npx.cmd" -ArgumentList "next","dev","-p","3001" `
        -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\next-dev-out.log" `
        -RedirectStandardError "$env:TEMP\next-dev-err.log"
    Write-Host "    dev server PID=$($devProc.Id)"

    # Wait for server ready (max 60s)
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:3001/login" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        Write-Host "  [pre-push] BLOQUE: dev server n'a pas demarre en 60s." -ForegroundColor Red
        try { Stop-Process -Id $devProc.Id -Force } catch {}
        Set-Location $root
        exit 1
    }
    Write-Host "    dev server ready" -ForegroundColor DarkGray

    # Run tests
    $failed = $false
    $tests = @("test-stripe-webhook.mjs", "test-cron-scheduled-newsletters.mjs", "test-billing-ui.mjs", "test-feature-flags.mjs")
    foreach ($t in $tests) {
        if (Test-Path "scripts/$t") {
            Write-Host "    -> $t" -ForegroundColor DarkGray
            & node "scripts/$t" 2>&1 | Select-Object -Last 3
            if ($LASTEXITCODE -ne 0) { $failed = $true }
        }
    }

    # Cleanup
    try { Stop-Process -Id $devProc.Id -Force } catch {}
    Set-Location $root

    if ($failed) {
        Write-Host ""
        Write-Host "  [pre-push] BLOQUE: au moins un test E2E a echoue." -ForegroundColor Red
        Write-Host "  Debug local :"
        Write-Host "    cd sensident"
        Write-Host "    npx next dev -p 3001 &"
        Write-Host "    node scripts/test-feature-flags.mjs"
        exit 1
    }
    Write-Host "  [4/4] OK" -ForegroundColor Green
} else {
    Write-Host "  [4/4] SKIP (dossier sensident absent)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  [pre-push] Toutes les verifications OK. Push autorise." -ForegroundColor Green
Write-Host ""
exit 0
