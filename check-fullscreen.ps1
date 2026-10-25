param([long]$Handle = 0)
# 检测前台窗口是否是全屏应用（游戏）
# 输出：game:<进程名> 或 none
# -Handle <hwnd> 仅用于测试：指定窗口代替前台窗口
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FgWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

$h = if ($Handle -ne 0) { [IntPtr]$Handle } else { [FgWin]::GetForegroundWindow() }
if ($h -eq [IntPtr]::Zero) { Write-Output 'none'; exit }

$r = New-Object FgWin+RECT
[void][FgWin]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left
$hgt = $r.Bottom - $r.Top

$style = [FgWin]::GetWindowLong($h, -16)          # GWL_STYLE
$hasCaption = ($style -band 0x00C00000) -ne 0     # WS_CAPTION
$hasThickFrame = ($style -band 0x00040000) -ne 0  # WS_THICKFRAME

$pid_ = 0
[void][FgWin]::GetWindowThreadProcessId($h, [ref]$pid_)
$pname = ''
try { $pname = (Get-Process -Id $pid_ -ErrorAction Stop).ProcessName } catch { }

$screen = [System.Windows.Forms.Screen]::FromHandle($h).Bounds
$fullW = $w -ge ($screen.Width - 2)
$fullH = $hgt -ge ($screen.Height - 2)

# 排除桌面/我们自己
$ignore = @('explorer', 'electron', 'ApplicationFrameHost', 'TextInputHost', 'ShellExperienceHost')

if ($fullW -and $fullH -and (-not $hasCaption) -and ($ignore -notcontains $pname) -and $pname) {
  Write-Output "game:$pname"
  exit
}

# 第二判据：Windows 官方全屏状态（D3D 独占全屏 / F11 全屏 / 演示模式）
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NotifState {
  [DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int state);
}
"@
$ns = 0
try { [void][NotifState]::SHQueryUserNotificationState([ref]$ns) } catch { $ns = 5 }
if ($ns -eq 2 -or $ns -eq 3 -or $ns -eq 4) {
  Write-Output "game:fullscreen-state-$ns"
  exit
}

Write-Output 'none'
