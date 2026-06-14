# Vercel prod env setup
# Usage: $env:VERCEL_TOKEN="..."; $env:VERCEL_PROJECT_ID="prj_..."; $env:VERCEL_TEAM_ID="team_..."; .\scripts\vercel-setup-prod.ps1
# Le token Vercel se cree sur https://vercel.com/account/tokens
# Le project id est dans Settings > General du projet sensidentv0

$ErrorActionPreference = "Stop"
$BaseDir = Split-Path -Parent $PSCommandPath
$Root = Split-Path -Parent $BaseDir
Set-Location $Root

if (-not $env:VERCEL_TOKEN) { throw "VERCEL_TOKEN manquant (https://vercel.com/account/tokens)" }
if (-not $env:VERCEL_PROJECT_ID) { throw "VERCEL_PROJECT_ID manquant (Settings > General du projet)" }
$TeamId = $env:VERCEL_TEAM_ID
if (-not $TeamId) { Write-Warning "VERCEL_TEAM_ID non defini : on assume un projet personnel" }

$headers = @{
  Authorization = "Bearer $env:VERCEL_TOKEN"
  "Content-Type" = "application/json"
}
$baseUrl = "https://api.vercel.com/v10/projects/$env:VERCEL_PROJECT_ID/env"
if ($TeamId) { $baseUrl += "?teamId=$TeamId&upsert=true" } else { $baseUrl += "?upsert=true" }

# Lecture des env existantes
$listUrl = "https://api.vercel.com/v9/projects/$env:VERCEL_PROJECT_ID/env"
if ($TeamId) { $listUrl += "?teamId=$TeamId" }
$existing = (Invoke-RestMethod -Uri $listUrl -Headers $headers -Method GET).envs | ForEach-Object { $_.key }

# Secrets generes
$authSecret = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
$cronSecret = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
$unsubSecret = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
$ipSalt = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
$cabSalt = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

$vars = @(
  @{ key = "AUTH_SECRET"; value = $authSecret; type = "encrypted" },
  @{ key = "CRON_SECRET"; value = $cronSecret; type = "encrypted" },
  @{ key = "UNSUBSCRIBE_SECRET"; value = $unsubSecret; type = "encrypted" },
  @{ key = "IP_HASH_SALT"; value = $ipSalt; type = "encrypted" },
  @{ key = "CABINET_HASH_SALT"; value = $cabSalt; type = "encrypted" },
  @{ key = "AUTH_URL"; value = "https://sensidentv0.vercel.app"; type = "plain" },
  @{ key = "NEXTAUTH_URL"; value = "https://sensidentv0.vercel.app"; type = "plain" },
  @{ key = "NEXT_PUBLIC_APP_URL"; value = "https://sensidentv0.vercel.app"; type = "plain" },
  @{ key = "EMAIL_FROM"; value = "Sensident <noreply@sensident.fr>"; type = "plain" },
  @{ key = "NODE_ENV"; value = "production"; type = "plain" }
)

foreach ($v in $vars) {
  if ($existing -contains $v.key) {
    Write-Host "  [skip] $($v.key) existe deja" -ForegroundColor Yellow
    continue
  }
  Write-Host "  [add]  $($v.key)" -ForegroundColor Green
  $body = @{
    key = $v.key
    value = $v.value
    type = $v.type
    target = @("production")
  } | ConvertTo-Json
  Invoke-RestMethod -Uri $baseUrl -Headers $headers -Method POST -Body $body | Out-Null
}

Write-Host "`nTermine. Les variables STRIPE/BREVO doivent etre ajoutees manuellement (credentials externes) :" -ForegroundColor Cyan
Write-Host "  BREVO_SMTP_USER, BREVO_SMTP_PASS, BREVO_WEBHOOK_SECRET"
Write-Host "  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_COUPON_AMBASSADOR"
