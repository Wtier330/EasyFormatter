@echo off
setlocal
chcp 65001 >nul

echo ==========================================
echo      EasyFormatter Project Cleanup
echo ==========================================
echo.
echo This script will delete the following directories to prepare for commit:
echo  - src-tauri/target (Rust build artifacts)
echo  - ui/node_modules  (Frontend dependencies)
echo  - ui/dist          (Frontend build output)
echo.
echo WARNING: You will need to re-download dependencies (npm install) and rebuild.
echo.

:PROMPT
set /P AREYOUSURE=Are you sure you want to proceed? (Y/[N])?
if /I "%AREYOUSURE%" NEQ "Y" GOTO END

echo.
echo [1/3] Cleaning Rust target directory...
if exist "src-tauri\target" (
    rd /s /q "src-tauri\target"
    echo    - Deleted src-tauri\target
) else (
    echo    - src-tauri\target not found (already clean)
)

echo.
echo [2/3] Cleaning UI node_modules...
if exist "ui\node_modules" (
    rd /s /q "ui\node_modules"
    echo    - Deleted ui\node_modules
) else (
    echo    - ui\node_modules not found (already clean)
)

echo.
echo [3/3] Cleaning UI dist directory...
if exist "ui\dist" (
    rd /s /q "ui\dist"
    echo    - Deleted ui\dist
) else (
    echo    - ui\dist not found (already clean)
)

echo.
echo Cleanup complete! The project is ready for submission.
echo.

:END
pause
