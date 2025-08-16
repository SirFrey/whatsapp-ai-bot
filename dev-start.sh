#!/bin/bash

# WhatsApp AI Bot - Enhanced Development Start Script
# This script provides detailed feedback during startup for developers

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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Header
clear
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║               WhatsApp AI Bot (Dev Mode)             ║${NC}"
echo -e "${CYAN}║                  Enhanced Startup                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Development environment check
print_step "Development Environment Check"
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "Not in project root directory!"
    echo "       Please run this script from the whatsapp-ai-bot directory"
    exit 1
fi

print_success "Project root directory confirmed"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo "       Please install Node.js from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js ${NODE_VERSION} detected"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not available!"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm ${NPM_VERSION} detected"

# Check TypeScript compiler
if ! command -v npx &> /dev/null; then
    print_warning "npx not available, some features may not work"
else
    print_success "npx available for TypeScript execution"
fi

echo ""
print_step "Configuration & Dependencies"
echo ""

# Check .env file
if [ ! -f .env ]; then
    print_warning "No .env file found"
    if [ -f .env.example ]; then
        print_status "Creating .env from .env.example..."
        cp .env.example .env
        print_success ".env file created from template"
        echo ""
        print_warning "Please edit .env file with your API keys before continuing"
        echo "       Required: DEEPSEEK_API_KEY"
        echo "       Get your key from: https://platform.deepseek.com/"
        echo ""
        read -p "Press Enter after configuring your .env file..."
    else
        print_error "No .env.example template found!"
        exit 1
    fi
fi

# Validate API key
if ! grep -q "DEEPSEEK_API_KEY=sk-" .env 2>/dev/null; then
    print_warning "DeepSeek API key not configured or invalid"
    echo "       Please edit .env and add a valid API key (starts with 'sk-')"
    echo "       Get your key from: https://platform.deepseek.com/"
    echo ""
    read -p "Press Enter after adding your API key..."
fi

print_success "Configuration validated"

# Check dependencies
if [ ! -d node_modules ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_success "Dependencies are ready"
fi

# Check if TypeScript needs compilation
if [ ! -d dist ] || [ src -nt dist ]; then
    print_status "TypeScript files need compilation..."
    npm run build
    if [ $? -eq 0 ]; then
        print_success "TypeScript compiled successfully"
    else
        print_warning "TypeScript compilation had issues (continuing anyway)"
    fi
else
    print_success "TypeScript compilation is up to date"
fi

echo ""
print_step "Port & Network Check"
echo ""

# Check port availability
PORT=${PORT:-3000}
if lsof -i:$PORT &> /dev/null 2>&1; then
    print_warning "Port $PORT is already in use"
    print_status "Checking what's using the port..."
    PROCESS=$(lsof -ti:$PORT | head -1)
    if [ ! -z "$PROCESS" ]; then
        PROCESS_NAME=$(ps -p $PROCESS -o comm= 2>/dev/null)
        echo "       Process: $PROCESS_NAME (PID: $PROCESS)"
        echo ""
        read -p "Kill this process and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill $PROCESS
            print_success "Process killed, port $PORT is now available"
        else
            print_status "The application will try to use an alternative port"
        fi
    fi
else
    print_success "Port $PORT is available"
fi

echo ""
print_step "Starting Application"
echo ""

print_status "Launching WhatsApp AI Bot in development mode..."
sleep 2

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    READY TO LAUNCH                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}🚀 STARTUP SEQUENCE:${NC}"
echo -e "   ${BLUE}1.${NC} Application will start with file watching enabled"
echo -e "   ${BLUE}2.${NC} Web interface will be available at: ${YELLOW}http://localhost:$PORT${NC}"
echo -e "   ${BLUE}3.${NC} QR code will appear in your browser"
echo -e "   ${BLUE}4.${NC} Scan QR code with WhatsApp to connect"
echo ""

echo -e "${PURPLE}💡 DEVELOPMENT FEATURES:${NC}"
echo -e "   • Auto-restart on file changes"
echo -e "   • TypeScript compilation on-the-fly"
echo -e "   • Detailed error logging"
echo -e "   • Development-friendly output"
echo ""

echo -e "${YELLOW}⚠️  CONTROLS:${NC}"
echo -e "   • Press ${RED}Ctrl+C${NC} to stop the bot"
echo -e "   • Press ${YELLOW}r + Enter${NC} to manually restart (if supported)"
echo -e "   • Check browser console for additional logs"
echo ""

echo -e "${CYAN}⏳ Starting in development mode...${NC}"
echo ""

# Start the development server
npm run dev
