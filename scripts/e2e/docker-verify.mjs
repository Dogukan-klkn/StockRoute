/**
 * Docker uçtan uca doğrulaması — compose ile ayağa kalkan sistemin
 * tarayıcıdan gerçekten çalıştığını kanıtlar.
 *
 * Kapsam: giriş (seed kullanıcısı) → dashboard gerçek veri → WebSocket
 * bağlantısı (Gün 17 real-time katmanı ters vekil arkasında yaşıyor mu).
 *
 * Kullanım: `docker compose up --build -d` sonrası
 *   node scripts/e2e/docker-verify.mjs
 */
import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
const OUT = 'c:/Users/Dogukan/Desktop/Truncgil_staj/docs/docker-outputs';
const CRED = { email: 'admin@demo.test', password: 'DemoParola123', tenantSlug: 'acme-lojistik' };

const results = [];
const check = (name, ok, detail = '') => {
  results.push([name, ok]);
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

// WebSocket bağlantılarını izle: ters vekil arkasında upgrade gerçekleşmeli.
const sockets = [];
page.on('websocket', (ws) => sockets.push({ url: ws.url(), closed: false }));

// CDP ile gerçek handshake durum kodunu yakala (101 Switching Protocols).
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
const handshakes = [];
cdp.on('Network.webSocketHandshakeResponseReceived', (e) =>
  handshakes.push(`${e.response.status} ${e.response.statusText}`),
);

// --- Giriş: seed'den gelen kullanıcı ---
await page.goto(WEB + '/login');
await page.getByPlaceholder('Örn. demo-firma').fill(CRED.tenantSlug);
await page.getByPlaceholder('ornek@firma.com').fill(CRED.email);
await page.getByPlaceholder('••••••••').fill(CRED.password);
await page.getByRole('button', { name: /giriş/i }).click();
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
check('1. Seed kullanıcısıyla giriş yapıldı', true, CRED.email);

await page.waitForTimeout(4000);

// --- Dashboard gerçek veriyle dolu mu (seed verisi görünüyor mu) ---
const body = await page.locator('body').innerText();
const kpiCard = page.locator('.MuiCard-root').filter({ hasText: 'Toplam Şube' });
const kpiText = (await kpiCard.count()) > 0 ? await kpiCard.first().innerText() : '';
const branchCount = Number(kpiText.match(/(\d+)/)?.[1] ?? -1);
check(
  '2. Dashboard seed verisiyle dolu (Toplam Şube > 0)',
  branchCount > 0,
  `Toplam Şube: ${branchCount}`,
);
check(
  '3. Dashboard yerelleştirilmiş içerik gösteriyor',
  body.includes('Genel Bakış') && body.includes('Son Transferler'),
);

// --- WebSocket: ters vekil arkasında bağlantı kuruldu mu ---
const wsList = sockets.filter((s) => s.url.includes('socket.io'));
check(
  '4. WebSocket bağlantısı kuruldu (nginx ters vekil arkasında)',
  wsList.length >= 1,
  wsList[0]?.url ?? 'bağlantı yok',
);
check(
  '5. WebSocket el sıkışması 101 Switching Protocols',
  handshakes.length >= 1 && handshakes.every((h) => h.startsWith('101')),
  handshakes.join(', ') || 'handshake yakalanamadı',
);

// Soketin sayfa origin'ine (web) gittiğini doğrula — mutlak adres gömülmemiş.
check(
  '6. Soket sayfa origin\'ini kullanıyor (localhost:3000 değil)',
  wsList.length > 0 && wsList[0].url.includes('localhost:5173'),
  wsList[0]?.url ?? '-',
);

await page.screenshot({ path: OUT + '/01-docker-dashboard.png', fullPage: true });

check('7. Konsol hatası yok', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | ') || 'temiz');

const passed = results.filter((r) => r[1]).length;
console.log(`\nSonuç: ${passed}/${results.length}`);
await browser.close();
process.exit(passed === results.length ? 0 : 1);
