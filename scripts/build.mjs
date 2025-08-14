#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

async function main() {
  const root = process.cwd();
  const distDir = path.join(root, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  // Detect Windows build flag
  const rawArgs = process.argv.slice(2);
  const winFlag = rawArgs.includes('--win') || rawArgs.includes('-win');

  console.log('Bundling with Bun' + (winFlag ? ' for Windows' : '') + '...');
  const scriptName = winFlag ? 'run-win.js' : 'run';
  const outFile = path.join(distDir, scriptName);
  const args = [
    'build',
    'src/index.ts',
    '--bundle',
    '--target', 'node',
    '--external', 'link-preview-js',
    '--external', 'jimp',
    '--external', 'sharp',
    '--outfile', outFile
  ];
  const res = spawnSync('bun', args, { stdio: 'inherit' });
  if (res.error || res.status !== 0) process.exit(res.status || 1);

  // Prepend shebang for non-Windows
  if (!winFlag) {
    let content = fs.readFileSync(outFile, 'utf-8');
    if (!content.startsWith('#!')) {
      content = '#!/usr/bin/env node\n' + content;
      fs.writeFileSync(outFile, content, 'utf-8');
    }
    // Make executable on Unix
    try { fs.chmodSync(outFile, 0o755); } catch {}
  }

  // Make executable on Unix
  if (process.platform !== 'win32') {
    try { fs.chmodSync(outFile, 0o755); } catch {}
  }

  // Copy public folder
  const srcPub = path.join(root, 'public');
  const dstPub = path.join(distDir, 'public');
  if (fs.existsSync(dstPub)) {
    await fs.promises.rm(dstPub, { recursive: true, force: true });
  }
  await fs.promises.cp(srcPub, dstPub, { recursive: true });
  // Copy .env variables file if exists
  const envSrc = path.join(root, '.env');
  if (fs.existsSync(envSrc)) {
    await fs.promises.copyFile(envSrc, path.join(distDir, '.env'));
    console.log('Copied .env to dist');
  }

  // For Windows builds, create a .cmd launcher that runs via node
  if (winFlag) {
    const cmdName = 'run-win.cmd';
    const cmdContent = ['@echo off', `node "%~dp0${scriptName}"`, 'pause'];
    const cmdPath = path.join(distDir, cmdName);
    fs.writeFileSync(cmdPath, cmdContent.join('\r\n'), 'utf-8');
    console.log('Windows launcher created:', `dist\\${cmdName}`);
  }

  if (winFlag) {
    console.log('Build complete! Run using:', `dist\\run-win.cmd`);
  } else {
    console.log('Build complete! To run:', process.platform === 'win32' ? 'dist\\run' : './dist/run');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
