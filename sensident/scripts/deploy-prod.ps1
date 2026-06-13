Set-Location "C:\Users\clawuser\.openclaw\workspace-tartrinator\sensident"
$env:VERCEL_TOKEN = "vcp_3VopfvyhZqNMdgHX3lKwSQbqaUpLESATCzq5E23Fy7iR4i1qgD1be9Ji"
vercel deploy --prod --token $env:VERCEL_TOKEN --yes
