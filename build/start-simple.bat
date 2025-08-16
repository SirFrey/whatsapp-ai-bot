@echo off
REM Simple WhatsApp AI Bot Startup Script for Windows
REM Fallback version for maximum compatibility

title WhatsApp AI Bot

cls
echo ===============================================
echo           WhatsApp AI Bot
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
echo ===============================================
echo.
echo Instructions:
echo 1. Wait for the application to start
echo 2. Open browser: http://localhost:3000
echo 3. Scan QR code with WhatsApp
echo 4. Wait for 'Connected!' message
echo.
echo Press Ctrl+C to stop the bot
echo.

npm start

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start application
    echo Try running: npm install
    echo.
    pause
)
