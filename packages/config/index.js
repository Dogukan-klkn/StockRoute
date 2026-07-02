/**
 * `@stockroute/config` paket giriş noktası (package.json `main`).
 *
 * Ortak ESLint yapılandırmasını yeniden dışa aktarır; böylece alt projeler
 * hem `extends: ['@stockroute/config']` hem de
 * `extends: ['@stockroute/config/.eslintrc.js']` biçimini kullanabilir ve
 * paketin geçerli bir `main` dosyası olur (aksi halde bazı çözümleyiciler
 * paketi bulamıyordu).
 */
module.exports = require('./.eslintrc.js');
