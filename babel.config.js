module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@app': './src/app',
            '@components': './src/ui/components',
            '@theme': './src/ui/theme',
          },
        },
      ],
    ],
  };
};
