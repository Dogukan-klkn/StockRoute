import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload } from '../../application/interfaces/jwt-payload.interface';
import { TenantContextService } from '../../infrastructure/tenant/tenant-context.service';

/**
 * Gelen her istekte tenant kimliğini çözümleyip `TenantContextService` içine
 * yerleştiren middleware.
 *
 * Tenant kimliği artık güvenilir tek kaynaktan gelir: `Authorization` header'ındaki
 * JWT'nin `tenantId` claim'i (bkz. plan §6.1). Middleware auth guard'dan ÖNCE
 * çalışabildiği için token doğrulama burada "yumuşak"tır:
 *  - Token yoksa ya da geçersiz/süresi dolmuşsa → hata FIRLATILMAZ; tenant bağlamı
 *    açılmadan devam edilir (public endpoint'ler token istemez; korumalı
 *    endpoint'lerde erişimi `JwtAuthGuard` reddeder).
 *  - Token geçerliyse → `tenantId` bağlama yerleştirilir ve Prisma extension
 *    izolasyonu bu değerden zorlar.
 *
 * Bağlam, `run(...)` çağrısının içinde açılır; böylece controller ve servislerdeki
 * tüm async işlemler aynı tenant bağlamını görür.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = this.resolveTenantId(req);

    if (tenantId === undefined) {
      // Bağlam açmadan geçir: public istekler ve geçersiz token'lar buraya düşer.
      next();
      return;
    }

    this.tenantContext.run({ tenantId }, () => next());
  }

  /**
   * `Authorization: Bearer <token>` header'ından tenantId'yi çıkarır.
   * Token yoksa/çözülemezse `undefined` döner (hata fırlatmaz).
   */
  private resolveTenantId(req: Request): string | undefined {
    const token = this.extractBearerToken(req);
    if (!token) {
      return undefined;
    }

    try {
      // İmza + süre doğrulanır; başarısızsa aşağıda yakalanıp yok sayılır.
      const payload = this.jwtService.verify<JwtPayload>(token);
      return typeof payload.tenantId === 'string' && payload.tenantId.length > 0
        ? payload.tenantId
        : undefined;
    } catch {
      // Geçersiz/süresi dolmuş token: sessizce pas geç. Erişim kararı guard'ın işidir.
      return undefined;
    }
  }

  /** `Authorization` header'ından Bearer şemasındaki ham token'ı ayıklar. */
  private extractBearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (typeof header !== 'string') {
      return undefined;
    }
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : undefined;
  }
}
