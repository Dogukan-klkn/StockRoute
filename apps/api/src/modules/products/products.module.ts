import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

/**
 * Ürün (Product) modülü (§9.2).
 *
 * `PrismaService` global `PrismaModule`'den, `TenantContextService` global
 * `TenantModule`'den enjekte edilir; burada tekrar import edilmez. `RolesGuard`
 * `Reflector`'a bağımlıdır (NestJS core sağlar), `JwtAuthGuard` Passport
 * stratejisini kullanır (global `AuthModule` üzerinden kayıtlı) — bu yüzden ek
 * import gerekmez.
 */
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
