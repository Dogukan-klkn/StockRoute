import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '../api/branches-api';

/** Şube listesi query anahtarı — mutation'lar bunu invalidate eder. */
export const BRANCHES_QUERY_KEY = ['branches'] as const;

/**
 * Aktif firmanın şubelerini getirir (`GET /branches`). Sunucu durumu yalnızca
 * TanStack Query'de tutulur; bileşenler `useState` ile veri saklamaz
 * (bkz. plan §5.4 — sunucu durumu yönetimi).
 *
 * Uç nokta yalnızca FIRM_ADMIN ve BRANCH_MANAGER'a açıktır; yetkisiz rollerde
 * gereksiz 403 üretmemek için çağıran ekran `enabled` ile isteği kapatabilir.
 */
export function useBranches(enabled = true) {
  return useQuery({
    queryKey: BRANCHES_QUERY_KEY,
    queryFn: fetchBranches,
    enabled,
  });
}
