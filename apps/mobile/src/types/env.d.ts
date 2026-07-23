// EXPO_PUBLIC_* ortam değişkenleri için tip tanımı.
//
// Expo bu değişkenleri derleme sırasında `process.env` üzerinden enjekte eder
// (yalnızca EXPO_PUBLIC_ önekli olanlar istemciye ulaşır). Expo'nun ürettiği
// `expo-env.d.ts` bazı akışlarda (prebuild/pm clear) yeniden üretilene kadar
// kaybolabildiğinden, `process.env` tipini burada — sürüm kontrolündeki kendi
// dosyamızda — sabitliyoruz ki typecheck deterministik olsun.
declare const process: {
  env: {
    readonly EXPO_PUBLIC_API_URL?: string;
    readonly [key: string]: string | undefined;
  };
};
