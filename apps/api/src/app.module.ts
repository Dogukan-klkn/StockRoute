import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { TenantResolverMiddleware } from './api/middleware/tenant-resolver.middleware';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { TenantModule } from './infrastructure/tenant/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MovementsModule } from './modules/movements/movements.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    // Global altyapı modülleri: tenant bağlamı + tenant-aware Prisma client.
    TenantModule,
    PrismaModule,
    // Auth modülü; TenantResolverMiddleware'in JWT decode için ihtiyaç duyduğu
    // JwtService'i (JwtModule) buradan sağlar (bkz. AuthModule exports).
    AuthModule,
    // Domain modülleri.
    BranchesModule,
    ProductsModule,
    InventoryModule,
    MovementsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  /**
   * Tenant çözümleme middleware'ini tüm rotalara bağlar. Böylece her istek,
   * controller'a ulaşmadan önce açılmış bir tenant bağlamı (AsyncLocalStorage)
   * içinde yürür ve Prisma extension aktif tenant'ı görebilir.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
