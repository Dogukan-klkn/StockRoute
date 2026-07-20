import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../api/products-api';

/** Ürün listesi query anahtarı üreticisi — arama/kategori değişince key değişir. */
export const productsQueryKey = (search: string, category: string) =>
  ['products', { search, category }] as const;

/**
 * Ürünleri getirir (`GET /products`). `search` ve `category` query key'in parçası
 * olduğu için değeri değişince TanStack Query otomatik yeni istek atar; arama
 * debounce'u çağıran bileşende yapılır (bkz. ProductsPage). `keepPreviousData`
 * ile yazarken tablo boşalmaz, önceki sonuç görünür kalır (yumuşak geçiş).
 */
export function useProducts(search: string, category: string) {
  return useQuery({
    queryKey: productsQueryKey(search, category),
    queryFn: () => fetchProducts({ search, category }),
    placeholderData: keepPreviousData,
  });
}
