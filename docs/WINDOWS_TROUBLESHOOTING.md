# 🪟 Windows Start Script Troubleshooting Guide

## 🚨 Common Issues & Solutions

### ❌ **"Node.js is not installed"**

**Problem:** The script can't find Node.js
**Solution:**
1. Download Node.js from https://nodejs.org/
2. Install the LTS (Long Term Support) version
3. During installation, make sure "Add to PATH" is checked
4. Restart Command Prompt/PowerShell after installation
5. Test by running: `node --version`

### ❌ **"npm is not available"**

**Problem:** npm is not working despite Node.js being installed
**Solution:**
1. Reinstall Node.js (npm comes bundled with it)
2. Make sure you selected "Add to PATH" during installation
3. Restart your computer if the issue persists
4. Test by running: `npm --version`

### ❌ **"Configuration file (.env) not found"**

**Problem:** The .env file is missing
**Solution:**
1. Run `setup.bat` first to create the configuration
2. If setup.bat doesn't exist, create .env manually:
   ```
   DEEPSEEK_API_KEY=your_api_key_here
   PORT=3000
   ```

### ❌ **"API key not configured"**

**Problem:** Invalid or missing API key in .env file
**Solution:**
1. Get your API key from https://platform.deepseek.com/
2. Edit .env file with notepad
3. Make sure the key starts with "sk-"
4. Example: `DEEPSEEK_API_KEY=sk-1234567890abcdef`

### ❌ **"Failed to install dependencies"**

**Problem:** npm install is failing
**Solution:**
1. Check your internet connection
2. Try running as Administrator:
   - Right-click Command Prompt → "Run as administrator"
   - Navigate to the bot folder
   - Run `npm install`
3. Clear npm cache: `npm cache clean --force`
4. Delete node_modules folder and package-lock.json, then run `npm install`

### ❌ **"Failed to start application"**

**Problem:** npm start command fails
**Solutions:**

#### Method 1: Use Alternative Start Commands
```cmd
npm run start:build
```
or
```cmd
npm run build
npm run start:prod
```

#### Method 2: Install Missing Dependencies
```cmd
npm install tsx ts-node typescript
npm start
```

#### Method 3: Manual Build and Run
```cmd
npm install
npm run build
node dist/index.js
```

### ❌ **"Port 3000 is already in use"**

**Problem:** Another application is using port 3000
**Solution:**
1. Find what's using the port:
   ```cmd
   netstat -ano | findstr :3000
   ```
2. Kill the process (replace PID with actual number):
   ```cmd
   taskkill /PID 1234 /F
   ```
3. Or change the port in .env file:
   ```
   PORT=3001
   ```

### ❌ **Unicode/Special Characters Display Issues**

**Problem:** Box characters (╔═╗) display as question marks
**Solution:**
1. Use `start-simple.bat` instead of `start.bat`
2. Or change Command Prompt font:
   - Right-click title bar → Properties → Font
   - Select "Consolas" or "Lucida Console"

## 🔧 **Alternative Start Methods**

### **Method 1: Simple Start Script**
```cmd
start-simple.bat
```
Basic version without fancy formatting

### **Method 2: Manual Commands**
```cmd
npm install
npm run build
npm run start:prod
```

### **Method 3: Development Mode**
```cmd
npm install
npm run dev
```

### **Method 4: TypeScript Direct**
```cmd
npm install
npx tsx src/index.ts
```

## 🛠️ **Advanced Troubleshooting**

### **Reinstall Everything**
```cmd
rmdir /s node_modules
del package-lock.json
npm install
npm start
```

### **Check Environment**
```cmd
node --version
npm --version
where node
where npm
```

### **Permission Issues**
- Run Command Prompt as Administrator
- Disable antivirus temporarily
- Check Windows Defender exclusions

### **Network Issues**
- Check firewall settings
- Try different npm registry: `npm config set registry https://registry.npmjs.org/`
- Use corporate proxy settings if behind firewall

## 📞 **Still Having Issues?**

### **Check These Files Exist:**
- ✅ `package.json`
- ✅ `.env` (with valid API key)
- ✅ `src/index.ts`
- ✅ `node_modules/` folder

### **Try This Complete Reset:**
```cmd
# 1. Clean everything
rmdir /s node_modules
del package-lock.json

# 2. Fresh install
npm install

# 3. Try each start method
npm start
# If that fails:
npm run start:build
# If that fails:
npm run build && node dist/index.js
```

### **System Requirements:**
- ✅ Windows 10 or later
- ✅ Node.js 18+ 
- ✅ 4GB+ RAM
- ✅ Internet connection
- ✅ Administrator privileges (if needed)

## 🎯 **Quick Success Path**

For fastest results on Windows:

1. **Install Node.js LTS** from https://nodejs.org/
2. **Run as Administrator**: `start-simple.bat`
3. **If issues**: Try `npm run start:build`
4. **Last resort**: Manual build with `npm run build && node dist/index.js`

Most Windows issues are resolved by using the alternative start methods or running with administrator privileges!
