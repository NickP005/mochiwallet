import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🤖 Setting up Android environment...');

// Check if Android is already set up
if (!fs.existsSync(path.resolve('./android'))) {
  console.log('Adding Android platform to Capacitor...');
  spawnSync('npx', ['cap', 'add', 'android'], { stdio: 'inherit' });
} else {
  console.log('Android platform already exists');
}

// Make sure dependencies are installed
console.log('Installing dependencies...');
spawnSync('npm', ['install'], { stdio: 'inherit' });

// Build web app
console.log('Building web app...');
spawnSync('npm', ['run', 'build:web'], { stdio: 'inherit' });

// Sync Capacitor
console.log('Syncing Capacitor...');
spawnSync('npx', ['cap', 'sync', 'android'], { stdio: 'inherit' });

// Patch build.gradle to enforce Java 17 and remove unsupported --release
const buildGradlePath = path.resolve('./android/build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
  const marker = '// Configure Java 17 compilation';
  if (!gradleContent.includes(marker)) {
    const block = `\n// Configure Java 17 compilation and remove unsupported --release flag for all Android modules
allprojects {
    tasks.withType(JavaCompile).configureEach {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        options.release = null
        options.compilerArgs.removeAll { arg -> arg.startsWith("--release") }
    }
}

subprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            project.android.compileOptions {
                sourceCompatibility JavaVersion.VERSION_17
                targetCompatibility JavaVersion.VERSION_17
            }
            project.tasks.withType(JavaCompile).configureEach {
                options.release = null
                options.compilerArgs.removeAll { arg -> arg.startsWith("--release") }
            }
        }
    }
}

// Force Java 17 for all Android plugins (application and library) - overrides capacitor-android defaults
subprojects { project ->
    project.plugins.withId('com.android.library') {
        project.android.compileOptions {
            sourceCompatibility JavaVersion.VERSION_17
            targetCompatibility JavaVersion.VERSION_17
        }
    }
    project.plugins.withId('com.android.application') {
        project.android.compileOptions {
            sourceCompatibility JavaVersion.VERSION_17
            targetCompatibility JavaVersion.VERSION_17
        }
    }
}\n`;
    fs.writeFileSync(buildGradlePath, gradleContent + block, 'utf8');
    console.log('🤖 Patched android/build.gradle for Java 17 configuration');
  }
}

console.log('✅ Android setup complete!');
console.log('You can now run:');
console.log('  npm run build:android - To build the Android APK');
console.log('  npx cap open android - To open in Android Studio');
