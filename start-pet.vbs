Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = scriptDir & "\node_modules\electron\dist\electron.exe"
WshShell.Run """" & exe & """ """ & scriptDir & """", 0, False
