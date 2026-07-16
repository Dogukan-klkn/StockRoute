import { Module } from '@nestjs/common';
import { MovementsController } from '../../api/controllers/movements.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { MovementsService } from './movements.service';

/**
 * Şubeler arası transfer (StockMovement) modülü (§9.6).
 *
 * `PrismaService` global `PrismaModule`'den, `TenantContextService` global
 * `TenantModule`'den enjekte edilir; burada tekrar import edilmez. `RolesGuard`
 * `Reflector`'a bağımlıdır (NestJS core sağlar), `JwtAuthGuard` Passport
 * stratejisini kullanır (global `AuthModule` üzerinden kayıtlı) — bu yüzden ek
 * import gerekmez. `MovementsService`, Gün 13'te Socket.io gateway'inin emit
 * noktalarına erişebilmesi için export edilir.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}
