const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  stream: require.resolve('./polyfills/stream.js'),
  fs: require.resolve('./polyfills/fs.js'),
  crypto: require.resolve('./polyfills/crypto.js'),
  buffer: require.resolve('./polyfills/buffer.js'),
  process: require.resolve('./polyfills/process.js'),
  path: require.resolve('./polyfills/path.js'),
  http: require.resolve('./polyfills/http.js'),
  https: require.resolve('./polyfills/https.js'),
  url: require.resolve('./polyfills/url.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'xlsx') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/xlsx/dist/xlsx.mini.min.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
