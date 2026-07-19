const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  stream: require.resolve('./polyfills/stream.js'),
  fs: require.resolve('./polyfills/fs.js'),
  crypto: require.resolve('./polyfills/crypto.js'),
  buffer: require.resolve('./polyfills/buffer.js'),
  process: require.resolve('./polyfills/process.js'),
  path: require.resolve('./polyfills/path.js'),
};

module.exports = config;
