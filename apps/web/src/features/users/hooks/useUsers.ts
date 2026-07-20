import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api/users-api';

/** Kullanıcı listesi query anahtarı — mutation'lar bunu invalidate eder. */
export const USERS_QUERY_KEY = ['users'] as const;

/** Aktif firmanın kullanıcılarını getirir (`GET /users`, yalnızca FIRM_ADMIN). */
export function useUsers() {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: fetchUsers,
  });
}
