module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta → process.env for Zustand v5 + Metro compatibility
      'babel-plugin-transform-import-meta',
      // Reanimated plugin must be last
      'react-native-reanimated/plugin',
    ],
  };
};
