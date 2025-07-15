import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🤖 Creating Android distribution build...');

// Make sure dependencies are installed
console.log('Installing dependencies...');
spawnSync('npm', ['install'], { stdio: 'inherit' });

// Build web app for production
console.log('Building web app in production mode...');
spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });

// Sync Capacitor
console.log('Syncing Capacitor...');
spawnSync('npx', ['cap', 'sync', 'android'], { stdio: 'inherit' });

// Build release APK
console.log('Building release APK...');
const result = spawnSync('cd', ['android', '&&', './gradlew', 'assembleRelease'], { 
  stdio: 'inherit',
  shell: true 
});

if (result.status === 0) {
  console.log('✅ Android release build complete!');
  console.log('APK location: android/app/build/outputs/apk/release/app-release.apk');
} else {
  console.error('❌ Android release build failed');
  process.exit(1);
}
