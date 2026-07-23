// Metro yapılandırması — pnpm monorepo entegrasyonu.
//
// StockRoute bir pnpm workspace'idir; workspace paketleri (@stockroute/*)
// symlink'li node_modules üzerinden çözülür. Metro varsayılan olarak yalnızca
// proje köküne bakar, bu yüzden Expo'nun resmi monorepo pattern'ini uyguluyoruz:
//   1. watchFolders    → workspace kökünü izle (workspace paketlerinin kaynağı burada)
//   2. nodeModulesPaths→ hem projenin hem kökün node_modules'ını tara
//   3. disableHierarchicalLookup → pnpm symlink yapısında yukarı-yürüyen
//      çözümlemeyi kapat; sadece nodeModulesPaths kullanılsın (öngörülebilirlik)
//
// Bu sayede:
//   - @stockroute/shared-types (CJS dist) çözülür
//   - @stockroute/ui-tokens (kaynak .ts, workspace kökünde) izlenir ve
//     Babel ile transpile edilir
//
// bkz. implementation_plan.md §5.4, §11 — web ve mobil tek görsel dilden gelir.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Workspace kökünü izle — workspace paketlerinin kaynak dosyaları burada.
config.watchFolders = [workspaceRoot];

// 2. Modül çözümlemesini hem projeye hem köke yönlendir.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// NOT: `disableHierarchicalLookup` bilinçli olarak KAPALI bırakıldı.
// pnpm izole (symlink) node_modules yapısında @expo/metro-runtime gibi
// dolaylı bağımlılıklar `.pnpm/<pkg>/node_modules` altında yaşar; hiyerarşik
// yukarı-yürüyen çözümleme açık kalırsa Metro bu iç symlink'leri izleyebilir.
// (watchFolders + nodeModulesPaths workspace paketlerini çözmeye yeterli.)

module.exports = config;
