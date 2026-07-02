/**
 * Kök Prettier yapılandırması (monorepo geneli).
 *
 * Prettier, config dosyalarını yalnızca hedef dosyadan yukarı doğru arar;
 * `node_modules` içindeki paket config'lerini otomatik keşfetmez. Bu yüzden
 * ortak kuralları `packages/config/.prettierrc`'den (tek doğruluk kaynağı)
 * okuyup kökte açığa çıkarıyoruz — böylece `apps/*` ve `packages/*` altındaki
 * tüm dosyalar aynı biçimlendirmeyi paylaşır ve ESLint'in `prettier/prettier`
 * kuralı da bu ayarları kullanır.
 */
const fs = require('node:fs');
const path = require('node:path');

const shared = fs.readFileSync(
  path.join(__dirname, 'packages/config/.prettierrc'),
  'utf8',
);

module.exports = JSON.parse(shared);
