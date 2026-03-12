$shell = New-Object -ComObject WScript.Shell
$target = Get-Process msedge -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match "localhost" } |
  Sort-Object StartTime -Descending |
  Select-Object -First 1

if (-not $target) {
  Write-Output "window not found"
  exit 1
}

$url = "http://localhost:19011/?ts=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"

if (-not $shell.AppActivate($target.Id)) {
  Write-Output "unable to activate window"
  exit 1
}

Start-Sleep -Milliseconds 400
$shell.SendKeys("^l")
Start-Sleep -Milliseconds 250
$shell.SendKeys($url)
Start-Sleep -Milliseconds 150
$shell.SendKeys("~")

Write-Output ("navigated edge " + $target.Id + " to " + $url)
