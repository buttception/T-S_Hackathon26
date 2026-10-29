# Minimal Chrome DevTools Protocol driver for headless Edge or Chrome (PowerShell 5.1, no installs).
# Used by run-tests.ps1. It opens a page in a fresh headless browser, lets it run in REAL time (a plain
# `--dump-dom` returns right after load, before async test pages have run), and evaluates JavaScript in it.
#
#   . .\cdp.ps1
#   $b = Start-Cdp -Url 'file:///C:/.../tests/link.html' -Port 9400
#   Eval-Cdp 'document.getElementById("summary").textContent'
#   Stop-Cdp $b
#
# Owner: JL (runner/). Windows only: it looks for Edge, then Chrome, in their usual install folders.

function Find-Browser {
  $candidates = @(
    "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "$env:ProgramFiles (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  throw 'No Edge or Chrome found in the usual install folders.'
}

function Start-Cdp([string]$Url, [int]$Port = 9400) {
  $browser = Find-Browser
  $profile = Join-Path $env:TEMP "cgf_cdp_$Port"
  if (Test-Path $profile) { Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue }
  $proc = Start-Process $browser -PassThru -ArgumentList @('--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--remote-allow-origins=*', "--remote-debugging-port=$Port", "--user-data-dir=$profile", '--window-size=1500,1000', 'about:blank')
  $target = $null
  for ($i = 0; $i -lt 60 -and -not $target; $i++) {
    Start-Sleep -Milliseconds 250
    try {
      $null = Invoke-RestMethod "http://127.0.0.1:$Port/json/version" -TimeoutSec 2
      $target = Invoke-RestMethod -Method Put -Uri ("http://127.0.0.1:$Port/json/new?" + $Url) -TimeoutSec 5   # a fresh tab at the URL
    } catch { }
  }
  if (-not $target) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue; throw "No debugging target on port $Port." }
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.ConnectAsync([Uri][string]@($target.webSocketDebuggerUrl)[0], [Threading.CancellationToken]::None).Wait()
  return [pscustomobject]@{ Process = $proc; Socket = $ws; Id = 0; Profile = $profile }
}

function Send-Cdp($b, [string]$Method, $Params) {
  $b.Id++
  $myId = $b.Id
  $json = @{ id = $myId; method = $Method; params = $Params } | ConvertTo-Json -Depth 10 -Compress
  $b.Socket.SendAsync([ArraySegment[byte]][Text.Encoding]::UTF8.GetBytes($json), 'Text', $true, [Threading.CancellationToken]::None).Wait()
  $buf = New-Object byte[] 1048576
  while ($true) {
    $sb = New-Object Text.StringBuilder
    do {
      if ($b.Socket.State -ne 'Open') { throw "The browser connection closed ($($b.Socket.State))." }
      $r = $b.Socket.ReceiveAsync([ArraySegment[byte]]$buf, [Threading.CancellationToken]::None).Result
      [void]$sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $r.Count))
    } until ($r.EndOfMessage)
    $msg = $sb.ToString() | ConvertFrom-Json
    if ($msg.id -eq $myId) { return $msg }
  }
}

# Evaluates an expression in the page and returns its value (strings, numbers, booleans). Returns "EXC: ..." on a page error.
function Eval-Cdp($b, [string]$Expr) {
  $r = Send-Cdp $b 'Runtime.evaluate' @{ expression = $Expr; returnByValue = $true; awaitPromise = $true }
  if ($r.result.exceptionDetails) { return 'EXC: ' + $r.result.exceptionDetails.text + ' ' + $r.result.exceptionDetails.exception.description }
  return $r.result.result.value
}

function Stop-Cdp($b) {
  if (-not $b) { return }
  try { $b.Socket.Dispose() } catch { }
  try { Stop-Process -Id $b.Process.Id -Force -ErrorAction SilentlyContinue } catch { }
  Start-Sleep -Milliseconds 300
  try { Remove-Item $b.Profile -Recurse -Force -ErrorAction SilentlyContinue } catch { }
}
