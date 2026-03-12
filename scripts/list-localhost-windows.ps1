$processes = Get-Process mshta, msedge -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object ProcessName, Id, MainWindowTitle

$processes | Format-Table -AutoSize
