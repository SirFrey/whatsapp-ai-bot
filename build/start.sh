#!/bin/bash

# WhatsApp AI Bot Startup Script
# This script starts the WhatsApp AI Bot with enhanced user feedback

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Header
clear
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          WhatsApp AI Bot             ║${NC}"
echo -e "${CYAN}║         Starting System...           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# Step 1: Environment checks
print_step "1/5 Checking system requirements..."
sleep 1

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo "       Please install Node.js from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js ${NODE_VERSION} detected"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not available!"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm ${NPM_VERSION} detected"

# Step 2: Configuration validation
print_step "2/5 Validating configuration..."
sleep 1

# Check if .env file exists
if [ ! -f .env ]; then
    print_error "Configuration file (.env) not found!"
    echo "       ${YELLOW}Solution:${NC} Run './setup.sh' first to configure the bot"
    exit 1
fi

print_success "Configuration file found"

# Check if DEEPSEEK_API_KEY is set
if ! grep -q "DEEPSEEK_API_KEY=sk-" .env 2>/dev/null; then
    print_error "DeepSeek API key not configured!"
    echo "       ${YELLOW}Solution:${NC} Edit the .env file and add your API key"
    echo "       ${BLUE}Get your key from:${NC} https://platform.deepseek.com/"
    exit 1
fi

print_success "API key configuration validated"

# Step 3: Dependencies check
print_step "3/5 Checking dependencies..."
sleep 1

if [ ! -d node_modules ]; then
    print_warning "Dependencies not installed. Installing now..."
    npm install --silent
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_success "Dependencies are ready"
fi

# Step 4: Port availability check
print_step "4/5 Checking port availability..."
sleep 1

PORT=${PORT:-3000}
if lsof -i:$PORT &> /dev/null; then
    print_warning "Port $PORT is already in use"
    echo "       The bot will try to use an alternative port"
else
    print_success "Port $PORT is available"
fi

# Step 5: Starting the application
print_step "5/5 Launching WhatsApp AI Bot..."
sleep 1

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            READY TO START            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

print_status "Starting the WhatsApp AI Bot application..."
echo ""
echo -e "${GREEN}📱 NEXT STEPS:${NC}"
echo -e "   ${BLUE}1.${NC} Wait for the application to start (usually takes 10-30 seconds)"
echo -e "   ${BLUE}2.${NC} Open your web browser and go to: ${YELLOW}http://localhost:3000${NC}"
echo -e "   ${BLUE}3.${NC} Scan the QR code with your WhatsApp mobile app"
echo -e "   ${BLUE}4.${NC} Wait for the 'Connected!' message"
echo -e "   ${BLUE}5.${NC} Your bot is now ready to receive messages!"
echo ""
echo -e "${PURPLE}💡 TIPS:${NC}"
echo -e "   • Keep this terminal window open while the bot is running"
echo -e "   • Press ${RED}Ctrl+C${NC} to stop the bot"
echo -e "   • If QR code expires, restart the bot to get a new one"
echo -e "   • Check the web interface for connection status"
echo ""
echo -e "${YELLOW}⏳ Starting application...${NC}"
echo ""

# Start the bot with Node.js
npm start
