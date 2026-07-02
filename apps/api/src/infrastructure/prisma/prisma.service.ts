import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../tenant/tenant-context.service';
import { createTenantExtension } from './tenant.extension';

/**
 * `$extends` ile genişletilmiş (extended) Prisma Client'ın tipi.
 * Bu tip, tenant izolasyon extension'ı uygulanmış client'ı temsil eder ve
 * uygulama genelinde enjekte edilecek olan tiptir.
 */
export type ExtendedPrismaClient = ReturnType<PrismaService['createExtendedClient']>;

/**
 * Uygulamanın veritabanı giriş noktası.
 *
 * `PrismaClient`'ı doğrudan sunmak yerine, tenant izolasyon extension'ı
 * uygulanmış **genişletilmiş** client'ı döndürür. Servisler bu client üzerinden
 * (`prisma.client`) sorgu attığında, aktif `tenantId` otomatik olarak
 * uygulanır (bkz. tenant.extension.ts).
 *
 * Extension bağlamı çalışma zamanında `TenantContextService` (AsyncLocalStorage)
 * üzerinden okur; bu yüzden client singleton olarak bir kez kurulur ve her
 * istekte doğru tenant'ı görür.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** Bağlantı yaşam döngüsünü yönettiğimiz temel (extend edilmemiş) client. */
  private readonly baseClient = new PrismaClient();

  /** Tenant izolasyon extension'ı uygulanmış, uygulamada kullanılacak client. */
  public readonly client: ExtendedPrismaClient;

  constructor(private readonly tenantContext: TenantContextService) {
    this.client = this.createExtendedClient();
  }

  /**
   * Temel client'a tenant extension'ını uygular. Dönüş tipi `ExtendedPrismaClient`
   * için kaynak olarak kullanılır (bkz. yukarıdaki tip tanımı).
   */
  private createExtendedClient() {
    return this.baseClient.$extends(createTenantExtension(() => this.tenantContext.getTenantId()));
  }

  async onModuleInit(): Promise<void> {
    await this.baseClient.$connect();
    this.logger.log('Prisma veritabanı bağlantısı kuruldu.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.baseClient.$disconnect();
  }
}
