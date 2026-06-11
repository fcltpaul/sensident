# dev-clean.ps1
# Tue les process Next.js + nettoie le lockfile + libere le port 3001
# Usage: pwsh scripts/dev-clean.ps1
$port = 3001
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $processes) {
    try {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq "node") {
            Write-Host "Kill node PID $pid..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*openclaw*" -or $_.StartTime -gt (Get-Date).AddMinutes(-5) -and $_.Path -like "*workspace-tartrinator*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Port $port libre."
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object OwningProcess
