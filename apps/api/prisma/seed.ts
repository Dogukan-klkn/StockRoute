import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Demo seed'i (iskelet).
 *
 * İlerleyen fazlarda burada demo tenant + kullanıcı + şube + ürün + envanter
 * verisi oluşturulacak (bkz. implementation_plan.md §18 — Gün 7).
 * Şimdilik gövde bilinçli olarak boştur.
 */
async function main(): Promise<void> {
  // TODO(Gün 7): demo tenant + FIRM_ADMIN + şube/ürün/envanter seed'i eklenecek.
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
