import { PrismaClient, ProductUnit, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Demo seed'i (Gün 7 — Tenant Onboarding & Seed).
 *
 * Geliştirme ortamı için çok kiracılı (multi-tenant) bir demo veri seti üretir:
 * en az iki izole firma (Tenant) ve her firmada birer `FIRM_ADMIN` kullanıcı,
 * ayrıca izolasyonu elle gözlemlemeye yardımcı birer şube + ürün + envanter.
 *
 * Çalıştırma:  `pnpm --filter @stockroute/api prisma:seed`
 * (dahili olarak `prisma db seed` → `ts-node prisma/seed.ts`).
 *
 * Idempotent: `upsert` kullanır; tekrar çalıştırıldığında kopya kayıt üretmez,
 * mevcut demo kayıtlarını yerinde günceller.
 */
const prisma = new PrismaClient();

/** bcrypt tuz (salt) maliyeti — AuthService ile aynı değer (BCRYPT_SALT_ROUNDS). */
const BCRYPT_SALT_ROUNDS = 10;

/** Seed edilecek tek bir demo firmanın (tenant) betimlemesi. */
interface DemoTenantSpec {
  readonly slug: string;
  readonly name: string;
  readonly admin: {
    readonly email: string;
    readonly password: string;
    readonly fullName: string;
  };
  readonly branch: { readonly code: string; readonly name: string; readonly city: string };
  readonly product: { readonly sku: string; readonly name: string; readonly unit: ProductUnit };
}

/**
 * İki izole demo firma. Bilinçli olarak aynı admin e-postası (`admin@demo.test`)
 * her ikisinde de kullanılır: `@@unique([tenantId, email])` sayesinde bu geçerlidir
 * ve login'in neden `tenantSlug` gerektirdiğini (tenant izolasyonu) örnekler.
 */
const DEMO_TENANTS: readonly DemoTenantSpec[] = [
  {
    slug: 'acme-lojistik',
    name: 'Acme Lojistik A.Ş.',
    admin: { email: 'admin@demo.test', password: 'DemoParola123', fullName: 'Ayşe Yılmaz' },
    branch: { code: 'IST-MERKEZ', name: 'İstanbul Merkez Depo', city: 'İstanbul' },
    product: { sku: 'ACME-SKU-001', name: 'Acme Palet', unit: ProductUnit.PIECE },
  },
  {
    slug: 'globex-tedarik',
    name: 'Globex Tedarik Ltd.',
    admin: { email: 'admin@demo.test', password: 'DemoParola123', fullName: 'Mehmet Demir' },
    branch: { code: 'ANK-MERKEZ', name: 'Ankara Merkez Depo', city: 'Ankara' },
    product: { sku: 'GLBX-SKU-001', name: 'Globex Kutu', unit: ProductUnit.BOX },
  },
];

/**
 * Tek bir demo firmayı ve ona bağlı admin/şube/ürün/envanteri idempotent şekilde
 * oluşturur. Tüm alt kayıtlar `tenant.id`'ye bağlanarak izolasyon korunur.
 */
async function seedTenant(spec: DemoTenantSpec): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: spec.slug },
    update: { name: spec.name, isActive: true },
    create: { slug: spec.slug, name: spec.name },
  });

  const passwordHash = await bcrypt.hash(spec.admin.password, BCRYPT_SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: spec.admin.email } },
    update: { fullName: spec.admin.fullName, role: UserRole.FIRM_ADMIN, passwordHash },
    create: {
      tenantId: tenant.id,
      email: spec.admin.email,
      passwordHash,
      fullName: spec.admin.fullName,
      role: UserRole.FIRM_ADMIN,
    },
  });

  const branch = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: spec.branch.code } },
    update: { name: spec.branch.name, city: spec.branch.city },
    create: {
      tenantId: tenant.id,
      code: spec.branch.code,
      name: spec.branch.name,
      city: spec.branch.city,
    },
  });

  const product = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: spec.product.sku } },
    update: { name: spec.product.name, unit: spec.product.unit },
    create: {
      tenantId: tenant.id,
      sku: spec.product.sku,
      name: spec.product.name,
      unit: spec.product.unit,
    },
  });

  await prisma.inventory.upsert({
    where: { branchId_productId: { branchId: branch.id, productId: product.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      productId: product.id,
      quantity: 100,
      minThreshold: 10,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`  ✓ ${spec.name} (slug: ${spec.slug}) — admin: ${admin.email}`);
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Demo seed başlıyor — çok kiracılı firma verisi oluşturuluyor...');
  for (const spec of DEMO_TENANTS) {
    await seedTenant(spec);
  }
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Seed tamamlandı.');
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed sırasında hata oluştu:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
