module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-worklets requires its babel plugin to be listed LAST.
    // Without this the worklets JS runtime is not initialized and the app
    // crashes at startup with a "Worklets not initialized" error.
    plugins: ['react-native-worklets/plugin'],
  };
};
