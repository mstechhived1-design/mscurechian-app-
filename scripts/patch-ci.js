const fs = require('fs');
const path = require('path');

// 1. Patch expo-constants
const constantsFile = path.join(__dirname, '../node_modules/expo-constants/scripts/get-app-config-android.gradle');
if (fs.existsSync(constantsFile)) {
  const cleanConstantsGradle = `// Gradle script for generating serialized public app config (from app.config.js/ts or app.json) and bundling it into the APK

import org.apache.tools.ant.taskdefs.condition.Os

def expoConstantsDir = project.providers.exec {
  workingDir(projectDir)
  commandLine("node", "-e", "console.log(require('path').dirname(require.resolve('expo-constants/package.json')));")
}.standardOutput.asText.get().trim()

def config = project.hasProperty("react") ? project.react : [];
def nodeExecutableAndArgs = config.nodeExecutableAndArgs ?: ["node"]

afterEvaluate {
  def expoGradleExtension = gradle.extensions.findByName("expoGradle")
  def customProjectRoot = expoGradleExtension?.projectRoot
  def projectRoot = file("\${customProjectRoot ?: rootProject.projectDir}")

  def hasVariants = false
  try {
    hasVariants = project.android.hasProperty("libraryVariants") && project.android.libraryVariants != null
  } catch (Exception e) {
    hasVariants = false
  }

  if (hasVariants) {
    try {
      project.android.libraryVariants.all { variant ->
        def assetsDir = file("\$buildDir/generated/assets/expo-constants/\${variant.name}")
        def configMode = variant.buildType.name == "debug" || variant.buildType.name == "debugOptimized" ? "development" : "production"

        def createConfigTask = tasks.register("create\${variant.name.capitalize()}ExpoConfig", Exec) {
          description = 'expo-constants: Create app.config.'
          doFirst {
            assetsDir.deleteDir()
            assetsDir.mkdirs()
          }
          outputs.upToDateWhen { false }
          outputs.dir assetsDir
          workingDir projectRoot
          if (Os.isFamily(Os.FAMILY_WINDOWS)) {
            commandLine("cmd", "/c", *nodeExecutableAndArgs, "\$expoConstantsDir/scripts/getAppConfig.js", projectRoot, assetsDir, "android", "false", configMode)
          } else {
            commandLine(*nodeExecutableAndArgs, "\$expoConstantsDir/scripts/getAppConfig.js", projectRoot, assetsDir, "android", "false", configMode)
          }
        }

        variant.preBuildProvider.configure { it.dependsOn(createConfigTask) }
        project.android.sourceSets.maybeCreate(variant.name).assets.srcDirs += assetsDir
      }
    } catch (Exception ignored) {
      hasVariants = false
    }
  }

  if (!hasVariants) {
    ['debug', 'release', 'debugOptimized'].each { variantName ->
      def targetBuildDir = project.layout.buildDirectory.asFile.getOrNull() ?: file("\$buildDir")
      def assetsDir = file("\$targetBuildDir/generated/assets/expo-constants/\${variantName}")
      def configMode = (variantName == "debug" || variantName == "debugOptimized") ? "development" : "production"

      def createConfigTask = tasks.register("create\${variantName.capitalize()}ExpoConfig", Exec) {
        description = 'expo-constants: Create app.config.'
        doFirst {
          assetsDir.deleteDir()
          assetsDir.mkdirs()
        }
        outputs.upToDateWhen { false }
        outputs.dir assetsDir
        workingDir projectRoot
        if (Os.isFamily(Os.FAMILY_WINDOWS)) {
          commandLine("cmd", "/c", *nodeExecutableAndArgs, "\$expoConstantsDir/scripts/getAppConfig.js", projectRoot, assetsDir, "android", "false", configMode)
        } else {
          commandLine(*nodeExecutableAndArgs, "\$expoConstantsDir/scripts/getAppConfig.js", projectRoot, assetsDir, "android", "false", configMode)
        }
      }

      tasks.named("preBuild").configure { it.dependsOn(createConfigTask) }
      project.android.sourceSets.maybeCreate(variantName).assets.srcDirs += assetsDir
    }
  }

  def targetBuildDir = project.layout.buildDirectory.asFile.getOrNull() ?: file("\$buildDir")
  def fingerprintAssetsDir = file("\$targetBuildDir/generated/assets/expo-constants-fingerprint")

  def createFingerprintTask = tasks.register('createExpoFingerprint', Exec) {
    description = 'expo-constants: Embed the project fingerprint (app.fingerprint) in debug builds.'
    doFirst {
      fingerprintAssetsDir.deleteDir()
      fingerprintAssetsDir.mkdirs()
    }
    outputs.upToDateWhen { false }
    outputs.dir fingerprintAssetsDir
    workingDir projectRoot
    if (Os.isFamily(Os.FAMILY_WINDOWS)) {
      commandLine("cmd", "/c", *nodeExecutableAndArgs, "\$expoConstantsDir/scripts/createFingerprintFile.js", projectRoot, fingerprintAssetsDir, "android")
    } else {
      commandLine(*nodeExecutableAndArgs, "\$expoConstantsDir/scripts/createFingerprintFile.js", projectRoot, fingerprintAssetsDir, "android")
    }
  }

  tasks.named("preBuild").configure { it.dependsOn(createFingerprintTask) }
  project.android.sourceSets.maybeCreate('debug').assets.srcDirs += fingerprintAssetsDir
}
`;
  fs.writeFileSync(constantsFile, cleanConstantsGradle, 'utf8');
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
