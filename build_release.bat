@echo off
echo Starting Release Build...
cd /d "%~dp0"
call ui\node_modules\.bin\tauri build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b %ERRORLEVEL%
)
echo Build successful!
pause
