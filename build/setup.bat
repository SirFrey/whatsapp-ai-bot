@echo off
REM WhatsApp AI Bot Setup Script for Windows
REM This script will help you set up the WhatsApp AI Bot easily

echo 🤖 WhatsApp AI Bot - Easy Setup
echo ================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first:
    echo    Visit: https://nodejs.org/
    echo    Download and install the LTS version
    pause
    exit /b 1
)

REM Check if Bun is installed
bun --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Please install required runtime first:
    echo    Visit: https://bun.sh/
    echo    Follow the Windows installation instructions
    pause
    exit /b 1
) else (
    echo ✅ Runtime already available
)

echo.
echo 📋 Preparing application...

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating configuration file...
    (
        echo # API Configuration
        echo DEEPSEEK_API_KEY=your_deepseek_api_key_here
        echo CALCOM_API_KEY=your_calcom_api_key_here

        echo CALCOM_USERNAME=your_calcom_username
        echo CALCOM_EVENT_TYPE_SLUG=your_event_type_slug
    ) > .env
    echo ✅ Configuration file created!
    echo.
    echo ⚠️  IMPORTANT: You need to edit the .env file with your API keys:
    echo    1. Get your DeepSeek API key from: https://platform.deepseek.com/
    echo    2. Optional: Set up Cal.com for appointment booking
    echo.
) else (
    echo ✅ Configuration file already exists
)

REM Install dependencies quietly
echo 📦 Installing required components...
bun install --silent >nul 2>&1

REM Hide source code from non-technical users
if exist src (
    echo 🔒 Securing application files...
    attrib +h src
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit the .env file with your API keys
echo 2. Run the bot with: start.bat
echo 3. Scan the QR code with WhatsApp
echo.
echo For help, check the User_Guide.md file
pause
