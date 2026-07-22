import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
const OUT = 'c:/Users/Dogukan/Desktop/Truncgil_staj/docs/day17-web-outputs';

/** Login formunu doldurup gönderir; dashboard'a inmeyi bekler. */
async function login(page) {
  await page.goto(WEB + '/login');
  await page.getByPlaceholder('Örn. demo-firma').fill('acme-lojistik');
  await page.getByPlaceholder('ornek@firma.com').fill('admin@demo.test');
  await page.getByPlaceholder('••••••••').fill('DemoParola123');
  await page.getByRole('button', { name: /giriş/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 });
}

/** Sayfaya WebSocket izleyici bağlar; kurulan WS bağlantılarını toplar. */
function trackWebSockets(page, bucket) {
  page.on('websocket', (ws) => {
    const entry = { url: ws.url(), closed: false };
    bucket.push(entry);
    ws.on('close', () => { entry.closed = true; });
  });
}

const browser = await chromium.launch();
const results = [];
const consoleErrors = [];

// --- TEST 1+2: Login → WS bağlantısı + StrictMode altında TEK bağlantı ---
const ctxA = await browser.newContext();
const pageA = await ctxA.newPage();
const socketsA = [];
trackWebSockets(pageA, socketsA);
pageA.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[A] ' + m.text()); });

// CDP ile gerçek handshake yanıtını (101) yakala.
const cdp = await ctxA.newCDPSession(pageA);
await cdp.send('Network.enable');
const handshakes = [];
cdp.on('Network.webSocketHandshakeResponseReceived', (e) => {
  handshakes.push({ status: e.response.status, text: e.response.statusText });
});

await login(pageA);
await pageA.waitForTimeout(3000); // socket bağlantısı + StrictMode ikinci mount

const wsA = socketsA.filter((s) => s.url.includes('socket.io'));
results.push(['1. Login → WS bağlantısı kuruldu', wsA.length >= 1]);
results.push([
  `2. Handshake 101 Switching Protocols (${handshakes.map((h) => h.status + ' ' + h.text).join(', ') || 'yok'})`,
  handshakes.length >= 1 && handshakes.every((h) => h.status === 101),
]);
results.push([
  `3. StrictMode altında TEK bağlantı (açılan WS: ${wsA.length}, açık kalan: ${wsA.filter((s) => !s.closed).length})`,
  wsA.filter((s) => !s.closed).length === 1,
]);

// Bağlı durumu gösteren ekran görüntüsü
await pageA.screenshot({ path: OUT + '/00-socket-connected.png', fullPage: false });

// --- TEST 4: İki sekme aynı kullanıcı → ikisi de bağlı ---
const pageB = await ctxA.newPage(); // aynı context = aynı oturum (ikinci sekme)
const socketsB = [];
trackWebSockets(pageB, socketsB);
pageB.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[B] ' + m.text()); });
await pageB.goto(WEB + '/');
await pageB.waitForTimeout(3000);

const wsB = socketsB.filter((s) => s.url.includes('socket.io'));
const openA = wsA.filter((s) => !s.closed).length;
const openB = wsB.filter((s) => !s.closed).length;
results.push([
  `4. İki sekme → her sekmede 1 bağlantı (A: ${openA}, B: ${openB})`,
  openA === 1 && openB === 1,
]);

// --- TEST 5: Logout → soket kapanıyor ---
// Auth store'u temizleyip sayfayı yeniden yükle: uygulama oturumsuz açılır.
await pageB.evaluate(() => { localStorage.removeItem('stockroute-auth'); });
await pageB.reload();
await pageB.waitForTimeout(2500);
const socketsAfterLogout = [];
trackWebSockets(pageB, socketsAfterLogout);
await pageB.waitForTimeout(1500);
const newWsAfterLogout = socketsAfterLogout.filter((s) => s.url.includes('socket.io')).length;
results.push([
  `5. Oturumsuz sayfa → yeni WS bağlantısı açılmıyor (${newWsAfterLogout} adet)`,
  newWsAfterLogout === 0,
]);

// Aktif oturumda logout: soket kapanmalı
const wsBeforeLogout = socketsA.filter((s) => s.url.includes('socket.io') && !s.closed).length;
await pageA.evaluate(() => { localStorage.removeItem('stockroute-auth'); });
await pageA.reload();
await pageA.waitForTimeout(2500);
const stillOpen = socketsA.filter((s) => s.url.includes('socket.io') && !s.closed).length;
results.push([
  `6. Logout/reload → önceki soket kapandı (önce açık: ${wsBeforeLogout}, şimdi açık: ${stillOpen})`,
  stillOpen === 0,
]);

console.log('\n=== AŞAMA 1 TARAYICI DOĞRULAMA ===');
let pass = 0;
for (const [name, ok] of results) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (ok) pass += 1;
}
console.log(`\nSonuç: ${pass}/${results.length}`);
console.log('Konsol hataları:', consoleErrors.length ? consoleErrors : '0 (temiz)');

await browser.close();
process.exit(pass === results.length ? 0 : 1);
