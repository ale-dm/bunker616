module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@app': './src/app',
          '@navigation': './src/navigation',
          '@features': './src/features',
          '@shared': './src/shared',
        },
      },
    ],
    // react-native-reanimated/plugin debe ir siempre el último.
    'react-native-reanimated/plugin',
  ],
};
