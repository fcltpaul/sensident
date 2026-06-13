Set-Location "C:\Users\clawuser\.openclaw\workspace-tartrinator\sensident"
$env:VERCEL_TOKEN = $env:VERCEL_TOKEN_DEV
if (-not $env:VERCEL_TOKEN_DEV) {
  Write-Error "Set VERCEL_TOKEN_DEV env var before running."
  exit 1
}
vercel deploy --prod --token $env:VERCEL_TOKEN_DEV --yes
