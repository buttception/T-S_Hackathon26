@echo off
rem Stops everything run-demo.bat started, so you can start again cleanly.
rem   stop-demo.bat              stop the web server and Ollama
rem   stop-demo.bat --keep-llm   stop the web server only (Ollama stays loaded, so the next start is quicker)
rem   stop-demo.bat --browser    also close every Edge and Chrome window (all tabs, not just the demo)
rem   stop-demo.bat --dry-run    only list what would be stopped
setlocal EnableDelayedExpansion
set "PORT=8765"
set "DRY=" & set "KEEPLLM=" & set "BROWSER="
for %%a in (%*) do (
  if /i "%%~a"=="--dry-run"  set "DRY=1"
  if /i "%%~a"=="--keep-llm" set "KEEPLLM=1"
  if /i "%%~a"=="--browser"  set "BROWSER=1"
)
if defined DRY echo Dry run: nothing is stopped.

rem ---- 1. The web server on port %PORT% (whatever is listening there)
set "FOUND="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  if not "%%p"=="0" if not defined SEEN_%%p (
    set "SEEN_%%p=1" & set "FOUND=1"
    echo Web server on port %PORT%: process %%p
    if not defined DRY taskkill /PID %%p /F >nul 2>&1
  )
)
if not defined FOUND echo No web server on port %PORT%.
if not defined DRY taskkill /FI "WINDOWTITLE eq CGF demo server*" /F >nul 2>&1

rem ---- 2. Ollama (the local LLM)
if defined KEEPLLM (
  echo Ollama left running.
) else (
  tasklist /FI "IMAGENAME eq ollama.exe" 2>nul | findstr /i /c:"ollama.exe" >nul
  if errorlevel 1 (
    echo Ollama is not running.
  ) else (
    echo Ollama: ollama.exe
    if not defined DRY taskkill /IM ollama.exe /F >nul 2>&1
  )
  tasklist /FI "IMAGENAME eq ollama app.exe" 2>nul | findstr /i /c:"ollama app.exe" >nul
  if not errorlevel 1 (
    echo Ollama tray app: ollama app.exe
    if not defined DRY taskkill /IM "ollama app.exe" /F >nul 2>&1
  )
  if not defined DRY taskkill /FI "WINDOWTITLE eq Ollama*" /F >nul 2>&1
)

rem ---- 3. The browser (only when asked: it closes every window, not just the demo)
if defined BROWSER (
  echo Browsers: every Edge and Chrome window.
  if not defined DRY (
    taskkill /IM msedge.exe /F >nul 2>&1
    taskkill /IM chrome.exe /F >nul 2>&1
  )
) else (
  echo Browser left open: close the demo window yourself, or use stop-demo.bat --browser.
)

echo.
if defined DRY (echo Dry run finished.) else (echo Stopped. Run run-demo.bat to start again.)
endlocal
