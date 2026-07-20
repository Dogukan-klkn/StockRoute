import { apiClient } from '../../../lib/api-client';
import type { ProductFormValues } from '../schemas';
import type { Product } from '../types';

/**
 * Ürün (Product) HTTP çağrıları (§9.2). Her fonksiyon tek bir uç noktayı sarar;
 * TanStack Query hook'ları (useProducts / useProductMutations) bunları tüketir.
 * `tenantId` istemciden gönderilmez — sunucu JWT bağlamından çözer.
 */

/** `GET /products?search=&category=` — arama/filtre parametreleri opsiyonel. */
export async function fetchProducts(params: {
  search?: string;
  category?: string;
}): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>('/products', {
    // Boş değerler gönderilmez; backend parametresiz tüm listeyi döner.
    params: {
      search: params.search || undefined,
      category: params.category || undefined,
    },
  });
  return data;
}

/** `POST /products` — yeni ürün oluşturur. */
export async function createProduct(values: ProductFormValues): Promise<Product> {
  const { data } = await apiClient.post<Product>('/products', values);
  return data;
}

/** `PATCH /products/:id` — mevcut ürünü günceller. */
export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  const { data } = await apiClient.patch<Product>(`/products/${id}`, values);
  return data;
}

/** `DELETE /products/:id` — ürünü siler. */
export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}
