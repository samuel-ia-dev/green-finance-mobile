$names = @("msedge.exe", "mshta.exe", "explorer.exe", "chrome.exe", "Code.exe")

Get-CimInstance Win32_Process |
  Where-Object { $names -contains $_.Name } |
  Sort-Object Name, ProcessId |
  Select-Object Name, ProcessId, SessionId, CommandLine |
  Format-List
