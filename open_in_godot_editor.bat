@echo off
setlocal
title Escape From Girls - Godot 4 Editor
chcp 65001 >nul 2>&1

set "LAUNCHER=%~dp0launch_godot.ps1"

if not exist "%LAUNCHER%" (
    echo [ERROR] Launcher script not found: "%LAUNCHER%"
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%LAUNCHER%" -Editor %*
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
    echo.
    echo [ERROR] Could not open the editor (exit code %RC%).
    echo Log file: "%TEMP%\escape_from_girls_launcher.log"
    timeout /t 10 /nobreak >nul 2>&1
)

exit /b %RC%
