@echo off
title English Star Server
cd /d "%~dp0"

echo Stopping any old server on port 8888...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8888 " 2^>nul') do (
    taskkill /f /pid %%a >nul 2>nul
)
timeout /t 1 /nobreak >nul

del server.log 2>nul
echo Starting English Star server...
echo.
node server.cjs
echo.
echo Server stopped. Log:
echo.
type server.log 2>nul
echo.
pause
