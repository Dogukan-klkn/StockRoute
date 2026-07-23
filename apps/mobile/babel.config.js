// Babel yapılandırması.
//
// babel-preset-expo, Expo SDK 52 için gerekli tüm dönüşümleri içerir
// (expo-router dahil; ayrı bir `expo-router/babel` eklentisine gerek yok).
// Workspace dışındaki ui-tokens kaynak .ts dosyaları da bu preset ile
// transpile edilir (metro.config.js watchFolders sayesinde erişilebilir).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
