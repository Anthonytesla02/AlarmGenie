const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable support for web development with proper host configuration
config.server = {
  ...config.server,
  port: 5000,
  host: '0.0.0.0',
  useGlobalHotkey: false,
  enableVisualizer: false,
};

module.exports = config;