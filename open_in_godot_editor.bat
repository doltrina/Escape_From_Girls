@echo off
title Escape From Girls - Open in Godot 4 Editor
cd /d "%~dp0"

set "GODOT_EXE=G:\steam\steamapps\common\Godot Engine\godot.windows.opt.tools.64.exe"

if not exist "%GODOT_EXE%" (
    echo [ERROR] Godot executable not found at: %GODOT_EXE%
    echo Checking PATH for godot...
    where godot >nul 2>nul
    if %errorlevel% neq 0 (
        echo Please ensure Godot 4 is installed.
        pause
        exit /b 1
    )
    set "GODOT_EXE=godot"
)

echo [INFO] Opening project in Godot 4 Editor...
start "" "%GODOT_EXE%" -e --path "%~dp0godot"
exit /b 0
