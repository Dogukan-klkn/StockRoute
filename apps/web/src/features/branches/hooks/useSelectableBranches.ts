import { useQuery } from '@tanstack/react-query';
import { fetchSelectableBranches } from '../api/branches-api';

/** Seçilebilir şube listesi query anahtarı. */
export const SELECTABLE_BRANCHES_QUERY_KEY = ['branches', 'selectable'] as const;

/**
 * Seçim listeleri için şubeleri getirir (`GET /branches/selectable`).
 *
 * `useBranches`'ten farkı: bu uç **tüm rollere** açıktır ve yalnızca aktif
 * şubelerin `{ id, name, code }` bilgisini döner. Transfer talebi tüm rollere
 * açık olduğu ve iki şube seçmeyi gerektirdiği için form bu hook'u kullanır;
 * yönetsel ekranlar (Şubeler sayfası) `useBranches`'i kullanmaya devam eder.
 */
export function useSelectableBranches() {
  return useQuery({
    queryKey: SELECTABLE_BRANCHES_QUERY_KEY,
    queryFn: fetchSelectableBranches,
  });
}
