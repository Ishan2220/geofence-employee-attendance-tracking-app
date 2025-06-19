module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Add module resolver for better path handling
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@contexts': './src/contexts',
            '@services': './src/services',
            '@utils': './src/utils',
            '@assets': './assets',
          },
        },
      ],
    ],
  };
}; 