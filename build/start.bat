@echo off
setlocal enabledelayedexpansion

REM WhatsApp AI Bot Startup Script for Windows
REM This script starts the WhatsApp AI Bot with enhanced user feedback

title WhatsApp AI Bot - Starting System...

REM Header
cls
echo ===============================================
echo           WhatsApp AI Bot
echo          Starting System...
echo ===============================================
echo.

REM Step 1: Environment checks
echo [STEP] 1/5 Checking system requirements...
ping 127.0.0.1 -n 2 >nul

REM Check if Node.js is available
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo        Please install Node.js from: https://nodejs.org/
    echo        Download the LTS version for Windows
    echo.
    pause
    exit /b 1
)

REM Get Node.js version (simplified)
echo [SUCCESS] Node.js is installed and available
node --version 2>nul && echo.

REM Check if npm is available
echo Checking npm availability...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not available!
    echo        npm should come with Node.js installation
    echo        Please reinstall Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] npm is available
npm --version 2>nul && echo.

REM Step 2: Configuration validation
echo [STEP] 2/5 Validating configuration...
ping 127.0.0.1 -n 2 >nul

REM Check if .env file exists
echo Checking configuration file...
if not exist .env (
    echo [ERROR] Configuration file (.env) not found!
    echo        Solution: Run 'setup.bat' first to configure the bot
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Configuration file found

REM Check if DEEPSEEK_API_KEY is set
echo Validating API key configuration...
findstr /C:"DEEPSEEK_API_KEY=sk-" .env >nul 2>&1
if errorlevel 1 (
    echo [ERROR] DeepSeek API key not configured!
    echo        Solution: Edit the .env file and add your API key
    echo        Get your key from: https://platform.deepseek.com/
    echo        The key should start with 'sk-'
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] API key configuration validated
echo.

REM Step 3: Dependencies check
echo [STEP] 3/5 Checking dependencies...
ping 127.0.0.1 -n 2 >nul

echo Checking Node.js dependencies...
if not exist node_modules (
    echo [WARNING] Dependencies not installed. Installing now...
    echo This may take a few minutes...
    echo.
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        echo        Please check your internet connection and try again
        echo        Or run 'npm install' manually
        echo.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully
) else (
    echo [SUCCESS] Dependencies are ready
)
echo.

REM Step 4: Port availability check
echo [STEP] 4/5 Checking port availability...
ping 127.0.0.1 -n 2 >nul

echo Checking if port 3000 is available...
netstat -an | findstr ":3000" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 3000 is already in use
    echo        The application will try to use an alternative port
    echo        If you have issues, close other applications using port 3000
) else (
    echo [SUCCESS] Port 3000 is available
)
echo.

REM Step 5: Starting the application
echo [STEP] 5/5 Launching WhatsApp AI Bot...
ping 127.0.0.1 -n 2 >nul

echo.
echo ===============================================
echo            READY TO START
echo ===============================================
echo.

echo [INFO] Starting the WhatsApp AI Bot application...
echo.
echo Next Steps:
echo    1. Wait for the application to start (usually 10-30 seconds)
echo    2. Open your web browser
echo    3. Go to: http://localhost:3000
echo    4. Scan the QR code with your WhatsApp mobile app
echo    5. Wait for the 'Connected!' message
echo    6. Your bot is now ready to receive messages!
echo.
echo Tips:
echo    - Keep this window open while the bot is running
echo    - Press Ctrl+C to stop the bot
echo    - If QR code expires, restart the bot to get a new one
echo    - Check the web interface for connection status
echo.
echo Starting application...
echo.

title WhatsApp AI Bot - Running

REM Start the bot with Node.js
echo Running: npm start
echo.

REM Try tsx first
npm start
if errorlevel 1 (
    echo.
    echo [WARNING] Primary start method failed, trying alternative...
    echo.
    
    REM Try building first then running
    echo Attempting to build and run...
    npm run build >nul 2>&1
    if not errorlevel 1 (
        echo Build successful, starting application...
        npm run start:build
    ) else (
        echo.
        echo [ERROR] All startup methods failed
        echo.
        echo Common solutions:
        echo 1. Install dependencies: npm install
        echo 2. Check your .env file configuration
        echo 3. Ensure port 3000 is not in use
        echo 4. Try running as administrator
        echo.
        echo Manual startup commands you can try:
        echo   npm install
        echo   npm run build
        echo   npm run start:build
        echo.
        pause
    )
)
