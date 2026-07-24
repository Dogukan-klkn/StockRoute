import { UserRole } from '@stockroute/shared-types';
import { useAuthStore } from '@/lib/auth-store';
import { useBranchStore } from '@/lib/branch-store';

/**
 * Şube listesini seçebilen roller (branches.controller.ts — yönetsel rollerle
 * aynı kapsam). Diğer roller (WAREHOUSE_STAFF/FIELD_STAFF) kendi şubesiyle sınırlıdır
 * ve şube seçici yerine kendi şube adını görür (plan §12.2, web Gün 16 deseni).
 */
export const BRANCH_SELECT_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FIRM_ADMIN,
  UserRole.BRANCH_MANAGER,
];

/**
 * "Şu an hangi şubeye bakıyoruz" sorusunun tek cevabı.
 *
 * Stok (Gün 18) ve tarama (Gün 19) ekranları bu hook'u paylaşır; böylece
 * tarama sonucundaki "bu şubedeki miktar" ile stok listesindeki miktar
 * daima aynı şubeye aittir. Rol mantığı Gün 18'den birebir korunur:
 *   - seçebilen roller → paylaşılan store'daki seçim
 *   - diğer roller     → kullanıcının kendi şubesi (`user.branch`)
 */
export function useEffectiveBranch() {
  const user = useAuthStore((state) => state.user);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);

  const canSelectBranch = user?.role !== undefined && BRANCH_SELECT_ROLES.includes(user.role);
  const ownBranch = user?.branch ?? null;

  // Seçici gösteren roller için seçili şube; diğerleri kendi şubesine sabitlenir.
  const effectiveBranchId = canSelectBranch ? selectedBranchId : (ownBranch?.id ?? '');

  return { canSelectBranch, ownBranch, effectiveBranchId };
}
