$url = "http://127.0.0.1:19011"
$isolatedProfileRoot = Join-Path $env:TEMP "green-finance-localhost-edge"

$edgeCandidates = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$edgePath = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edgePath) {
  Write-Output "edge not found"
  exit 1
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32LocalhostWindow {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@

$sessionId = (Get-Process -Id $PID).SessionId
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$before = Get-Date

if (-not (Test-Path $isolatedProfileRoot)) {
  New-Item -ItemType Directory -Path $isolatedProfileRoot | Out-Null
}

$isolatedProfile = Join-Path $isolatedProfileRoot ([DateTime]::Now.ToString("yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $isolatedProfile | Out-Null

Start-Process -FilePath $edgePath -ArgumentList @(
  "--new-window",
  "--app=$url",
  "--user-data-dir=$isolatedProfile",
  "--disable-background-mode",
  "--window-position=0,0",
  "--window-size=$($screen.Width),$($screen.Height)",
  "--start-maximized"
) | Out-Null

Start-Sleep -Seconds 3

$target = $null
for ($i = 0; $i -lt 40; $i++) {
  $target = Get-Process msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.SessionId -eq $sessionId -and $_.StartTime -ge $before.AddSeconds(-2) -and $_.MainWindowHandle -ne 0 } |
    Sort-Object StartTime -Descending |
    Select-Object -First 1

  if ($target) {
    break
  }

  Start-Sleep -Milliseconds 250
}

if (-not $target) {
  $target = Get-Process msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.SessionId -eq $sessionId -and $_.MainWindowHandle -ne 0 } |
    Sort-Object StartTime -Descending |
    Select-Object -First 1
}

if (-not $target) {
  Write-Output "edge window not found"
  exit 1
}

[IntPtr]$topMost = New-Object IntPtr -1
[IntPtr]$notTopMost = New-Object IntPtr -2
$flags = 0x0040

[Win32LocalhostWindow]::ShowWindowAsync($target.MainWindowHandle, 9) | Out-Null
[Win32LocalhostWindow]::MoveWindow($target.MainWindowHandle, 0, 0, $screen.Width, $screen.Height, $true) | Out-Null
[Win32LocalhostWindow]::SetWindowPos($target.MainWindowHandle, $topMost, 0, 0, $screen.Width, $screen.Height, $flags) | Out-Null
[Win32LocalhostWindow]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
[Microsoft.VisualBasic.Interaction]::AppActivate($target.Id) | Out-Null
Start-Sleep -Milliseconds 300
[Win32LocalhostWindow]::SetWindowPos($target.MainWindowHandle, $notTopMost, 0, 0, $screen.Width, $screen.Height, $flags) | Out-Null
[Win32LocalhostWindow]::SetForegroundWindow($target.MainWindowHandle) | Out-Null

Write-Output ("focused msedge " + $target.Id)
