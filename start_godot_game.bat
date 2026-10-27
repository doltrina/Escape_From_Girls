@echo off
setlocal
title Escape From Girls - Launcher
chcp 65001 >nul 2>&1

set "LAUNCHER=%~dp0launch_godot.ps1"

if not exist "%LAUNCHER%" (
    echo [ERROR] Launcher script not found: "%LAUNCHER%"
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%LAUNCHER%" %*
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
    echo.
    echo [ERROR] Launch failed with exit code %RC%.
    echo Log file: "%TEMP%\escape_from_girls_launcher.log"
    rem Give the user a moment to read the error, then close on its own.
    timeout /t 10 /nobreak >nul 2>&1
)

exit /b %RC%
