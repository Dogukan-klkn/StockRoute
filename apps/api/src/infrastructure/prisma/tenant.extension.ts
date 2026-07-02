import { Prisma } from '@prisma/client';
import type { TenantContextService } from '../tenant/tenant-context.service';

/**
 * Bu modeller otomatik tenant filtrelemesinin DIŞINDA tutulur.
 *
 * - `Tenant`: Kiracının kendisi; `tenantId` alanı yoktur (tenant tablosunun
 *   kendisi filtrelenemez, aksi halde login/onboarding sırasında tenant çözümü
 *   imkânsız olurdu).
 * - `StockMovementItem`: Kendi `tenantId`'si yoktur; tenant'a header olan
 *   `StockMovement` üzerinden bağlıdır (bkz. plan §7). Bu satırlar her zaman bir
 *   `StockMovement` üzerinden erişildiği için header seviyesindeki filtre
 *   izolasyonu zaten sağlar; doğrudan `tenantId` enjekte etmek şema hatası olur.
 */
const TENANT_EXEMPT_MODELS = new Set<string>(['Tenant', 'StockMovementItem']);

/** Otomatik `where: { tenantId }` eklenecek okuma operasyonları. */
const READ_OPERATIONS = new Set<string>([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/** `tenantId`'nin `data`'ya otomatik atanacağı yazma operasyonları. */
const CREATE_OPERATIONS = new Set<string>(['create', 'createMany']);

/** Hem `where` (kapsam) hem gerektiğinde `data` için işlenen operasyonlar. */
const WRITE_SCOPED_OPERATIONS = new Set<string>(['update', 'updateMany', 'delete', 'deleteMany']);

/**
 * Belirli bir `tenantId`'ye bağlı Prisma Client Extension üretir.
 *
 * Extension, `$allModels` üzerinden tüm operasyonları sarmalar (`$allOperations`)
 * ve tenant'a tabi modeller için:
 *  - **okuma** (`findMany`, `findFirst`, `findUnique`, `count`, ...): sorguya
 *    otomatik `where: { tenantId }` ekler.
 *  - **create/createMany**: oluşturulan kayda `tenantId` atar.
 *  - **update/delete (ve *Many)**: kapsamı `where: { tenantId }` ile daraltır;
 *    `upsert`'te hem `where`'e hem `create` verisine `tenantId` uygulanır.
 *
 * `tenantId` bağlamda yoksa (ör. login öncesi public endpoint) filtre
 * uygulanmaz — bu durumda çağıran katmanın izolasyonu sağlaması beklenir.
 * Böylece geliştirici `where: { tenantId }` yazmayı unutsa bile veri sızması
 * engellenir (bkz. plan §6.1).
 *
 * @param getTenantId Aktif tenantId'yi döndüren fonksiyon (AsyncLocalStorage'dan).
 */
export function createTenantExtension(getTenantId: TenantContextService['getTenantId']) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        // Tüm operasyonları tek noktadan sarmalıyoruz; böylece Prisma'nın
        // desteklediği her sorgu tipini model-agnostik ele alabiliriz.
        $allOperations({ model, operation, args, query }) {
          const tenantId = getTenantId();

          // Bağlam yok ya da model muaf → dokunmadan geçir.
          if (tenantId === undefined || TENANT_EXEMPT_MODELS.has(model)) {
            return query(args);
          }

          const scopedArgs = injectTenant(operation, args, tenantId);
          return query(scopedArgs);
        },
      },
    },
  });
}

/**
 * Operasyon tipine göre `args` üzerine tenant kapsamını enjekte eder.
 * `args`'ı mutasyona uğratmadan sığ kopya üzerinden çalışır.
 */
function injectTenant(operation: string, args: unknown, tenantId: string): Record<string, unknown> {
  const base: Record<string, unknown> =
    typeof args === 'object' && args !== null ? { ...(args as Record<string, unknown>) } : {};

  // Okuma + scoped yazma (update/delete): where'e tenantId ekle.
  if (READ_OPERATIONS.has(operation) || WRITE_SCOPED_OPERATIONS.has(operation)) {
    base.where = mergeTenantWhere(base.where, tenantId);
  }

  // create / createMany: oluşturulan veriye tenantId ata.
  if (CREATE_OPERATIONS.has(operation)) {
    base.data = injectTenantIntoData(base.data, tenantId);
  }

  // upsert: hem kaydı bulan where'e hem create yoluna tenantId uygula.
  if (operation === 'upsert') {
    base.where = mergeTenantWhere(base.where, tenantId);
    if (typeof base.create === 'object' && base.create !== null) {
      base.create = { ...(base.create as Record<string, unknown>), tenantId };
    }
  }

  return base;
}

/**
 * Mevcut `where` ile `{ tenantId }` filtresini birleştirir. Kullanıcının
 * verdiği koşulları korur, sadece tenant kısıtını ekler (üzerine yazmaz).
 */
function mergeTenantWhere(existingWhere: unknown, tenantId: string): Record<string, unknown> {
  if (typeof existingWhere === 'object' && existingWhere !== null) {
    return { ...(existingWhere as Record<string, unknown>), tenantId };
  }
  return { tenantId };
}

/**
 * `create`/`createMany` verisine `tenantId` atar.
 * `data` bir dizi olabilir (createMany) ya da tekil obje (create).
 */
function injectTenantIntoData(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((row) =>
      typeof row === 'object' && row !== null
        ? { ...(row as Record<string, unknown>), tenantId }
        : row,
    );
  }
  if (typeof data === 'object' && data !== null) {
    return { ...(data as Record<string, unknown>), tenantId };
  }
  return data;
}
