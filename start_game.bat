@echo off
title Escape From Girls - Launcher

cd /d "%~dp0"

echo [1/3] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/3] Starting game server on http://localhost:3000 ...
start "Escape From Girls Server" cmd /k "node server.js"

ping 127.0.0.1 -n 3 >nul

echo [3/3] Launching browser...
start http://localhost:3000

echo.
echo ========================================================
echo   Escape From Girls server is running!
echo   Close the server window when you want to stop playing.
echo ========================================================
