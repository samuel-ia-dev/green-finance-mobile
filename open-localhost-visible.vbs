Option Explicit

Dim shell, fso, edgePath, baseDir, profileDir, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

If fso.FileExists("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") Then
  edgePath = """C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"""
ElseIf fso.FileExists("C:\Program Files\Microsoft\Edge\Application\msedge.exe") Then
  edgePath = """C:\Program Files\Microsoft\Edge\Application\msedge.exe"""
Else
  WScript.Quit 1
End If

baseDir = shell.ExpandEnvironmentStrings("%TEMP%") & "\green-finance-localhost-edge"
If Not fso.FolderExists(baseDir) Then
  fso.CreateFolder baseDir
End If

profileDir = baseDir & "\" & Replace(Replace(Replace(CStr(Now), "/", ""), ":", ""), " ", "-")
If Not fso.FolderExists(profileDir) Then
  fso.CreateFolder profileDir
End If

command = edgePath & " --kiosk http://127.0.0.1:19011/?ts=" & Replace(CStr(Timer), ",", "") & " --edge-kiosk-type=fullscreen --user-data-dir=""" & profileDir & """"
shell.Run command, 1, False
WScript.Sleep 2500
On Error Resume Next
shell.AppActivate "Microsoft Edge"
On Error GoTo 0
