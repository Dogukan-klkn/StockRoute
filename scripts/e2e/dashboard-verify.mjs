/**
 * Aşama 3 doğrulaması — Dashboard gerçek veri + RBAC + real-time.
 *
 * Kullanım: dev sunucuları ayakta iken `node scripts/e2e/dashboard-verify.mjs`
 */
import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
const API = 'http://localhost:3000';
const OUT = 'c:/Users/Dogukan/Desktop/Truncgil_staj/docs/day17-web-outputs';
const SLUG = 'acme-lojistik';

const ADMIN = { email: 'admin@demo.test', password: 'DemoParola123', tenantSlug: SLUG };
const ROLES = [
  { name: 'WAREHOUSE_STAFF', email: 'd17-depo@test.local' },
  { name: 'FIELD_STAFF', email: 'd17-saha@test.local' },
  { name: 'BRANCH_MANAGER', email: 'd17-mudur@test.local' },
];

async function login(page, cred) {
  await page.goto(WEB + '/login');
  await page.getByPlaceholder('Örn. demo-firma').fill(cred.tenantSlug ?? SLUG);
  await page.getByPlaceholder('ornek@firma.com').fill(cred.email);
  await page.getByPlaceholder('••••••••').fill(cred.password ?? 'DemoParola123');
  await page.getByRole('button', { name: /giriş/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2500);
}

/** Bir KPI kartının değerini okur; kart yoksa null döner. */
async function kpiValue(page, label) {
  const card = page.locator('.MuiCard-root').filter({ hasText: label });
  if ((await card.count()) === 0) return null;
  const text = await card.first().innerText();
  const match = text.replace(/\./g, '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push([name, ok]);
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const consoleErrors = [];

// Beklenen değerleri API'den bağımsız olarak hesapla (dashboard'un doğruluğu
// bu sayılara karşı ölçülür).
const tok = await (await fetch(API + '/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ADMIN),
})).json();
const H = { Authorization: `Bearer ${tok.accessToken}`, 'Content-Type': 'application/json' };
const [selectable, products, movements, inventory] = await Promise.all([
  (await fetch(API + '/branches/selectable', { headers: H })).json(),
  (await fetch(API + '/products', { headers: H })).json(),
  (await fetch(API + '/movements', { headers: H })).json(),
  (await fetch(API + '/inventory', { headers: H })).json(),
]);
const expected = {
  branches: selectable.length,
  products: products.length,
  pending: movements.filter((m) => m.status === 'PENDING').length,
  lowStock: inventory.filter((i) => i.quantity <= i.minThreshold).length,
};
console.log('Beklenen KPI:', JSON.stringify(expected), '\n');

// --- FIRM_ADMIN: 4 KPI, gerçek sayılar ---
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
await login(page, ADMIN);

const got = {
  branches: await kpiValue(page, 'Toplam Şube'),
  products: await kpiValue(page, 'Toplam Ürün'),
  pending: await kpiValue(page, 'Bekleyen Transfer'),
  lowStock: await kpiValue(page, 'Düşük Stok'),
};
check(
  '1. FIRM_ADMIN: 4 KPI gerçek verilerle dolu (placeholder değil)',
  got.branches === expected.branches && got.products === expected.products &&
    got.pending === expected.pending && got.lowStock === expected.lowStock,
  JSON.stringify(got),
);

// Son Transferler ve Düşük Stok bölümleri gerçek kayıt gösteriyor mu
const bodyText = await page.locator('body').innerText();
check(
  '2. Son Transferler gerçek kayıt listeliyor',
  !bodyText.includes('Henüz transfer yok') && movements.length > 0,
  `${movements.length} transfer mevcut`,
);
check(
  '3. Düşük Stok bölümü doğru durumda',
  expected.lowStock > 0
    ? !bodyText.includes('Düşük stok uyarısı yok')
    : bodyText.includes('Düşük stok uyarısı yok'),
  `${expected.lowStock} düşük stok kaydı`,
);

await page.screenshot({ path: OUT + '/01-dashboard-live.png', fullPage: true });

// --- TEST 4: Real-time — başka yerden transfer oluştur, dashboard güncellensin ---
const pendingBefore = await kpiValue(page, 'Bekleyen Transfer');
await fetch(API + '/movements', {
  method: 'POST', headers: H,
  body: JSON.stringify({
    sourceBranchId: selectable[0].id,
    destinationBranchId: selectable[1].id,
    items: [{ productId: products[0].id, quantity: 2 }],
  }),
});

let pendingAfter = pendingBefore;
for (let i = 0; i < 20; i += 1) {
  await page.waitForTimeout(500);
  pendingAfter = await kpiValue(page, 'Bekleyen Transfer');
  if (pendingAfter === pendingBefore + 1) break;
}
check(
  '4. Real-time: Bekleyen Transfer KPI +1 (dashboard\'a dokunulmadan)',
  pendingAfter === pendingBefore + 1,
  `${pendingBefore} → ${pendingAfter}`,
);
await page.screenshot({ path: OUT + '/02-dashboard-realtime.png', fullPage: true });

// --- TEST 5: Real-time — stok düzeltmesi Düşük Stok KPI'ını güncellemeli ---
const lowBefore = await kpiValue(page, 'Düşük Stok');
// Eşiği yüksek bir kaydı düşük stoğa sok: quantity'yi eşiğin altına indir.
const healthy = inventory.find((i) => i.quantity > i.minThreshold && i.minThreshold > 0)
  ?? inventory[0];
await fetch(API + '/inventory/adjust', {
  method: 'POST', headers: H,
  body: JSON.stringify({
    branchId: healthy.branchId, productId: healthy.productId,
    quantity: -(healthy.quantity - Math.max(0, healthy.minThreshold - 1)),
    reason: 'Dashboard real-time testi',
  }),
});
let lowAfter = lowBefore;
for (let i = 0; i < 20; i += 1) {
  await page.waitForTimeout(500);
  lowAfter = await kpiValue(page, 'Düşük Stok');
  if (lowAfter !== lowBefore) break;
}
check(
  '5. Real-time: Düşük Stok KPI güncellendi',
  lowAfter !== lowBefore,
  `${lowBefore} → ${lowAfter}`,
);

// --- TEST 6-8: RBAC — her rol için KPI görünürlüğü ---
for (const role of ROLES) {
  const rctx = await browser.newContext();
  const rpage = await rctx.newPage();
  rpage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${role.name}] ${m.text()}`); });
  await login(rpage, { email: role.email });

  const vals = {
    branches: await kpiValue(rpage, 'Toplam Şube'),
    products: await kpiValue(rpage, 'Toplam Ürün'),
    pending: await kpiValue(rpage, 'Bekleyen Transfer'),
    lowStock: await kpiValue(rpage, 'Düşük Stok'),
  };
  // Beklenti: Şube/Ürün/Bekleyen her rolde görünür (selectable + products tüm
  // rollere açık). Düşük Stok yalnızca şubesi belirlenebilen rollerde.
  const coreVisible = vals.branches !== null && vals.products !== null && vals.pending !== null;
  check(
    `RBAC ${role.name}: çekirdek KPI'lar görünür, uydurma sayı yok`,
    coreVisible && vals.branches === expected.branches && vals.products === expected.products,
    JSON.stringify(vals),
  );
  await rpage.screenshot({ path: `${OUT}/0${6 + ROLES.indexOf(role)}-dashboard-${role.name.toLowerCase()}.png`, fullPage: true });
  await rctx.close();
}

check('Konsol hatası yok', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'temiz');

const passed = results.filter((r) => r[1]).length;
console.log(`\nSonuç: ${passed}/${results.length}`);
await browser.close();
process.exit(passed === results.length ? 0 : 1);
