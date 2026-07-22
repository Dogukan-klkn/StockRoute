import { UserRole, MovementStatus } from '@stockroute/shared-types';
import { useAuthStore } from '../../../lib/auth-store';
import { useProfile } from '../../auth/hooks/useProfile';
import { useSelectableBranches } from '../../branches/hooks/useSelectableBranches';
import { useProducts } from '../../products/hooks/useProducts';
import { useMovements } from '../../movements/hooks/useMovements';
import { useInventory } from '../../inventory/hooks/useInventory';
import { isLowStock, type InventoryItem } from '../../inventory/types';
import type { Movement } from '../../movements/types';

/**
 * Dashboard KPI'ları ve listeleri (plan §12.1).
 *
 * Backend'de özel bir "dashboard summary" ucu YOKTUR; tüm metrikler mevcut liste
 * uçlarından türetilir. Bu bilinçli bir tercihtir: yeni endpoint eklemeden,
 * ekranların zaten kullandığı query anahtarlarını paylaşarak real-time
 * invalidate'ten (bkz. useRealtimeSync) otomatik faydalanırız.
 *
 * KPI kaynakları ve rol erişimi:
 *  - Toplam Şube   → `GET /branches/selectable` (tüm roller; yalnızca aktif şubeler)
 *  - Toplam Ürün   → `GET /products` (tüm roller — Gün 16'da FIELD_STAFF'a açıldı)
 *  - Bekleyen Transfer → `GET /movements` içinden PENDING sayımı (tüm roller)
 *  - Düşük Stok    → `GET /inventory` (tüm roller; kapsam role göre değişir, aşağıya bak)
 *
 * Düşük stok kapsamı — envanter ekranıyla (kendi-şube deseni) tutarlıdır:
 * şube listeleyebilen roller tüm firmanın düşük stoğunu görür; diğerleri
 * yalnızca kendi atanmış şubelerininkini. Şubesi olmayan ve şube listeleyemeyen
 * kullanıcıda envanter sorgusu hiç açılmaz ve KPI **gizlenir** — uydurma ya da
 * yanıltıcı sıfır gösterilmez.
 */

/** `GET /branches` yetkisine sahip roller (bkz. InventoryPage — aynı liste). */
const BRANCH_LIST_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FIRM_ADMIN,
  UserRole.BRANCH_MANAGER,
];

/** "Son Transferler" bölümünde gösterilecek kayıt sayısı (mockup: 6 satır). */
const RECENT_MOVEMENTS_LIMIT = 6;

/** "Düşük Stok" bölümünde gösterilecek kayıt sayısı (mockup: 5 satır). */
const LOW_STOCK_LIMIT = 5;

export interface DashboardStats {
  /** KPI değerleri; `null` = bu rolde gösterilmez (kart render edilmez). */
  branchCount: number | null;
  productCount: number | null;
  pendingMovementCount: number | null;
  lowStockCount: number | null;
  recentMovements: Movement[];
  lowStockItems: InventoryItem[];
  /** Düşük stok bölümü bu rolde gösterilebilir mi. */
  canSeeLowStock: boolean;
  isLoading: boolean;
}

export function useDashboardStats(): DashboardStats {
  const role = useAuthStore((state) => state.user?.role);
  const canListBranches = role !== undefined && BRANCH_LIST_ROLES.includes(role);

  // Kendi şubesiyle sınırlı roller şubelerini profilden öğrenir (envanter
  // ekranındaki desenin aynısı).
  const { data: profile, isLoading: profileLoading } = useProfile();
  const ownBranch = profile?.user.branch ?? null;

  const { data: branches, isLoading: branchesLoading } = useSelectableBranches();
  const { data: products, isLoading: productsLoading } = useProducts('', '');
  const { data: movements, isLoading: movementsLoading } = useMovements();

  // Envanter kapsamı: yönetsel roller tüm firma, diğerleri kendi şubesi.
  const inventoryBranchId = canListBranches ? undefined : (ownBranch?.id ?? '');
  const inventoryEnabled = canListBranches || Boolean(ownBranch);
  const { data: inventory, isLoading: inventoryLoading } = useInventory(
    { branchId: inventoryBranchId || undefined },
    inventoryEnabled,
  );

  const lowStockItems = (inventory ?? []).filter(isLowStock);

  // Bekleyen transfer, liste yanıtından sayılır: `useMovements()` zaten filtresiz
  // tüm listeyi çekiyor (bkz. hook notu), böylece ikinci bir istek atılmaz ve
  // "Son Transferler" ile aynı cache paylaşılır.
  const pendingCount = (movements ?? []).filter(
    (movement) => movement.status === MovementStatus.PENDING,
  ).length;

  const isLoading =
    branchesLoading ||
    productsLoading ||
    movementsLoading ||
    (inventoryEnabled && inventoryLoading) ||
    (!canListBranches && profileLoading);

  return {
    branchCount: branches?.length ?? null,
    productCount: products?.length ?? null,
    pendingMovementCount: movements ? pendingCount : null,
    lowStockCount: inventoryEnabled && inventory ? lowStockItems.length : null,
    // Liste yanıtı zaten "en yeni önce" sıralıdır (movements.service.ts).
    recentMovements: (movements ?? []).slice(0, RECENT_MOVEMENTS_LIMIT),
    lowStockItems: lowStockItems.slice(0, LOW_STOCK_LIMIT),
    canSeeLowStock: inventoryEnabled,
    isLoading,
  };
}
