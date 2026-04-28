Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class WindowTracker {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowThreadProcessId(IntPtr handle, out uint processId);
  }
"@

$hwnd = [WindowTracker]::GetForegroundWindow()
if ($hwnd -eq 0) { exit }

$pidVar = 0
[WindowTracker]::GetWindowThreadProcessId($hwnd, [ref]$pidVar) | Out-Null

$process = Get-Process -Id $pidVar -ErrorAction SilentlyContinue
if ($process) {
    Write-Output "$($process.ProcessName)|$($process.MainWindowTitle)"
}
