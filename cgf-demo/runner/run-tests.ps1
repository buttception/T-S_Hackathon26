# Runs every browser test page in tests/ in a headless Edge or Chrome and prints one line per page.
# There is no Node on the project laptops, so the tests are HTML pages (open them by hand in a browser); this script is
# the command-line way to run them all before a push. Exit code 0 when every page passes, 1 otherwise.
#
#   powershell -ExecutionPolicy Bypass -File runner\run-tests.ps1                  all pages
#   powershell -ExecutionPolicy Bypass -File runner\run-tests.ps1 -Pages allocate,link
#   powershell -ExecutionPolicy Bypass -File runner\run-tests.ps1 -TimeoutSec 180
#
# A page counts as finished when it sets data-done on #summary (the slow link test does), or when its summary reads
# "N / N passed" (or "M / N passed") and has stopped changing. A page that never reports counts as a failure.
# Owner: JL (runner/). Needs Windows PowerShell 5.1 and Edge or Chrome. Pass -Verbose to list the passing pages' counts.
param(
  [string[]]$Pages,
  [int]$TimeoutSec = 150,
  [int]$FirstPort = 9400
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'cdp.ps1')

$tests = Join-Path (Split-Path $PSScriptRoot -Parent) 'tests'
$files = if ($Pages) { $Pages | ForEach-Object { Join-Path $tests ($_ -replace '\.html$', '' | ForEach-Object { "$_.html" }) } }
         else { Get-ChildItem $tests -Filter *.html | Sort-Object Name | ForEach-Object { $_.FullName } }

$script:failed = 0; $port = $FirstPort; $summary = @()
foreach ($file in $files) {
  $name = [IO.Path]::GetFileName($file)
  if (-not (Test-Path $file)) { Write-Host ("FAIL  {0,-18} not found" -f $name); $failed++; continue }
  $waitsForDone = [bool](Select-String -Path $file -Pattern 'dataset\.done' -Quiet)
  $url = 'file:///' + ($file -replace '\\', '/')
  $b = $null; $result = $null; $started = Get-Date
  try {
    $thisPort = $port; $port++
    $b = Start-Cdp -Url $url -Port $thisPort
    $last = $null; $same = 0
    while (((Get-Date) - $started).TotalSeconds -lt $TimeoutSec) {
      Start-Sleep -Seconds 2
      $state = Eval-Cdp $b "(function(){var s=document.getElementById('summary');if(!s)return JSON.stringify({text:'',done:false});return JSON.stringify({text:s.textContent,done:s.dataset.done==='1'});})()"
      if ($state -like 'EXC*') { $same = 0; continue }
      $o = $state | ConvertFrom-Json
      if ($o.text -eq $last) { $same++ } else { $same = 0; $last = $o.text }
      $reported = $o.text -match '^\d+ / \d+ passed$'
      if ($reported -and (($waitsForDone -and $o.done) -or (-not $waitsForDone -and $same -ge 2))) { break }
    }
    $text = Eval-Cdp $b "(document.getElementById('summary')||{}).textContent||''"
    $fails = Eval-Cdp $b "[].slice.call(document.querySelectorAll('li.fail')).map(function(l){return l.textContent;}).join('\n')"
    $result = @{ Text = $text; Fails = $fails }
  } catch { $result = @{ Text = ''; Fails = $_.Exception.Message } }
  finally { Stop-Cdp $b }

  $secs = [int]((Get-Date) - $started).TotalSeconds
  $m = [regex]::Match([string]$result.Text, '^(\d+) / (\d+) passed$')
  $ok = $m.Success -and $m.Groups[1].Value -eq $m.Groups[2].Value -and [int]$m.Groups[2].Value -gt 0 -and -not $result.Fails
  if ($ok) { Write-Host ("PASS  {0,-18} {1,3} / {1,3}   {2,3} s" -f $name, [int]$m.Groups[2].Value, $secs) -ForegroundColor Green }
  else {
    $failed++
    $why = if ($m.Success) { "$($m.Groups[1].Value) / $($m.Groups[2].Value) passed" } else { 'no result reported (timed out or the page did not load)' }
    Write-Host ("FAIL  {0,-18} {1}   {2} s" -f $name, $why, $secs) -ForegroundColor Red
    if ($result.Fails) { ($result.Fails -split "`n") | Where-Object { $_ } | Select-Object -First 12 | ForEach-Object { Write-Host "        $_" -ForegroundColor Red } }
  }
}
Write-Host ''
if ($failed) { Write-Host "$failed page(s) failed." -ForegroundColor Red; exit 1 }
Write-Host 'All test pages passed.' -ForegroundColor Green; exit 0
