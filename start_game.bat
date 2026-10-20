@echo off
title Escape From Girls - Launcher

cd /d "%~dp0"

echo [1/4] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/4] Checking dependencies...
if not exist node_modules (
    echo [INFO] Dependencies not found. Installing packages with npm...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo [3/4] Starting game server on http://localhost:3000 ...
start "Escape From Girls Server" cmd /k "node server.js"

ping 127.0.0.1 -n 3 >nul

echo [4/4] Launching browser...
start http://localhost:3000

echo.
echo ========================================================
echo   Escape From Girls server is running!
echo   Close the server window when you want to stop playing.
echo ========================================================

