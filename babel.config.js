module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // react-native-reanimated v4 plugin (internally delegates to react-native-worklets/plugin)
      // Only ONE of these two must be listed — they are identical. Using canonical reanimated name.
      'react-native-reanimated/plugin',
    ],
  };
};
