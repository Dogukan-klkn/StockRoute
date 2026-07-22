/**
 * Aşama 2 doğrulaması — real-time olayların query cache'ine yansıması.
 *
 * Asıl kanıt: Sekme A bir işlem yapar, Sekme B'ye HİÇ dokunulmaz (tıklama yok,
 * yenileme yok) ve B kendiliğinden güncellenir. Bu ancak gerçek tarayıcı +
 * iki sekme ile gösterilebilir.
 *
 * Kullanım: dev sunucuları (api + web) ayakta iken `node scripts/e2e/realtime-verify.mjs`
 */
import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
const API = 'http://localhost:3000';
const OUT = 'c:/Users/Dogukan/Desktop/Truncgil_staj/docs/day17-web-outputs';

const CRED = { email: 'admin@demo.test', password: 'DemoParola123', tenantSlug: 'acme-lojistik' };

async function login(page) {
  await page.goto(WEB + '/login');
  await page.getByPlaceholder('Örn. demo-firma').fill(CRED.tenantSlug);
  await page.getByPlaceholder('ornek@firma.com').fill(CRED.email);
  await page.getByPlaceholder('••••••••').fill(CRED.password);
  await page.getByRole('button', { name: /giriş/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 });
}

/** API token'ı — olayları tetiklemek için doğrudan HTTP çağrısı yapacağız. */
async function apiToken() {
  const r = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CRED),
  });
  return (await r.json()).accessToken;
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push([name, ok, detail]);
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const consoleErrors = [];

const token = await apiToken();
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const branches = await (await fetch(API + '/branches', { headers: H })).json();
const products = await (await fetch(API + '/products', { headers: H })).json();

// --- Sekme A ve B: ikisi de Transferler ekranında ---
const pageA = await ctx.newPage();
const pageB = await ctx.newPage();
for (const [tag, p] of [['A', pageA], ['B', pageB]]) {
  p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${tag}] ${m.text()}`); });
}

await login(pageA);
await pageA.goto(WEB + '/movements');
await pageA.waitForTimeout(1500);

await pageB.goto(WEB + '/movements');
await pageB.waitForTimeout(2500); // socket bağlansın

// DİKKAT: Transfer listesi sayfalıdır (sayfa başına 10 satır); yeni kayıt
// listenin başına eklenir ama satır SAYISI değişmez. Bu yüzden sayı değil,
// ilk satırın kimliği (içeriği) karşılaştırılır.
const firstRowBefore = await pageB.locator('table tbody tr').first().innerText();

// --- TEST 1: movement:created → Sekme B otomatik güncellenir ---
// İşlemi API üzerinden yapıyoruz: böylece B'nin güncellemesi KESİNLİKLE
// socket olayından gelir (B'de hiçbir mutation onSuccess'i çalışmaz).
const createRes = await fetch(API + '/movements', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    sourceBranchId: branches[0].id,
    destinationBranchId: branches[1].id,
    items: [{ productId: products[0].id, quantity: 3 }],
  }),
});
const created = await createRes.json();

// B'ye DOKUNMADAN listenin başına yeni kaydın gelmesini bekle.
let firstRowAfter = firstRowBefore;
for (let i = 0; i < 20; i += 1) {
  await pageB.waitForTimeout(500);
  firstRowAfter = await pageB.locator('table tbody tr').first().innerText();
  if (firstRowAfter !== firstRowBefore) break;
}
check(
  '1. Sekme B: yeni transfer otomatik listelendi (movement:created)',
  firstRowAfter !== firstRowBefore,
  `ilk satır değişti, id: ${created.id?.slice(-6)}`,
);

await pageB.screenshot({ path: OUT + '/02-realtime-movement-created.png' });

// --- TEST 2: movement:statusChanged → Sekme B'de durum chip'i değişir ---
// Yeni transferin satırını bul (en üstte, PENDING).
const rowB = pageB.locator('table tbody tr').first();
const statusBefore = (await rowB.innerText()).includes('Beklemede');

await fetch(`${API}/movements/${created.id}/approve`, { method: 'POST', headers: H });

let statusChanged = false;
let statusTextAfter = '';
for (let i = 0; i < 20; i += 1) {
  await pageB.waitForTimeout(500);
  statusTextAfter = await rowB.innerText();
  if (!statusTextAfter.includes('Beklemede')) { statusChanged = true; break; }
}
check(
  '2. Sekme B: durum chip\'i otomatik güncellendi (movement:statusChanged)',
  statusBefore && statusChanged,
  `"Beklemede" → "${statusTextAfter.includes('Onaylandı') ? 'Onaylandı' : statusTextAfter.split('\n').pop()}"`,
);

await pageB.screenshot({ path: OUT + '/03-realtime-status-changed.png' });

// --- TEST 3: inventory:updated → Sekme B'nin envanteri güncellenir ---
const inv = await (await fetch(API + '/inventory', { headers: H })).json();
const target = inv[0];
const newQty = target.quantity + 7;
const targetBranch = branches.find((b) => b.id === target.branchId);

await pageB.goto(WEB + '/inventory');
await pageB.waitForTimeout(2000);

// FIRM_ADMIN'de envanter ekranı şube seçilene kadar liste göstermez; stoğunu
// değiştireceğimiz şubeyi seçiyoruz ki değişim ekranda görünür olsun.
await pageB.getByRole('combobox').first().click();
await pageB.getByRole('option', { name: targetBranch.name }).click();
await pageB.waitForTimeout(2000);

const bodyBefore = await pageB.locator('body').innerText();

await fetch(API + '/inventory/adjust', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    branchId: target.branchId,
    productId: target.productId,
    quantity: newQty,
    reason: 'Real-time doğrulama testi',
  }),
});

let invUpdated = false;
for (let i = 0; i < 20; i += 1) {
  await pageB.waitForTimeout(500);
  const bodyAfter = await pageB.locator('body').innerText();
  if (bodyAfter !== bodyBefore) { invUpdated = true; break; }
}
check(
  '3. Sekme B: envanter otomatik tazelendi (inventory:updated)',
  invUpdated,
  `miktar → ${newQty}`,
);

await pageB.screenshot({ path: OUT + '/04-realtime-inventory-updated.png' });

// --- TEST 4: Konsol temiz mi ---
check('4. Konsol hatası yok', consoleErrors.length === 0, consoleErrors.join(' | ') || 'temiz');

const passed = results.filter((r) => r[1]).length;
console.log(`\nSonuç: ${passed}/${results.length}`);

await browser.close();
process.exit(passed === results.length ? 0 : 1);
