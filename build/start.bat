@echo off
setlocal enabledelayedexpansion

REM WhatsApp AI Bot Startup Script for Windows
REM This script starts the WhatsApp AI Bot with enhanced user feedback
REM Usage: start.bat [-p port] or start.bat --port port

title WhatsApp AI Bot - Starting System...

REM Change to the project root directory (one level up from build)
cd /d "%~dp0\.."

REM Parse command line arguments
set "CUSTOM_PORT="
set "PORT_FLAG="

:parse_args
if "%~1"=="" goto args_done
if "%~1"=="-p" (
    set "PORT_FLAG=1"
    shift
    goto parse_args
)
if "%~1"=="--port" (
    set "PORT_FLAG=1"
    shift
    goto parse_args
)
if defined PORT_FLAG (
    set "CUSTOM_PORT=%~1"
    set "PORT_FLAG="
    shift
    goto parse_args
)
shift
goto parse_args

:args_done

REM Set default port if not specified
if not defined CUSTOM_PORT set "CUSTOM_PORT=3000"

REM Header
cls
echo ===============================================
echo           WhatsApp AI Bot
echo          Starting System...
echo           Port: %CUSTOM_PORT%
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

REM Update port in .env file if custom port specified
if not "%CUSTOM_PORT%"=="3000" (
    echo [INFO] Setting custom port %CUSTOM_PORT% in configuration...
    
    REM Create temporary file without PORT line
    findstr /V "^PORT=" .env > .env.tmp
    
    REM Add new PORT line
    echo PORT=%CUSTOM_PORT% >> .env.tmp
    
    REM Replace original file
    move .env.tmp .env >nul
    echo [SUCCESS] Port updated to %CUSTOM_PORT%
)

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
    echo Installing dependencies (output will be shown):
    echo ================================================
    npm install
    echo ================================================
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

echo Checking if port %CUSTOM_PORT% is available...
netstat -an | findstr ":%CUSTOM_PORT%" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port %CUSTOM_PORT% is already in use
    echo        The application will try to use an alternative port
    echo        If you have issues, close other applications using port %CUSTOM_PORT%
    echo        Or try a different port: start.bat -p 3001
) else (
    echo [SUCCESS] Port %CUSTOM_PORT% is available
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
echo       Port: %CUSTOM_PORT%
echo       URL: http://localhost:%CUSTOM_PORT%
echo.
echo Next Steps:
echo    1. Wait for the application to start (usually 10-30 seconds)
echo    2. Open your web browser
echo    3. Go to: http://localhost:%CUSTOM_PORT%
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
echo Usage: start.bat [-p port] or start.bat --port port
echo Example: start.bat -p 8080
echo.
echo Starting application...
echo ================================================
echo.

title WhatsApp AI Bot - Running (Port %CUSTOM_PORT%)

REM Start the bot with Node.js - show all output
echo [INFO] Executing: npm start
echo [INFO] All application output will be shown below:
echo ================================================

REM Set the PORT environment variable for the application
set PORT=%CUSTOM_PORT%

REM Try tsx first
npm start
if errorlevel 1 (
    echo.
    echo ================================================
    echo [WARNING] Primary start method failed, trying alternative...
    echo ================================================
    
    REM Try building first then running
    echo [INFO] Attempting to build and run...
    echo [INFO] Building TypeScript...
    npm run build
    if not errorlevel 1 (
        echo [SUCCESS] Build successful, starting application...
        echo ================================================
        npm run start:prod
    ) else (
        echo.
        echo ================================================
        echo [ERROR] All startup methods failed
        echo ================================================
        echo.
        echo Common solutions:
        echo 1. Install dependencies: npm install
        echo 2. Check your .env file configuration
        echo 3. Ensure port %CUSTOM_PORT% is not in use
        echo 4. Try running as administrator
        echo 5. Try a different port: start.bat -p 3001
        echo.
        echo Manual startup commands you can try:
        echo   npm install
        echo   npm run build
        echo   npm run start:prod
        echo   start.bat -p 8080
        echo.
        pause
    )
)
