import { obfuscate } from 'javascript-obfuscator'
import fs from 'fs'
import path from 'path'
import { minify } from 'terser'

const OBFUSCATION_CONFIG = {
	compact: true,
	controlFlowFlattening: true,
	controlFlowFlatteningThreshold: 1,
	numbersToExpressions: true,
	simplify: true,
	stringArrayShuffle: true,
	splitStrings: true,
	stringArray: true,
	stringArrayThreshold: 1,
	transformObjectKeys: true,
	unicodeEscapeSequence: false,
	identifierNamesGenerator: 'hexadecimalNumber',
	renameGlobals: false,
	selfDefending: true,
	deadCodeInjection: true,
	deadCodeInjectionThreshold: 1,
	debugProtection: true,
	debugProtectionInterval: 4000,
	disableConsoleOutput: true,
	domainLock: [],
	seed: Math.floor(Math.random() * 100000)
}

async function obfuscateFile(inputPath, outputPath) {
	const code = fs.readFileSync(inputPath, 'utf8')

	// First minify with Terser
	const minified = await minify(code, {
		mangle: {
			toplevel: true,
			properties: {
				regex: /^_/
			}
		},
		compress: {
			dead_code: true,
			drop_console: true,
			drop_debugger: true,
			keep_infinity: true,
			reduce_vars: true,
			unused: true
		}
	})

	// Then obfuscate
	const obfuscationResult = obfuscate(minified.code, OBFUSCATION_CONFIG)

	// Add anti-debugging measures
	const protectedCode = addAntiDebugging(obfuscationResult.getObfuscatedCode())

	fs.writeFileSync(outputPath, protectedCode)
	console.log(`✅ Obfuscated: ${path.basename(inputPath)}`)
}

function addAntiDebugging(code) {
	const antiDebugCode = `
(function(){
  var _0x1234 = function() {
    var _0x5678 = function() {
      return 'dev';
    }, _0x9abc = function() {
      return 'window';
    };
    var _0xdef0 = function() {
      var _0x1111 = new RegExp('\\\\w+ *\\\\(\\\\) *{\\\\w+ *[\\'\\"]\\w+[\\'\\"];? *}');
      return !_0x1111.test(_0x5678.toString());
    };
    var _0x2222 = function() {
      var _0x3333 = new RegExp('(\\\\\\\\[x|u](\\\\w){2,4})+');
      return _0x3333.test(_0x9abc.toString());
    };
    var _0x4444 = function(_0x5555) {
      var _0x6666 = ~-1 >> 1 + 0xff % 0;
      if (_0x5555.indexOf('i' === _0x6666)) {
        _0x7777(_0x5555);
      }
    };
    var _0x7777 = function(_0x8888) {
      var _0x9999 = ~-4 >> 1 + 0xff % 0;
      if (_0x8888.indexOf((!![] + '')[3]) !== _0x9999) {
        _0x4444(_0x8888);
      }
    };
    if (!_0xdef0()) {
      if (!_0x2222()) {
        _0x4444('indеxOf');
      } else {
        _0x4444('indexOf');
      }
    } else {
      _0x4444('indеxOf');
    }
  };
  setInterval(function() {
    _0x1234();
  }, 4000);
})();

// VM Detection
(function() {
  const vmTests = [
    () => window.navigator.webdriver,
    () => window.callPhantom || window._phantom,
    () => window.Buffer,
    () => window.emit,
    () => window.spawn
  ];
  
  if (vmTests.some(test => {
    try { return test(); } catch (e) { return false; }
  })) {
    while(true) {}
  }
})();

// Developer Tools Detection
let devtools = {open: false, orientation: null};
const threshold = 160;
const check = () => {
  if (window.outerHeight - window.innerHeight > threshold || 
      window.outerWidth - window.innerWidth > threshold) {
    devtools.open = true;
    devtools.orientation = 'vertical';
    while(true) { debugger; }
  }
};
setInterval(check, 500);

${code}
`

	return antiDebugCode
}

async function obfuscateDirectory(srcDir, distDir) {
	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir, { recursive: true })
	}

	const files = fs.readdirSync(srcDir)

	for (const file of files) {
		const srcPath = path.join(srcDir, file)
		const distPath = path.join(distDir, file)

		if (fs.statSync(srcPath).isDirectory()) {
			await obfuscateDirectory(srcPath, distPath)
		} else if (file.endsWith('.js') || file.endsWith('.ts')) {
			await obfuscateFile(srcPath, distPath.replace('.ts', '.js'))
		} else {
			fs.copyFileSync(srcPath, distPath)
		}
	}
}

// Main execution
console.log('🔒 Starting advanced code obfuscation...')

// Compile TypeScript first
import { execSync } from 'child_process'
try {
	execSync('tsc -p tsconfig.json', { stdio: 'pipe' })
	console.log('✅ TypeScript compilation complete')
} catch (error) {
	console.error('❌ TypeScript compilation failed:', error.message)
	process.exit(1)
}

// Obfuscate the compiled JavaScript
await obfuscateDirectory('./dist', './dist-obfuscated')

console.log('🎉 Code obfuscation complete!')
console.log('📁 Obfuscated files available in: ./dist-obfuscated/')
