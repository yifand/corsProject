Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -match 'headless' } |
  ForEach-Object {
    Write-Host ("kill " + $_.ProcessId)
    Stop-Process -Id $_.ProcessId -Force
  }
