# 输出本地 RESET 挖矿 agent 进程数量（0 = 未运行，>=1 = 运行中）
$count = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*reset-signer.mjs agent*' }).Count
Write-Output $count
