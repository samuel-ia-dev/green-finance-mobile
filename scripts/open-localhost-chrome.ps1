$url = "http://127.0.0.1:19011"
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profileRoot = Join-Path $env:TEMP "green-finance-localhost-chrome"

if (-not (Test-Path $chromePath)) {
  Write-Output "chrome not found"
  exit 1
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32ChromeLocalhost {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$before = Get-Date
$profilePath = Join-Path $profileRoot ([DateTime]::Now.ToString("yyyyMMdd-HHmmss-fff"))

if (-not (Test-Path $profileRoot)) {
  New-Item -ItemType Directory -Path $profileRoot | Out-Null
}

New-Item -ItemType Directory -Path $profilePath | Out-Null

Start-Process -FilePath $chromePath -ArgumentList @(
  "--new-window",
  "--app=$url",
  "--user-data-dir=$profilePath",
  "--disable-background-mode",
  "--window-position=0,0",
  "--window-size=$($screen.Width),$($screen.Height)",
  "--start-maximized"
) | Out-Null

Start-Sleep -Seconds 3

$target = $null
for ($i = 0; $i -lt 40; $i++) {
  $target = Get-Process chrome -ErrorAction SilentlyContinue |
    Where-Object { $_.StartTime -ge $before.AddSeconds(-2) -and $_.MainWindowHandle -ne 0 } |
    Sort-Object StartTime -Descending |
    Select-Object -First 1

  if ($target) {
    break
  }

  Start-Sleep -Milliseconds 250
}

if (-not $target) {
  $target = Get-Process chrome -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Sort-Object StartTime -Descending |
    Select-Object -First 1
}

if (-not $target) {
  Write-Output "chrome window not found"
  exit 1
}

[IntPtr]$topMost = New-Object IntPtr -1
[IntPtr]$notTopMost = New-Object IntPtr -2
$flags = 0x0040

[Win32ChromeLocalhost]::ShowWindowAsync($target.MainWindowHandle, 9) | Out-Null
[Win32ChromeLocalhost]::MoveWindow($target.MainWindowHandle, 0, 0, $screen.Width, $screen.Height, $true) | Out-Null
[Win32ChromeLocalhost]::SetWindowPos($target.MainWindowHandle, $topMost, 0, 0, $screen.Width, $screen.Height, $flags) | Out-Null
[Win32ChromeLocalhost]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
[Microsoft.VisualBasic.Interaction]::AppActivate($target.Id) | Out-Null
Start-Sleep -Milliseconds 300
[Win32ChromeLocalhost]::SetWindowPos($target.MainWindowHandle, $notTopMost, 0, 0, $screen.Width, $screen.Height, $flags) | Out-Null
[Win32ChromeLocalhost]::SetForegroundWindow($target.MainWindowHandle) | Out-Null

Write-Output ("focused chrome " + $target.Id)
