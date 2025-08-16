#!/bin/bash

# WhatsApp AI Bot Setup Script
# This script will help you set up the WhatsApp AI Bot easily

echo "🤖 WhatsApp AI Bot - Easy Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   Visit: https://nodejs.org/"
    echo "   Download and install the LTS version"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required"
    echo "   Current version: $(node --version)"
    echo "   Please update Node.js to version 18 or higher"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

echo ""
echo "📋 Preparing application..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating configuration file..."
    cat > .env << EOL
# API Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Timezone (Venezuela timezone by default)
BOT_DEFAULT_TZ=America/Caracas

# Cal.com Configuration (Optional - for appointment booking)
CALCOM_USERNAME=your_calcom_username
CALCOM_EVENT_TYPE_SLUG=your_event_type_slug
CALCOM_EVENT_TYPE_ID=your_event_type_id
EOL
    echo "✅ Configuration file created!"
    echo ""
    echo "⚠️  IMPORTANT: You need to edit the .env file with your API keys:"
    echo "   1. Get your DeepSeek API key from: https://platform.deepseek.com/"
    echo "   2. Optional: Set up Cal.com for appointment booking"
    echo ""
else
    echo "✅ Configuration file already exists"
fi

# Install dependencies quietly
echo "📦 Installing required components..."
npm install --silent >/dev/null 2>&1

# Hide source code from non-technical users
if [ -d "src" ]; then
    echo "🔒 Securing application files..."
    chmod 700 src/
    chmod 600 src/*
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your API keys"
echo "2. Run the bot with: ./start.sh"
echo "3. Scan the QR code with WhatsApp"
echo ""
echo "For help, check the User_Guide.md file"
