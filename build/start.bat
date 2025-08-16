@echo off
setlocal enabledelayedexpansion

REM WhatsApp AI Bot Startup Script for Windows
REM This script starts the WhatsApp AI Bot with enhanced user feedback

title WhatsApp AI Bot - Starting System...

REM Header
cls
echo ╔══════════════════════════════════════╗
echo ║          WhatsApp AI Bot             ║
echo ║         Starting System...           ║
echo ╚══════════════════════════════════════╝
echo.

REM Step 1: Environment checks
echo [STEP] 1/5 Checking system requirements...
timeout /t 1 /nobreak >nul

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo        Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js !NODE_VERSION! detected

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not available!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [SUCCESS] npm !NPM_VERSION! detected

REM Step 2: Configuration validation
echo [STEP] 2/5 Validating configuration...
timeout /t 1 /nobreak >nul

REM Check if .env file exists
if not exist .env (
    echo [ERROR] Configuration file (.env) not found!
    echo        Solution: Run 'setup.bat' first to configure the bot
    pause
    exit /b 1
)

echo [SUCCESS] Configuration file found

REM Check if DEEPSEEK_API_KEY is set
findstr /C:"DEEPSEEK_API_KEY=sk-" .env >nul 2>&1
if errorlevel 1 (
    echo [ERROR] DeepSeek API key not configured!
    echo        Solution: Edit the .env file and add your API key
    echo        Get your key from: https://platform.deepseek.com/
    pause
    exit /b 1
)

echo [SUCCESS] API key configuration validated

REM Step 3: Dependencies check
echo [STEP] 3/5 Checking dependencies...
timeout /t 1 /nobreak >nul

if not exist node_modules (
    echo [WARNING] Dependencies not installed. Installing now...
    npm install --silent
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully
) else (
    echo [SUCCESS] Dependencies are ready
)

REM Step 4: Port availability check
echo [STEP] 4/5 Checking port availability...
timeout /t 1 /nobreak >nul

netstat -an | findstr ":3000" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 3000 is already in use
    echo        The bot will try to use an alternative port
) else (
    echo [SUCCESS] Port 3000 is available
)

REM Step 5: Starting the application
echo [STEP] 5/5 Launching WhatsApp AI Bot...
timeout /t 1 /nobreak >nul

echo.
echo ╔══════════════════════════════════════╗
echo ║            READY TO START            ║
echo ╚══════════════════════════════════════╝
echo.

echo [INFO] Starting the WhatsApp AI Bot application...
echo.
echo 📱 NEXT STEPS:
echo    1. Wait for the application to start (usually takes 10-30 seconds)
echo    2. Open your web browser and go to: http://localhost:3000
echo    3. Scan the QR code with your WhatsApp mobile app
echo    4. Wait for the 'Connected!' message
echo    5. Your bot is now ready to receive messages!
echo.
echo 💡 TIPS:
echo    • Keep this window open while the bot is running
echo    • Press Ctrl+C to stop the bot
echo    • If QR code expires, restart the bot to get a new one
echo    • Check the web interface for connection status
echo.
echo ⏳ Starting application...
echo.

title WhatsApp AI Bot - Running

REM Start the bot with Node.js
npm start
