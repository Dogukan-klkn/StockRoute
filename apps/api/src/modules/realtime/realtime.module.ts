import { Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { InventoryGateway } from '../../api/gateways/inventory.gateway';

/**
 * Gerçek zamanlı yayın modülü (Gün 13 — plan §10).
 *
 * `InventoryGateway`'i sağlar ve dışa aktarır; böylece Movements/Inventory gibi
 * domain modülleri gateway'i inject edip tenant room'una olay yayınlayabilir.
 *
 * `JwtModule` burada AuthModule ile aynı ortam değişkenlerinden (JWT_SECRET,
 * JWT_EXPIRES_IN) beslenir: WebSocket el sıkışmasındaki token, HTTP tarafında
 * üretilen token'la aynı sırla doğrulanmalıdır. AuthModule'ü import etmek yerine
 * JwtModule'ün ayrıca register edilmesi, RealtimeModule ↔ domain modülleri
 * arasında dairesel bağımlılık riskini ortadan kaldırır.
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as JwtSignOptions['expiresIn'],
      },
    }),
  ],
  providers: [InventoryGateway],
  exports: [InventoryGateway],
})
export class RealtimeModule {}
