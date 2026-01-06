module.exports = function (api) {
  api.cache(true);

  console.log('🔥 BABEL CONFIG LOADED 🔥');

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
