/**
 * Ara-aşama doğrulaması — düşük stok `notification` olayı.
 *
 * Kapsam:
 *  1. adjust ile eşik altına düşürme → snackbar çıkar.
 *  2. Zaten düşükken tekrar adjust → İKİNCİ bildirim ÇIKMAZ ("yeni düşüş" mantığı).
 *  3. ship ile kaynak stok eşik altına düşerse → bildirim çıkar.
 *  4. Tenant izolasyonu: başka tenant'ın oturumunda bildirim ÇIKMAZ.
 *
 * Kullanım: dev sunucuları ayakta iken `node scripts/e2e/notification-verify.mjs`
 */
import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
const API = 'http://localhost:3000';
const OUT = 'c:/Users/Dogukan/Desktop/Truncgil_staj/docs/day17-web-outputs';

const ACME = { email: 'admin@demo.test', password: 'DemoParola123', tenantSlug: 'acme-lojistik' };
const GLOBEX = { email: 'admin@demo.test', password: 'DemoParola123', tenantSlug: 'globex-tedarik' };

async function login(page, cred) {
  await page.goto(WEB + '/login');
  await page.getByPlaceholder('Örn. demo-firma').fill(cred.tenantSlug);
  await page.getByPlaceholder('ornek@firma.com').fill(cred.email);
  await page.getByPlaceholder('••••••••').fill(cred.password);
  await page.getByRole('button', { name: /giriş/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 });
}

async function tokenFor(cred) {
  const r = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cred),
  });
  return (await r.json()).accessToken;
}

/**
 * Snackbar'ın GÖRÜNÜR olmasını bekler.
 *
 * DİKKAT: MUI Snackbar kapandığında metni DOM'da bırakır (yalnızca solar).
 * Bu yüzden yalnızca metin aramak, önceki testten kalan bildirimi "yeni"
 * sanmaya yol açar (yanlış pozitif). Görünürlüğü `.MuiSnackbar-root` üzerinden
 * kontrol eder ve çağrı öncesi bekleyen bir toast varsa onun kapanmasını bekler.
 */
async function waitForLowStockToast(page, timeoutMs = 8000) {
  const snackbar = page.locator('.MuiSnackbar-root').filter({ hasText: 'Düşük Stok Uyarısı' });
  try {
    await snackbar.first().waitFor({ state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/** Ekranda açık bir snackbar varsa kapanmasını bekler (testler arası temizlik). */
async function waitForToastToClear(page) {
  const snackbar = page.locator('.MuiSnackbar-root');
  try {
    await snackbar.first().waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // Zaten yoksa sorun değil.
  }
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push([name, ok]);
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const acmeToken = await tokenFor(ACME);
const H = { Authorization: `Bearer ${acmeToken}`, 'Content-Type': 'application/json' };

// Test için bilinen bir envanter kaydı hazırla: eşiği 50, stoğu 100 yap.
const inv = await (await fetch(API + '/inventory', { headers: H })).json();
const target = inv[0];
const THRESHOLD = 50;

await fetch(`${API}/inventory/${target.id}/threshold`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ minThreshold: THRESHOLD }),
});
// Stoğu eşiğin ÜSTÜNE çek (100).
await fetch(API + '/inventory/adjust', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    branchId: target.branchId,
    productId: target.productId,
    quantity: 100 - target.quantity,
    reason: 'Test hazırlığı: eşik üstüne çek',
  }),
});

const ctxAcme = await browser.newContext();
const pageAcme = await ctxAcme.newPage();
const consoleErrors = [];
pageAcme.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
await login(pageAcme, ACME);
await pageAcme.waitForTimeout(2500); // socket bağlansın

// --- TEST 1: eşiğin altına düşür → bildirim çıkmalı ---
// 100 → 40 (eşik 50): YENİ düşüş.
await fetch(API + '/inventory/adjust', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    branchId: target.branchId,
    productId: target.productId,
    quantity: -60,
    reason: 'Eşik altına düşür',
  }),
});
const toast1 = await waitForLowStockToast(pageAcme);
check('1. adjust ile eşik altına düşüş → bildirim çıktı', toast1, '100 → 40 (eşik 50)');

if (toast1) {
  // Snackbar giriş animasyonu (fade/slide) bitsin; erken çekilen kare yarı
  // saydam ve okunmaz çıkıyor.
  await pageAcme.waitForTimeout(700);
  await pageAcme.screenshot({ path: OUT + '/05-realtime-notification.png' });
}

// Snackbar tamamen kapansın ki ikinci test kalıntı toast görmesin.
await waitForToastToClear(pageAcme);

// --- TEST 2: zaten düşükken tekrar düşür → İKİNCİ bildirim ÇIKMAMALI ---
// 40 → 30: hâlâ eşik altında ama YENİ geçiş değil.
await fetch(API + '/inventory/adjust', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    branchId: target.branchId,
    productId: target.productId,
    quantity: -10,
    reason: 'Zaten düşükken tekrar düşür',
  }),
});
const toast2 = await waitForLowStockToast(pageAcme, 6000);
check('2. Zaten düşükken tekrar düşüş → bildirim ÇIKMADI (spam yok)', !toast2, '40 → 30');

// --- TEST 3: ship ile eşik altına düşüş → bildirim çıkmalı ---
await waitForToastToClear(pageAcme);
const branches = await (await fetch(API + '/branches', { headers: H })).json();
// Stoğu tekrar eşik üstüne çek (30 → 100).
await fetch(API + '/inventory/adjust', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    branchId: target.branchId,
    productId: target.productId,
    quantity: 70,
    reason: 'Ship testi hazırlığı',
  }),
});
await waitForToastToClear(pageAcme); // bu adjust bildirim üretmez (yükseliş)

const destination = branches.find((b) => b.id !== target.branchId);
const mv = await (await fetch(API + '/movements', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    sourceBranchId: target.branchId,
    destinationBranchId: destination.id,
    items: [{ productId: target.productId, quantity: 60 }], // 100 → 40, eşik 50 altına
  }),
})).json();
await fetch(`${API}/movements/${mv.id}/approve`, { method: 'POST', headers: H });
await fetch(`${API}/movements/${mv.id}/ship`, { method: 'POST', headers: H });

const toast3 = await waitForLowStockToast(pageAcme);
check('3. ship ile kaynak stok eşik altına düştü → bildirim çıktı', toast3, '100 → 40 (sevk)');

// --- TEST 4: Tenant izolasyonu — Globex oturumunda bildirim ÇIKMAMALI ---
const ctxGlobex = await browser.newContext();
const pageGlobex = await ctxGlobex.newPage();
await login(pageGlobex, GLOBEX);
await pageGlobex.waitForTimeout(2500);

// Acme tarafında yeni bir düşük stok tetikle. Önce eşik üstüne çekip
// bekleyen toast'ların kapanmasını bekle ki ölçüm temiz olsun.
await fetch(API + '/inventory/adjust', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    branchId: target.branchId,
    productId: target.productId,
    quantity: 70,
    reason: 'İzolasyon testi hazırlığı',
  }),
});
await waitForToastToClear(pageAcme);
await fetch(API + '/inventory/adjust', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    branchId: target.branchId,
    productId: target.productId,
    quantity: -65,
    reason: 'İzolasyon testi: Acme düşük stok',
  }),
});

const acmeGotIt = await waitForLowStockToast(pageAcme);
const globexGotIt = await waitForLowStockToast(pageGlobex, 6000);
check(
  '4. Tenant izolasyonu: Acme bildirim aldı, Globex ALMADI',
  acmeGotIt && !globexGotIt,
  `acme: ${acmeGotIt}, globex: ${globexGotIt}`,
);

check('5. Konsol hatası yok', consoleErrors.length === 0, consoleErrors.join(' | ') || 'temiz');

const passed = results.filter((r) => r[1]).length;
console.log(`\nSonuç: ${passed}/${results.length}`);

await browser.close();
process.exit(passed === results.length ? 0 : 1);
