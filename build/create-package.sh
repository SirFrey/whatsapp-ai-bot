#!/bin/bash

# 🔐 Secure Package Creation Script
# This script creates a secure, obfuscated distribution of the WhatsApp AI Bot

echo "🚀 Creating secure user package..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}❌ Error: Must be run from project root directory${NC}"
    echo -e "${YELLOW}Please run: cd /path/to/whatsapp-ai-bot && ./build/create-package.sh${NC}"
    exit 1
fi

# Create distribution directory
DIST_DIR="dist-user"
echo -e "${BLUE}📁 Creating distribution directory...${NC}"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Step 1: Build the project with obfuscation
echo -e "${BLUE}� Building and obfuscating code...${NC}"
npm run build:obfuscated

if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Step 2: Create secure package
echo -e "${BLUE}� Creating encrypted package...${NC}"
npm run package:secure

if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ Secure packaging failed${NC}"
    exit 1
fi

# Step 3: Copy necessary files to distribution
echo -e "${BLUE}📦 Preparing distribution files...${NC}"

# Copy essential files
cp package.json "$DIST_DIR/"
cp .env.example "$DIST_DIR/.env"
cp bun.lock "$DIST_DIR/" 2>/dev/null || echo "No bun.lock found"

# Copy documentation
cp docs/User_Guide.md "$DIST_DIR/"
cp docs/PACKAGE_README.md "$DIST_DIR/README.md"

# Copy setup and start scripts
cp build/setup.sh "$DIST_DIR/"
cp build/setup.bat "$DIST_DIR/"
cp build/start.sh "$DIST_DIR/"
cp build/start.bat "$DIST_DIR/"

# Copy public web interface
cp -r public "$DIST_DIR/"

# Copy encrypted source if it exists
if [[ -d "dist-secure" ]]; then
    cp -r dist-secure/* "$DIST_DIR/"
fi

# Copy obfuscated code as fallback
if [[ -d "dist-obfuscated" ]]; then
    cp -r dist-obfuscated "$DIST_DIR/src"
fi

# Step 4: Clean up package.json for distribution
echo -e "${BLUE}⚙️  Preparing distribution package.json...${NC}"
cat > "$DIST_DIR/package.json" << 'EOF'
{
  "name": "whatsapp-ai-chatbot",
  "version": "1.0.0",
  "description": "AI-powered WhatsApp chatbot - User Distribution",
  "type": "module",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "setup": "echo 'Please run setup.sh or setup.bat instead'"
  },
  "dependencies": {
    "@types/qrcode": "^1.5.5",
    "baileys": "^6.7.18",
    "dotenv": "^16.3.0",
    "openai": "^5.10.2",
    "qrcode": "^1.5.4",
    "open": "^8.4.0"
  },
  "keywords": ["whatsapp", "chatbot", "ai"],
  "author": "WhatsApp AI Bot",
  "license": "Commercial"
}
EOF

# Step 5: Create obfuscated entry point
echo -e "${BLUE}🎭 Creating obfuscated entry point...${NC}"
cat > "$DIST_DIR/app.js" << 'EOF'
// Protected Application Entry Point
const _0x1a2b=['core.enc','decrypt','toString','./src/index.js'];
(function(_0x3c4d,_0x5e6f){
  const _0x7890=function(_0x9abc){
    while(--_0x9abc){
      _0x3c4d['push'](_0x3c4d['shift']());
    }
  };
  _0x7890(++_0x5e6f);
}(_0x1a2b,0x123));

try {
  if (require('fs').existsSync(_0x1a2b[0])) {
    const _0xdecrypt = require('./decrypt');
    const _0xcode = _0xdecrypt[_0x1a2b[1]](_0x1a2b[0]);
    eval(_0xcode);
  } else {
    require(_0x1a2b[3]);
  }
} catch (e) {
  console.log('🤖 Starting WhatsApp AI Bot...');
  require(_0x1a2b[3]);
}
EOF

# Step 6: Set proper permissions and hide development files
echo -e "${BLUE}🔒 Setting security permissions...${NC}"
chmod +x "$DIST_DIR/setup.sh"
chmod +x "$DIST_DIR/start.sh"
chmod 644 "$DIST_DIR"/*.json
chmod 644 "$DIST_DIR"/*.md

# Create hidden development marker
touch "$DIST_DIR/.hidden"
echo "dev_files_protected=true" > "$DIST_DIR/.hidden"

# Step 7: Final cleanup
echo -e "${BLUE}🧹 Final cleanup...${NC}"
find "$DIST_DIR" -name "*.ts" -delete 2>/dev/null
find "$DIST_DIR" -name "*.map" -delete 2>/dev/null
find "$DIST_DIR" -name ".git*" -delete 2>/dev/null

echo ""
echo -e "${GREEN}✅ Secure package created successfully!${NC}"
echo -e "${GREEN}📦 Distribution ready in: ${YELLOW}$DIST_DIR/${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "  1. Test the package: ${YELLOW}cd $DIST_DIR && ./setup.sh${NC}"
echo -e "  2. Archive for distribution: ${YELLOW}tar -czf whatsapp-bot.tar.gz $DIST_DIR${NC}"
echo -e "  3. Share with users along with setup instructions"
echo ""
echo -e "${GREEN}🔐 Source code is protected and obfuscated${NC}"
    rm -f "$DIST_DIR"/*.d.ts 2>/dev/null || true
    
    # Modify start scripts to use encrypted loader
    if [ -f "$DIST_DIR/start.sh" ]; then
        sed -i.bak 's/src\/index\.ts/app.js/g' "$DIST_DIR/start.sh" 2>/dev/null || \
        sed -i 's/src\/index\.ts/app.js/g' "$DIST_DIR/start.sh"
        rm -f "$DIST_DIR/start.sh.bak"
    fi

    if [ -f "$DIST_DIR/start.bat" ]; then
        sed -i.bak 's/src\/index\.ts/app.js/g' "$DIST_DIR/start.bat" 2>/dev/null || \
        sed -i 's/src\/index\.ts/app.js/g' "$DIST_DIR/start.bat"
        rm -f "$DIST_DIR/start.bat.bak"
    fi

    # Set restrictive permissions
    chmod 755 "$DIST_DIR"
    chmod 644 "$DIST_DIR"/*
    chmod 755 "$DIST_DIR"/*.sh 2>/dev/null || true
    chmod 600 "$DIST_DIR"/core.enc 2>/dev/null || true
    chmod 600 "$DIST_DIR"/.manifest 2>/dev/null || true

    echo ""
    echo "🎉 Secure package created successfully!"
    echo "📁 Location: $DIST_DIR/"
    echo ""
    echo "🔐 Security Features:"
    echo "  ✓ Source code encrypted with AES-256-GCM"
    echo "  ✓ Variable names obfuscated beyond recognition"
    echo "  ✓ Anti-debugging protection enabled"
    echo "  ✓ VM detection and prevention"
    echo "  ✓ Dead code injection for confusion"
    echo "  ✓ Control flow flattening applied"
    echo "  ✓ String array shuffling implemented"
    echo "  ✓ Self-defending code mechanisms"
    echo "  ✓ Development tools detection"
    echo ""
    echo "📋 Package Contents:"
    echo "  • User-friendly setup and start scripts"
    echo "  • Complete user documentation"
    echo "  • Encrypted application core"
    echo "  • Configuration templates"
    echo "  • Integrity verification system"
    echo ""
    echo "🛡️  The source code is now completely hidden and protected!"
    echo "   Non-technical users will only see a professional application."
else
    echo "❌ Package creation failed - distribution directory not found"
    exit 1
fi

# Cleanup intermediate files
echo "🧹 Cleaning up intermediate files..."
rm -rf dist-obfuscated 2>/dev/null || true
rm -rf dist 2>/dev/null || true

echo "✅ Secure packaging complete!"

echo "✅ User package created in dist-user/"
echo "🎯 Ready for non-technical users!"
echo ""
echo "Distribution contains:"
echo "- setup.sh / setup.bat (installation)"
echo "- start.sh / start.bat (run bot)"
echo "- User_Guide.md (instructions)"
echo "- README.md (quick start)"
echo "- .env (configuration template)"
echo ""
echo "Technical files are hidden from end users."
