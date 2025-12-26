@echo off
set PATH=%PATH%;C:\Users\witer\.cargo\bin
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
cd /d "%~dp0"

echo Checking frontend dependencies...
cd ui
if not exist node_modules (
    echo node_modules not found. Installing dependencies...
    call npm install
)
cd ..

echo Building application...
call ui\node_modules\.bin\tauri.cmd build
