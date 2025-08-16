# 🤖 WhatsApp AI Chatbot

An intelligent WhatsApp chatbot powered by AI, designed specifically for dental clinic automation and customer service.

## 🚀 Quick Start

### For Developers

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd whatsapp-ai-bot
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

### For End Users

1. **Download the packaged distribution**
2. **Run setup script:**
   - Linux/Mac: `./setup.sh`
   - Windows: `setup.bat`
3. **Start the bot:**
   - Linux/Mac: `./start.sh`
   - Windows: `start.bat`

## 📁 Project Structure

```
whatsapp-ai-bot/
├── src/                    # Source code
├── public/                 # Web interface files
├── docs/                   # Documentation
│   ├── User_Guide.md      # User manual
│   ├── QUICK_START.md     # Quick start guide
│   └── PACKAGE_README.md  # Distribution readme
├── build/                  # Build and setup scripts
│   ├── setup.sh/bat       # Installation scripts
│   ├── start.sh/bat       # Startup scripts
│   └── create-package.sh  # Package creation
├── scripts/                # Advanced build scripts
│   ├── obfuscate.mjs      # Code obfuscation
│   └── create-secure-package.mjs # Secure packaging
└── dist-user/             # User distribution (generated)
```

## 🛠️ Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm run build:obfuscated` - Build with code obfuscation
- `npm run package:user` - Create user distribution package
- `npm run clean` - Clean all build directories

## 🔧 Configuration

Required environment variables:
- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `PORT` - Web interface port (default: 3000)

## 📋 Features

- 🤖 AI-powered responses using DeepSeek
- 📱 WhatsApp Web integration via Baileys
- 🌐 Web interface for QR code scanning
- 🏥 Dental clinic specific automation
- 🔐 Secure code distribution
- 📦 Easy setup for non-technical users

## 🔐 Security Features

The production build includes:
- Code obfuscation and minification
- Anti-debugging protection
- Encrypted source code
- VM detection mechanisms
- Stealth packaging

## 📖 Documentation

- [User Guide](docs/User_Guide.md) - Complete user manual
- [Quick Start](docs/QUICK_START.md) - Fast setup guide
- [Package README](docs/PACKAGE_README.md) - Distribution guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed for commercial use. See the license terms in the distribution package.

## 🆘 Support

For support and questions:
- Check the [User Guide](docs/User_Guide.md)
- Review the [Quick Start](docs/QUICK_START.md) guide
- Contact the development team

---

**Note:** This is the developer version. End users should use the pre-built distribution package.
