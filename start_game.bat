@echo off
chcp 65001 >nul
title Escape From Girls - Launcher

echo ========================================================
echo   🎮 Запуск Escape From Girls: Сохрани девственность!
echo ========================================================
echo.

cd /d "%~dp0"

echo Проверка наличия Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установлен!
    echo Установите Node.js с официального сайта: https://nodejs.org/
    pause
    exit /b 1
)

echo Запуск локального сервера...
start "" node server.js

echo Ожидание запуска сервера...
timeout /t 2 /nobreak >nul

echo Открытие игры в браузере...
start http://localhost:3000

echo.
echo Сервер успешно запущен на http://localhost:3000
echo Чтобы остановить сервер, закройте окно с запущенной нодой.
echo Приятной игры!
