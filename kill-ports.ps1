$ports = @(3000, 3001, 8081)
foreach ($port in $ports) {
  $connections = netstat -ano | Select-String ":$port "
  foreach ($line in $connections) {
    $parts = $line.ToString().Trim() -split '\s+'
    $pid2 = $parts[-1]
    if ($pid2 -match '^\d+$' -and $pid2 -ne '0') {
      Stop-Process -Id ([int]$pid2) -Force -ErrorAction SilentlyContinue
      Write-Host "Killed PID $pid2 on port $port"
    }
  }
}
Write-Host "Ports 3000, 3001, 8081 cleared"
