import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Genişletilmiş (tenant-aware) Prisma Client'ı uygulamaya sağlayan global modül.
 *
 * `@Global`: veritabanı erişimi neredeyse tüm domain modüllerinde gerektiği için
 * `PrismaService` her modülde tek tek import edilmeden enjekte edilebilir.
 * `TenantContextService`'e olan bağımlılık `TenantModule` (global) üzerinden gelir.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
