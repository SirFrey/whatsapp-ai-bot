# 📱 WhatsApp AI Bot - User Guide

## What is this?

This is a smart WhatsApp assistant for **Dr. Reina's Dental Clinic**. It automatically answers patient questions, provides service information, and helps book appointments.

## 🚀 Getting Started

### Step 1: Initial Setup
- **Windows**: Double-click `setup.bat`
- **Mac/Linux**: Open Terminal and run `./setup.sh`

### Step 2: Get Your API Key
1. Visit: https://platform.deepseek.com/
2. Create an account (it's free to start)
3. Go to "API Keys" section
4. Click "Create New Key"
5. Copy the key (starts with `sk-`)

### Step 3: Configure the Bot
1. Open the `.env` file with any text editor
2. Replace `your_deepseek_api_key_here` with your actual key
3. Save the file

### Step 4: Start the Bot
- **Windows**: Double-click `start.bat`
- **Mac/Linux**: Run `./start.sh` in Terminal

### Step 5: Connect WhatsApp
1. Open http://localhost:3000 in your web browser
2. You'll see a QR code on the screen
3. Open WhatsApp on your phone
4. Go to Settings → Linked Devices → Link a Device
5. Scan the QR code with your phone
6. ✅ Done! Your bot is now active

## 📋 What the Bot Does

### For Patients:
- **Answers questions** about dental services
- **Provides pricing** for all treatments
- **Helps book appointments** through Cal.com
- **Gives clinic information** (address, hours)
- **Transfers complex queries** to human staff

### Services & Prices:
- Consultation: $10
- Cleaning + Consultation: $25
- Orthodontics: $100
- Cavity treatment: $20-45
- Root canals: $150-250
- Extractions: $20-80
- Other specialized treatments

## 🔧 Managing the Bot

### Web Dashboard
Access http://localhost:3000 to:
- See if the bot is connected
- View conversation logs
- Monitor bot status
- See real-time statistics

### Stopping the Bot
- Press `Ctrl+C` in the terminal/command prompt
- Or close the window

### Restarting the Bot
- **Windows**: Double-click `start.bat` again
- **Mac/Linux**: Run `./start.sh` again

## ⚠️ Important Notes

### Security:
- Only authorized phone numbers can use the bot
- All conversations are logged for quality
- Keep your API key private and secure

### Payment Information:
- The bot knows about Cashea (Venezuelan payment app)
- It will inform patients that Cashea is NOT currently accepted
- For other payment questions, it transfers to human staff

### WhatsApp Connection:
- The bot uses YOUR WhatsApp number
- Patients message your clinic's WhatsApp directly
- The bot responds automatically 24/7

## 🆘 Troubleshooting

### Bot won't start?
- Check that your API key is correctly entered in `.env`
- Make sure you have internet connection
- Try running setup again

### WhatsApp won't connect?
- Make sure you're scanning with the correct phone
- Check your internet connection
- Try refreshing the web page and scanning again

### Bot not responding to messages?
- Check the web dashboard for errors
- Verify the sender's phone number is authorized
- Check your API key balance at DeepSeek

### Need to add/remove phone numbers?
- Contact your technical support team
- They can modify the authorized numbers list

## 💡 Tips for Best Results

1. **Keep it running**: Leave the bot running on a computer that stays on
2. **Monitor regularly**: Check the web dashboard daily
3. **Handle transfers**: When the bot transfers conversations, staff should respond quickly
4. **Update information**: Keep service prices and information current

## 📞 Support

If you need help:
1. Check this guide first
2. Look at the web dashboard for error messages
3. Contact your technical support team
4. Keep your `.env` file secure (never share it)

---

**Made specifically for Dr. Reina's Dental Clinic** 🦷✨

*This bot helps your clinic provide 24/7 customer service while reducing staff workload.*
