const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: [...assetExts, 'cjs'],
    sourceExts: [...sourceExts, 'cjs'],
    unstable_enablePackageExports: true,
    unstable_enableSymlinks: true,
    unstable_conditionNames: ['require', 'import'],
    extraNodeModules: {
      '@react-native-async-storage/async-storage': require.resolve('@react-native-async-storage/async-storage'),
      'expo-linear-gradient': require.resolve('expo-linear-gradient'),
      '@react-navigation/native': require.resolve('@react-navigation/native')
    }
  },
  transformer: {
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
    unstable_allowRequireContext: true,
  },
  maxWorkers: 2,
  server: {
    rewriteRequestUrl: (url) => {
      if (!url.startsWith('http') && !url.startsWith('file') && !url.startsWith('/')) {
        return url;
      }
      return url;
    },
  },
};

module.exports = mergeConfig(defaultConfig, config); 