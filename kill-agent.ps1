param([switch]$All)
# 默认只杀挖矿 agent（保留 dashboard）；带 -All 时连 dashboard 一起杀
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*reset-signer.mjs agent*' -or ($All -and $_.CommandLine -like '*reset-signer.mjs dashboard*') } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
