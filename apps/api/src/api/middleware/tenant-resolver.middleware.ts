import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextService } from '../../infrastructure/tenant/tenant-context.service';

/**
 * Geçici geliştirme tenant'ı.
 *
 * NOT (GÜN 5'te KALDIRILACAK): Kimlik doğrulama henüz yok. Şu an tenant kimliği
 * güvenilir bir kaynaktan (JWT claim'i) gelmiyor; middleware'in test edilebilir
 * olması için `x-tenant-id` header'ından okuyoruz, yoksa bu mock değere düşüyoruz.
 * Gün 5'te JWT devreye girince tenantId `request.user.tenantId` üzerinden
 * (JwtAuthGuard sonrası) alınacak ve header/mock tamamen kaldırılacak.
 */
const DEV_FALLBACK_TENANT_ID = 'dev-tenant';

/**
 * Gelen her istekte tenant kimliğini çözümleyip `TenantContextService` içine
 * yerleştiren middleware. Bağlam, isteğin geri kalanı (`next()` ve sonrası)
 * `run(...)` çağrısının içinde çalışacak şekilde açılır; böylece controller ve
 * servislerdeki tüm async işlemler aynı tenant bağlamını görür.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    // TODO(Gün 5): JWT doğrulandıktan sonra tenantId'yi token claim'inden al.
    const headerTenantId = req.headers['x-tenant-id'];
    const tenantId =
      (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined) ?? DEV_FALLBACK_TENANT_ID;

    // Bağlamı aç ve isteğin geri kalanını bu bağlam içinde yürüt.
    this.tenantContext.run({ tenantId }, () => next());
  }
}
