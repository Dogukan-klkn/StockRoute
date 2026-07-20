import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct, deleteProduct, updateProduct } from '../api/products-api';
import type { ProductFormValues } from '../schemas';

/**
 * Ürün create/update/delete mutation'ları. Her biri başarıda tüm `['products']`
 * query'lerini (arama/kategori varyantları dahil) invalidate eder ve refetch
 * bekler (optimistic update yok). Snackbar bildirimi çağıran bileşende yapılır.
 */
export function useProductMutations() {
  const queryClient = useQueryClient();

  // İlk segmenti 'products' olan tüm query'leri (arama varyantları) tazele.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] });

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) => createProduct(values),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) =>
      updateProduct(id, values),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}
