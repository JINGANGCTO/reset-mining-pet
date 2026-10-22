# 杀掉所有本地 RESET 挖矿 agent + dashboard 进程
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*reset-signer.mjs agent*' -or $_.CommandLine -like '*reset-signer.mjs dashboard*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
