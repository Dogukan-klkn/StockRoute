import type { ProductUnit } from '@stockroute/shared-types';

/**
 * Ürün (Product) API yanıt tipi.
 *
 * Backend `Product` Prisma modelini (bkz. apps/api/prisma/schema.prisma) birebir
 * yansıtır; GET/POST/PATCH uç noktaları bu şekli döner (sarmalayıcı zarf yoktur).
 * `barcode`, `category`, `description` veritabanında nullable'dır. `unit`
 * `ProductUnit` enum'undandır (varsayılan PIECE). Not: minimum stok eşiği ürün
 * üzerinde değil `Inventory` kaydındadır (schema.prisma — Inventory.minThreshold),
 * bu yüzden burada yer almaz.
 */
export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: ProductUnit;
  category: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
