import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'

// Advanced secure packaging script
console.log('🔐 Creating secure distribution package...')

const DIST_DIR = 'dist-secure'
const OBFUSCATED_DIR = 'dist-obfuscated'

// Generate encryption key
const ENCRYPTION_KEY = crypto.randomBytes(32)
const IV = crypto.randomBytes(16)

function encryptFile(inputPath, outputPath) {
	const data = fs.readFileSync(inputPath)
	const cipher = crypto.createCipherGCM('aes-256-gcm', ENCRYPTION_KEY, IV)

	let encrypted = cipher.update(data)
	encrypted = Buffer.concat([encrypted, cipher.final()])

	const authTag = cipher.getAuthTag()
	const encryptedData = Buffer.concat([IV, authTag, encrypted])

	fs.writeFileSync(outputPath, encryptedData)
}

function createDecryptionLoader(outputPath) {
	const keyBase64 = ENCRYPTION_KEY.toString('base64')
	const loaderCode = `
const crypto = require('crypto');
const fs = require('fs');

function decrypt(filePath) {
  const encryptedData = fs.readFileSync(filePath);
  const iv = encryptedData.slice(0, 16);
  const authTag = encryptedData.slice(16, 32);
  const encrypted = encryptedData.slice(32);
  
  const key = Buffer.from('${keyBase64}', 'base64');
  const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

// VM and debugging detection
(function() {
  const checks = [
    () => process.env.NODE_ENV === 'development',
    () => !!process.debugPort,
    () => typeof v8debug !== 'undefined',
    () => /node|bun/.test(process.title) && process.argv.includes('--inspect')
  ];
  
  if (checks.some(check => {
    try { return check(); } catch { return false; }
  })) {
    process.exit(1);
  }
})();

// Load and execute encrypted main module
const mainCode = decrypt('./core.enc');
eval(mainCode);
`

	fs.writeFileSync(outputPath, loaderCode)
}

function createStealthPackage() {
	// Create directories
	if (fs.existsSync(DIST_DIR)) {
		fs.rmSync(DIST_DIR, { recursive: true })
	}
	fs.mkdirSync(DIST_DIR, { recursive: true })

	// Copy user scripts and documentation
	const userFiles = [
		'setup.sh', 'setup.bat', 'start.sh', 'start.bat',
		'User_Guide.md', 'PACKAGE_README.md'
	]

	userFiles.forEach(file => {
		if (fs.existsSync(file)) {
			fs.copyFileSync(file, path.join(DIST_DIR, file))
		}
	})

	// Copy and rename README
	if (fs.existsSync('PACKAGE_README.md')) {
		fs.copyFileSync('PACKAGE_README.md', path.join(DIST_DIR, 'README.md'))
	}

	// Copy public directory
	if (fs.existsSync('public')) {
		fs.cpSync('public', path.join(DIST_DIR, 'public'), { recursive: true })
	}

	// Encrypt and hide the main application
	const mainJsPath = path.join(OBFUSCATED_DIR, 'index.js')
	if (fs.existsSync(mainJsPath)) {
		encryptFile(mainJsPath, path.join(DIST_DIR, 'core.enc'))
		createDecryptionLoader(path.join(DIST_DIR, 'app.js'))
	}

	// Create fake package.json to hide real dependencies
	const fakePackageJson = {
		name: "dental-clinic-assistant",
		version: "1.0.0",
		description: "WhatsApp Assistant for Dr. Reina's Dental Clinic",
		main: "app.js",
		scripts: {
			start: "node app.js"
		},
		dependencies: {
			"clinic-core": "^1.0.0"
		},
		private: true
	}

	fs.writeFileSync(
		path.join(DIST_DIR, 'package.json'),
		JSON.stringify(fakePackageJson, null, 2)
	)

	// Create environment template
	const envTemplate = `# WhatsApp Dental Assistant Configuration
# Edit the values below with your credentials

# AI Service Configuration (Required)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Location Settings
BOT_DEFAULT_TZ=America/Caracas

# Appointment Booking (Optional)
CALCOM_USERNAME=your_calcom_username
CALCOM_EVENT_TYPE_SLUG=your_event_type_slug
CALCOM_EVENT_TYPE_ID=your_event_type_id
`

	fs.writeFileSync(path.join(DIST_DIR, '.env'), envTemplate)

	// Make shell scripts executable
	try {
		execSync(`chmod +x ${DIST_DIR}/*.sh`, { stdio: 'pipe' })
	} catch (e) {
		console.log('Note: chmod not available (likely Windows)')
	}

	// Create integrity verification
	const files = fs.readdirSync(DIST_DIR)
	const manifest = {}

	files.forEach(file => {
		const filePath = path.join(DIST_DIR, file)
		if (fs.statSync(filePath).isFile()) {
			const content = fs.readFileSync(filePath)
			manifest[file] = crypto.createHash('sha256').update(content).digest('hex')
		}
	})

	fs.writeFileSync(
		path.join(DIST_DIR, '.manifest'),
		JSON.stringify(manifest, null, 2)
	)

	console.log('✅ Secure package created successfully!')
	console.log(`📁 Distribution ready in: ${DIST_DIR}/`)
	console.log('🔒 Code is encrypted and protected against reverse engineering')
}

// Execute if obfuscated code exists
if (fs.existsSync(OBFUSCATED_DIR)) {
	createStealthPackage()
} else {
	console.error('❌ Obfuscated code not found. Run obfuscation first.')
	console.log('Run: npm run build:obfuscated')
	process.exit(1)
}
