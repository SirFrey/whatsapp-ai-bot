# 🤖 WhatsApp AI Dental Bot

An easy-to-use WhatsApp bot for dental clinics that handles appointment bookings and patient inquiries automatically.

## ✨ Features

- 🦷 **Dental Clinic Assistant**: Provides information about services and prices
- 📅 **Appointment Booking**: Integrates with Cal.com for easy scheduling  
- 💬 **WhatsApp Integration**: Works directly through WhatsApp
- 🌐 **Web Dashboard**: Monitor bot status and conversations
- 🇻🇪 **Venezuela Focused**: Configured for Venezuelan timezone and Cashea payment info
- 🔄 **Auto Reconnect**: Automatically reconnects if disconnected

## 🚀 Quick Start (For Non-Technical Users)

### Step 1: Download and Install
1. Download this project to your computer
2. Open Terminal (Mac/Linux) or Command Prompt (Windows)
3. Navigate to the project folder

### Step 2: Run Setup
```bash
chmod +x setup.sh start.sh
./setup.sh
```

### Step 3: Configure API Key
1. Edit the `.env` file that was created
2. Replace `your_deepseek_api_key_here` with your actual API key
3. Get your API key from: https://platform.deepseek.com/

### Step 4: Start the Bot
```bash
./start.sh
```

### Step 5: Connect WhatsApp
1. Open http://localhost:3000 in your browser
2. Scan the QR code with WhatsApp
3. Your bot is now ready! 🎉

## 📋 Configuration

### Required Settings
- **DEEPSEEK_API_KEY**: Your AI API key (required)

### Optional Settings
- **CALCOM_USERNAME**: Your Cal.com username for appointment booking
- **CALCOM_EVENT_TYPE_SLUG**: Your Cal.com event type
- **BOT_DEFAULT_TZ**: Timezone (default: America/Caracas)

## 🦷 Dental Services Configured

The bot is pre-configured with these dental services and prices:

### Basic Services
- Consultation: $10
- Consultation + Ultrasonic cleaning: $25
- Orthodontics (upper and lower): $100

### Treatments
- Cavity removal (adults): $20-45
- Cavity removal (children): $20-30
- Root canal (single/multi): $150/$250
- Extractions: $20-80 depending on type
- Gum procedures: $60
- Retainers: $85

## 🔧 Troubleshooting

### Bot won't start?
- Make sure you ran `./setup.sh` first
- Check that your API key is correctly set in `.env`
- Ensure Node.js is installed

### WhatsApp won't connect?
- Make sure you're scanning the QR with the phone that will host the bot
- Check your internet connection
- Try refreshing the web page and scanning again

### Bot not responding?
- Check the web dashboard for errors
- Verify your API key is valid
- Make sure the phone number is in the allowed list

## 📱 How to Use

### For Patients
Patients can simply send messages to your WhatsApp number and the bot will:
- Provide service information and prices
- Help book appointments
- Answer common dental questions
- Transfer complex queries to human staff

### For Clinic Staff
- Monitor conversations via web dashboard
- View real-time logs and statistics
- Handle transferred conversations
- Restart bot if needed

## 🛡️ Security

- Only configured phone numbers can interact with the bot
- All conversations are logged for quality assurance
- API keys are stored securely in environment variables

## 📞 Support

If you need help:
1. Check this README file
2. Look at the web dashboard for error messages
3. Contact your technical support team

## 🔄 Updates

To update the bot:
1. Download the latest version
2. Replace files (keep your `.env` file)
3. Run `./setup.sh` again
4. Restart with `./start.sh`

---

## 👨‍💻 Technical Documentation

Low-budget WhatsApp AI chatbot built with Bun, TypeScript, and Baileys. Uses DeepSeek API for AI responses.

### Prerequisites
- Bun installed: https://bun.sh/
- A WhatsApp account (to pair via QR)
- DeepSeek API key (`DEEPSEEK_API_KEY`)

### Manual Setup (Advanced Users)
1. Clone the repo and `cd` into it.
2. Copy `.env.example` to `.env` and set `DEEPSEEK_API_KEY`.
3. Install dependencies:
   ```bash
   bun install
   ```

### Development
```bash
bun run start
# or
bun run src/index.ts
```

CLI-only mode (no WhatsApp):
```bash
bun run src/index.ts --cli
```

### Build
```bash
bun run build       # bundles to dist/, entry: ./dist/run (Unix)
bun run build-win   # bundles Windows-friendly files: dist\run-win.cmd
```

### Project Structure
- `src/index.ts`: Main application entry point
- `public/`: Web dashboard static files
- `auth_info/`: WhatsApp authentication data (auto-generated)
- `setup.sh`: Easy setup script for non-technical users
- `start.sh`: Easy start script

**Made for Dr. Reina's Dental Clinic** 🦷✨
