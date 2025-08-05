/**
 * Fix ChunkLoadError Script
 * 
 * This script helps resolve ChunkLoadError issues in Next.js development
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ChunkLoadError...');

// Function to run commands safely
function runCommand(command, description) {
  try {
    console.log(`\n📋 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.log(`⚠️  ${description} failed: ${error.message}`);
  }
}

// Function to check if directory exists
function directoryExists(dirPath) {
  return fs.existsSync(dirPath);
}

// Function to remove directory safely
function removeDirectory(dirPath) {
  if (directoryExists(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`🗑️  Removed: ${dirPath}`);
    } catch (error) {
      console.log(`⚠️  Failed to remove ${dirPath}: ${error.message}`);
    }
  } else {
    console.log(`ℹ️  Directory not found: ${dirPath}`);
  }
}

// Step 1: Stop any running Next.js processes
console.log('\n🛑 Step 1: Stopping Next.js processes...');
try {
  execSync('pkill -f "next dev"', { stdio: 'ignore' });
  console.log('✅ Next.js processes stopped');
} catch (error) {
  console.log('ℹ️  No Next.js processes found or already stopped');
}

// Step 2: Clear Next.js cache
console.log('\n🧹 Step 2: Clearing Next.js cache...');
removeDirectory('.next');
removeDirectory('node_modules/.cache');

// Step 3: Clear browser cache (instructions)
console.log('\n🌐 Step 3: Browser cache instructions...');
console.log('Please clear your browser cache:');
console.log('  - Chrome/Edge: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)');
console.log('  - Firefox: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)');
console.log('  - Safari: Cmd+Option+E');
console.log('  - Or open Developer Tools → Network tab → check "Disable cache"');

// Step 4: Reinstall dependencies (optional)
console.log('\n📦 Step 4: Checking dependencies...');
if (directoryExists('node_modules')) {
  console.log('✅ node_modules exists');
} else {
  console.log('📦 Installing dependencies...');
  runCommand('npm install', 'Installing dependencies');
}

// Step 5: Start development server
console.log('\n🚀 Step 5: Starting development server...');
console.log('Starting Next.js development server...');
console.log('This will take a moment to compile...');

try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.log('\n❌ Failed to start development server');
  console.log('Please try manually: npm run dev');
}

console.log('\n🎉 ChunkLoadError fix completed!');
console.log('\n📋 Next steps:');
console.log('1. Wait for the development server to fully start');
console.log('2. Open http://localhost:3000 in your browser');
console.log('3. If the error persists, try a hard refresh (Ctrl+F5 or Cmd+Shift+R)');
console.log('4. Check the browser console for any remaining errors'); 