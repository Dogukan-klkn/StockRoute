import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * İstek boyunca taşınan tenant (kiracı) bağlamı.
 * Şimdilik yalnızca `tenantId` tutuyoruz; Gün 5'te JWT geldiğinde
 * `userId`, `role` gibi alanlarla genişletilebilir.
 */
export interface TenantStore {
  readonly tenantId: string;
}

/**
 * Tenant bağlamını istek yaşam döngüsü boyunca güvenli biçimde taşıyan servis.
 *
 * Node.js'in `AsyncLocalStorage` mekanizmasını kullanır: bir isteğin
 * middleware'inde `run(...)` ile açılan bağlam, o istek zincirindeki tüm
 * async çağrılarda (controller → servis → Prisma) otomatik olarak erişilebilir.
 * Böylece `tenantId`'yi katmanlar arasında elden ele taşımaya gerek kalmaz ve
 * Prisma Client Extension bu değeri buradan okuyarak izolasyonu zorlar.
 *
 * request-scoped provider yerine AsyncLocalStorage tercih edildi: singleton
 * kalır (performanslı), ancak yine de istek başına izole bir depo sunar.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  /**
   * Verilen tenant bağlamı içinde `callback`'i çalıştırır.
   * `callback` içindeki (ve ondan doğan tüm async) çağrılar bu bağlamı görür.
   */
  run<T>(store: TenantStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  /**
   * Aktif tenant deposunu döndürür; bağlam yoksa `undefined`.
   */
  getStore(): TenantStore | undefined {
    return this.storage.getStore();
  }

  /**
   * Aktif `tenantId`; bağlam yoksa `undefined`.
   * Prisma extension bu değeri filtreleme için kullanır.
   */
  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }
}
