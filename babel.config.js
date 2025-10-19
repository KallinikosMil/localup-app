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
            '@app': './app',
            '@modules': './src/modules',   // ← requested alias
            '@core': './src/core',
            '@components': './src/ui/components',
            '@theme': './src/ui/theme'
          }
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
