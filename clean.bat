@echo off
chcp 65001 >nul
echo 正在清理项目临时文件...

REM 清理 PyInstaller 生成的目录
if exist build (
    echo [删除] build 目录...
    rmdir /s /q build
)
if exist dist (
    echo [删除] dist 目录...
    rmdir /s /q dist
)

REM 清理 PyInstaller spec 文件
if exist *.spec (
    echo [删除] spec 文件...
    del /q *.spec
)

REM 递归清理 __pycache__ 目录
echo [清理] 所有 __pycache__ 目录...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"

echo.
echo 清理完成！可以放心提交代码了。
pause
