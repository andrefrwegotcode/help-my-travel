const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force ALL imports of 'react' and 'react-native' to use a single copy
// Prevents duplicate React instances from nested node_modules
const singletonModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(monorepoRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(monorepoRoot, 'node_modules/react/jsx-dev-runtime'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletonModules[moduleName]) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(projectRoot, 'index.js') },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
