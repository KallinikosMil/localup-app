module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'], // match tsconfig baseUrl
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@app': './src/app',
            '@features': './src/features',
            '@shared': './src/shared',
            '@providers': './src/providers',
            '@store': './src/store',
            '@config': './src/config',
            '@theme': './src/theme'
          }
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
