Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir

' Once the audio environment is ready, launch the native WinExe directly.
' This avoids opening a console and repeating a costly PyTorch/CUDA import
' check on every ordinary start.
appExe = appDir & "\desktop\publish\Tembr.exe"
pythonExe = appDir & "\backend\venv\Scripts\python.exe"
installMarker = appDir & "\backend\venv\.tembr-install-complete"
If fso.FileExists(appExe) And fso.FileExists(pythonExe) And fso.FileExists(installMarker) Then
    shell.Run """" & appExe & """", 0, False
Else
    ' Keep the first-time dependency setup visible so its progress and errors
    ' are understandable. Subsequent launches use the quiet fast path above.
    shell.Run """" & appDir & "\run.bat" & """", 1, False
End If
