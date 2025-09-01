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
   # or run normally
   npm start
   ```

## 📁 Project Structure

```
whatsapp-ai-bot/
├── src/                    # Source code
├── public/                 # Web interface files
├── docs/                   # Documentation
│   ├── User_Guide.md      # User manual
│   ├── QUICK_START.md     # Quick start guide
 
└── (build output under dist/)
```

## 🛠️ Development Commands

- `npm run dev` - Start development server
- `npm start` - Start the app
- `npm run build` - Build TypeScript
- `npm run clean` - Clean build output

## 🔧 Configuration

Required environment variables:
- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `PORT` - Web interface port (default: 3000)

## 📋 Features

- 🤖 AI-powered responses using DeepSeek
- 📱 WhatsApp Web integration via Baileys
- 🌐 Web interface for QR code scanning
- 🏥 Dental clinic specific automation
- 📦 Easy setup for non-technical users


## 📖 Documentation

- [User Guide](docs/User_Guide.md) - Complete user manual
- [Quick Start](docs/QUICK_START.md) - Fast setup guide
 

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed for commercial use.

## 🆘 Support

For support and questions:
- Check the [User Guide](docs/User_Guide.md)
- Review the [Quick Start](docs/QUICK_START.md) guide
- Contact the development team

---

**Note:** This is the developer version.
