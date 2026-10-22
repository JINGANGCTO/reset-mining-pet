$sh = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$petDir = $PSScriptRoot
$electronExe = Join-Path $petDir 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $electronExe)) { Write-Output 'electron 未安装，先运行 安装.bat'; exit 1 }
$lnk = $sh.CreateShortcut((Join-Path $desktop 'RESET挖矿.lnk'))
$lnk.TargetPath = $electronExe
$lnk.Arguments = '"' + $petDir + '"'
$lnk.WorkingDirectory = $petDir
$lnk.Description = 'RESET 挖矿桌宠'
$lnk.Save()
Write-Output '已创建桌面快捷方式 RESET挖矿.lnk'
