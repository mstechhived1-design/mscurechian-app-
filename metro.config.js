const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit workers to 1 to prevent multi-threaded V8 heap / Zone memory exhaustion on Windows Node
config.maxWorkers = 1;

if (!config.resolver.assetExts.includes('ttf')) {
  config.resolver.assetExts.push('ttf');
}
if (!config.resolver.assetExts.includes('otf')) {
  config.resolver.assetExts.push('otf');
}

module.exports = config;