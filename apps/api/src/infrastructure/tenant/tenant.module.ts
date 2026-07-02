import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

/**
 * Tenant bağlam altyapısını sağlayan global modül.
 *
 * `@Global` olmasının nedeni: `TenantContextService` hem middleware hem de
 * (dolaylı olarak) Prisma extension tarafından kullanılır ve tüm istek zinciri
 * boyunca tek bir singleton bağlam deposu gerekir. Global olması, her modülde
 * tekrar import etmeye gerek bırakmaz.
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantModule {}
