/**
 * @stockroute/shared-types — Ortak tip katmanı (iskelet).
 *
 * Bu paket `api`, `web` ve `mobile` tarafından import edilir; böylece
 * tip uyuşmazlıkları derleme zamanında yakalanır (bkz. implementation_plan.md §5.5).
 *
 * İlerleyen fazlarda aşağıdaki modüller eklenip buradan re-export edilecek:
 *   - entities.ts       → Tenant, Branch, Product, Inventory, StockMovement
 *   - dto/              → CreateBranchDto, CreateMovementDto, ...
 *   - api-contracts.ts  → istek/yanıt tipleri
 */

export * from './enums';
export * from './socket-events';
