@echo off
REM Secure Start Script - Encrypted Application Loader
REM This script starts the encrypted WhatsApp AI Bot

echo 🤖 Starting WhatsApp AI Bot...
echo =============================

REM Check if .env file exists
if not exist .env (
    echo ❌ Configuration file (.env) not found!
    echo    Please run setup.bat first
    pause
    exit /b 1
)

REM Check if DEEPSEEK_API_KEY is set
findstr /C:"DEEPSEEK_API_KEY=sk-" .env >nul 2>&1
if errorlevel 1 (
    echo ❌ DeepSeek API key not configured!
    echo    Please edit the .env file and add your API key
    echo    Get your API key from: https://platform.deepseek.com/
    pause
    exit /b 1
)

REM Check if encrypted core exists
if not exist core.enc (
    echo ❌ Application core not found!
    echo    Please ensure the installation is complete
    pause
    exit /b 1
)

echo ✅ Configuration found
echo 🚀 Starting encrypted application...
echo.
echo 📱 Instructions:
echo    1. Open the web interface at: http://localhost:3000
echo    2. Scan the QR code with WhatsApp
echo    3. The bot will be ready to receive messages!
echo.
echo 💡 To stop the bot, press Ctrl+C
echo.

REM Start the encrypted application
node app.js
