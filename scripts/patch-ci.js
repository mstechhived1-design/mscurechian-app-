const fs = require('fs');
const path = require('path');

// 1. Patch expo-constants
const constantsFile = path.join(__dirname, '../node_modules/expo-constants/scripts/get-app-config-android.gradle');
if (fs.existsSync(constantsFile)) {
  let content = fs.readFileSync(constantsFile, 'utf8');
  if (content.includes('project.android.libraryVariants.all')) {
    content = content.replace(/project\.android\.libraryVariants\.all/g, "project.android.hasProperty('libraryVariants') ? project.android.libraryVariants.all : [].each");
    fs.writeFileSync(constantsFile, content, 'utf8');
  }
}

// 2. Patch expo-modules-core
const modulesCoreFile = path.join(__dirname, '../node_modules/expo-modules-core/android/build.gradle');
if (fs.existsSync(modulesCoreFile)) {
  let content = fs.readFileSync(modulesCoreFile, 'utf8');
  if (content.includes('PrebuiltNativeLibs.findLlvmStrip(android.ndkDirectory)')) {
    content = content.replace(
      'def stripBinary = PrebuiltNativeLibs.findLlvmStrip(android.ndkDirectory)',
      'def stripBinary = null'
    );
    fs.writeFileSync(modulesCoreFile, content, 'utf8');
  }
}

// 3. Patch @react-native-async-storage/async-storage
const asyncStorageFile = path.join(__dirname, '../node_modules/@react-native-async-storage/async-storage/android/build.gradle');
if (fs.existsSync(asyncStorageFile)) {
  let content = fs.readFileSync(asyncStorageFile, 'utf8');
  if (content.includes('configurations {\n    compileClasspath\n}')) {
    content = content.replace('configurations {\n    compileClasspath\n}\n\nbuildscript {', 'buildscript {');
  }
  if (!content.includes("exclude '**/next/**'")) {
    content = content.replace(
      "srcDirs += 'src/javaPackage/java'",
      "srcDirs += 'src/javaPackage/java'\n                exclude '**/next/**'"
    );
    content += "\ntasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach { if (!useNextStorage) { exclude '**/next/**' } }\n";
  }
  fs.writeFileSync(asyncStorageFile, content, 'utf8');
}

// 4. Patch @react-native-community/datetimepicker
const datetimeFile = path.join(__dirname, '../node_modules/@react-native-community/datetimepicker/android/build.gradle');
if (fs.existsSync(datetimeFile)) {
  let content = fs.readFileSync(datetimeFile, 'utf8');
  if (content.includes('kotlinOptions {')) {
    content = content.replace(/kotlinOptions\s*\{\s*jvmTarget\s*=\s*'17'\s*\}/, "compileOptions { sourceCompatibility JavaVersion.VERSION_17\n        targetCompatibility JavaVersion.VERSION_17 }");
    fs.writeFileSync(datetimeFile, content, 'utf8');
  }
}

// 5. Patch react-native-webview
const webviewFile = path.join(__dirname, '../node_modules/react-native-webview/android/build.gradle');
if (fs.existsSync(webviewFile)) {
  let content = fs.readFileSync(webviewFile, 'utf8');
  if (content.includes("apply plugin: 'kotlin-android'")) {
    content = content.replace("apply plugin: 'kotlin-android'", "if (project.extensions.findByName('kotlin') == null) { apply plugin: 'kotlin-android' }");
  }
  if (!content.includes('compileSdk getExtOrIntegerDefault')) {
    content = content.replace("compileSdkVersion getExtOrIntegerDefault('compileSdkVersion')", "compileSdk getExtOrIntegerDefault('compileSdkVersion')\n    compileSdkVersion getExtOrIntegerDefault('compileSdkVersion')");
  }
  fs.writeFileSync(webviewFile, content, 'utf8');
}

console.log('[patch-ci] Applied AGP 9 / Gradle compatibility patches successfully.');
