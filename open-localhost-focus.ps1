$url = "http://127.0.0.1:19011/?ts=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (-not (Test-Path $edgePath)) {
  $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$arguments = "--app=$url --new-window --start-maximized"
$process = Start-Process -FilePath $edgePath -ArgumentList $arguments -PassThru

Start-Sleep -Seconds 3

Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32Focus {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$target = $null
for ($i = 0; $i -lt 20; $i++) {
  $candidate = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
  if ($candidate -and $candidate.MainWindowHandle -ne 0) {
    $target = $candidate
    break
  }
  Start-Sleep -Milliseconds 400
}

if ($target) {
  [Win32Focus]::ShowWindowAsync($target.MainWindowHandle, 3) | Out-Null
  [Win32Focus]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
  [Microsoft.VisualBasic.Interaction]::AppActivate($target.Id) | Out-Null
  Write-Output ("focused msedge " + $target.Id)
} else {
  Write-Output ("started msedge " + $process.Id)
}
