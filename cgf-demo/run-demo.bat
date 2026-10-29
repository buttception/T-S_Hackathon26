@echo off
rem Runs the vision demo with the local LLM, then shows the debrief and the trainee data.
rem Double-click this file (run-demo.bat --no-open checks the set-up without opening the browser). Close the browser window to finish; close the "CGF demo server" window to stop the server.
setlocal
cd /d "%~dp0"
set "PORT=8765"
set "MODEL=qwen2.5:3b"

rem ---- 1. Local LLM (Ollama): start it if it is not already running, then load the model so the first prompt is quick
curl -s -m 2 http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
  where ollama >nul 2>&1
  if errorlevel 1 (
    echo Ollama is not installed: the demo will use the keyword parser instead of the LLM.
    goto serve
  )
  echo Starting Ollama...
  start "Ollama" /min cmd /c "set OLLAMA_ORIGINS=* && ollama serve"
  timeout /t 6 /nobreak >nul
)
ollama list 2>nul | findstr /i /c:"%MODEL%" >nul
if errorlevel 1 (
  echo Model %MODEL% is not installed: the demo will use the keyword parser. See RUNNING.md, section 5.
) else (
  echo Loading %MODEL%...
  start "" /b curl -s -o nul http://localhost:11434/api/generate -d "{\"model\":\"%MODEL%\",\"keep_alive\":\"60m\"}"
)

:serve
rem ---- 2. Serve this folder on localhost (Ollama accepts localhost pages without extra settings)
set "URL=http://localhost:%PORT%/runtime.html?demo=vision&llm=1"
curl -s -m 2 -o nul "http://localhost:%PORT%/runtime.html" >nul 2>&1
if not errorlevel 1 goto open
where python >nul 2>&1
if errorlevel 1 (
  echo Python not found: opening the page from disk. If prompts say the model is unavailable, set OLLAMA_ORIGINS=* and restart Ollama.
  set "URL=file:///%CD:\=/%/runtime.html?demo=vision&llm=1"
  goto open
)
echo Starting the local web server on port %PORT%...
start "CGF demo server" /min python -m http.server %PORT% --bind 127.0.0.1
timeout /t 2 /nobreak >nul

:open
rem ---- 3. Open the demo full screen: Edge, then Chrome, then the default browser
echo Opening "%URL%"
if /i "%~1"=="--no-open" goto done
where msedge >nul 2>&1 && (start "" msedge --new-window --start-fullscreen "%URL%" & goto done)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --new-window --start-fullscreen "%URL%" & goto done)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --new-window --start-fullscreen "%URL%" & goto done)
start "" "%URL%"

:done
echo.
echo The demo plays by itself, then the debrief and the trainee data: about 4.5 minutes in all.
echo Space pauses, Esc stops it and gives you control, F11 leaves full screen.
endlocal
