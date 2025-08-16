#!/bin/bash

# Secure Start Script - Encrypted Application Loader
# This script starts the encrypted WhatsApp AI Bot

echo "🤖 Starting WhatsApp AI Bot..."
echo "============================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Configuration file (.env) not found!"
    echo "   Please run ./setup.sh first"
    exit 1
fi

# Check if DEEPSEEK_API_KEY is set
if ! grep -q "DEEPSEEK_API_KEY=sk-" .env 2>/dev/null; then
    echo "❌ DeepSeek API key not configured!"
    echo "   Please edit the .env file and add your API key"
    echo "   Get your API key from: https://platform.deepseek.com/"
    exit 1
fi

# Check if encrypted core exists
if [ ! -f core.enc ]; then
    echo "❌ Application core not found!"
    echo "   Please ensure the installation is complete"
    exit 1
fi

echo "✅ Configuration found"
echo "🚀 Starting encrypted application..."
echo ""
echo "📱 Instructions:"
echo "   1. Open the web interface at: http://localhost:3000"
echo "   2. Scan the QR code with WhatsApp"
echo "   3. The bot will be ready to receive messages!"
echo ""
echo "💡 To stop the bot, press Ctrl+C"
echo ""

# Start the encrypted application
node app.js
