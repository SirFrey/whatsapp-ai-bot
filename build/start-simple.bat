@echo off
REM Simple WhatsApp AI Bot Startup Script for Windows
REM Fallback version for maximum compatibility
REM Usage: start-simple.bat [-p port]

setlocal enabledelayedexpansion

title WhatsApp AI Bot

REM Parse port argument
set "CUSTOM_PORT=3000"
if "%~1"=="-p" set "CUSTOM_PORT=%~2"
if "%~1"=="--port" set "CUSTOM_PORT=%~2"

cls
echo ===============================================
echo           WhatsApp AI Bot
echo           Port: %CUSTOM_PORT%
echo ===============================================
echo.

echo Checking system...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo OK: Node.js is installed

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found!
    echo Please reinstall Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo OK: npm is available

REM Check .env file
if not exist .env (
    echo ERROR: Configuration file (.env) not found!
    echo Please run setup.bat first.
    echo.
    pause
    exit /b 1
)
echo OK: Configuration file found

REM Update port if custom port specified
if not "%CUSTOM_PORT%"=="3000" (
    echo Setting custom port %CUSTOM_PORT%...
    findstr /V "^PORT=" .env > .env.tmp
    echo PORT=%CUSTOM_PORT% >> .env.tmp
    move .env.tmp .env >nul
    echo OK: Port updated to %CUSTOM_PORT%
)

REM Check API key
findstr "DEEPSEEK_API_KEY=sk-" .env >nul 2>&1
if errorlevel 1 (
    echo ERROR: API key not configured!
    echo Please edit .env file and add your DeepSeek API key.
    echo Get your key from: https://platform.deepseek.com/
    echo.
    pause
    exit /b 1
)
echo OK: API key configured

echo.
echo ===============================================
echo Starting WhatsApp AI Bot...
echo Port: %CUSTOM_PORT%
echo URL: http://localhost:%CUSTOM_PORT%
echo ===============================================
echo.
echo Instructions:
echo 1. Wait for the application to start
echo 2. Open browser: http://localhost:%CUSTOM_PORT%
echo 3. Scan QR code with WhatsApp
echo 4. Wait for 'Connected!' message
echo.
echo Press Ctrl+C to stop the bot
echo Usage: start-simple.bat -p [port]
echo.

REM Set PORT environment variable
set PORT=%CUSTOM_PORT%

REM Start and show all output
echo Starting application (all output shown below):
echo ================================================
npm start

if errorlevel 1 (
    echo.
    echo ================================================
    echo ERROR: Failed to start application
    echo Try running: npm install
    echo Or try: start-simple.bat -p 8080
    echo.
    pause
)
