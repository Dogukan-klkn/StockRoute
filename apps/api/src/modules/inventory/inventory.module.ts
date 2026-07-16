import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

/**
 * Envanter (Inventory) modülü (§9.5).
 *
 * `PrismaService` global `PrismaModule`'den, `TenantContextService` global
 * `TenantModule`'den enjekte edilir; burada tekrar import edilmez. `RolesGuard`
 * `Reflector`'a bağımlıdır (NestJS core sağlar), `JwtAuthGuard` Passport
 * stratejisini kullanır (global `AuthModule` üzerinden kayıtlı) — bu yüzden ek
 * import gerekmez.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
