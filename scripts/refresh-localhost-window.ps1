$shell = New-Object -ComObject WScript.Shell

if ($shell.AppActivate("Green Finance Localhost")) {
  Start-Sleep -Milliseconds 300
  $shell.SendKeys("{F5}")
  Write-Output "refreshed hta"
  exit 0
}

$edgeWindow = Get-Process msedge -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match "localhost" } |
  Sort-Object StartTime -Descending |
  Select-Object -First 1

if ($edgeWindow -and $shell.AppActivate($edgeWindow.Id)) {
  Start-Sleep -Milliseconds 300
  $shell.SendKeys("^r")
  Write-Output ("refreshed edge " + $edgeWindow.Id)
  exit 0
}

Write-Output "window not found"
exit 1
