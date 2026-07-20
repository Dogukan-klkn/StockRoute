import { z } from 'zod';
import { ProductUnit } from '@stockroute/shared-types';

/**
 * Ürün oluşturma/düzenleme form şeması (react-hook-form + zod).
 *
 * Alanlar backend `CreateProductDto` ile hizalıdır: `name`, `sku` zorunlu;
 * `barcode`, `category`, `description` opsiyonel; `unit` `ProductUnit` enum'undan.
 * `minStockThreshold` yoktur — o değer ürün değil envanter (Inventory) alanıdır
 * (bkz. types.ts notu). `isActive` şu an formda yönetilmez; oluşturmada backend
 * varsayılanı (true) geçerlidir.
 */
export const productFormSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  sku: z.string().min(1, 'SKU zorunlu'),
  barcode: z.string().optional(),
  unit: z.nativeEnum(ProductUnit),
  category: z.string().optional(),
  description: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

/** Ürün birimi Türkçe etiketleri (Select + tablo pill'i için tek kaynak). */
export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  [ProductUnit.PIECE]: 'Adet',
  [ProductUnit.KG]: 'Kg',
  [ProductUnit.LITER]: 'Litre',
  [ProductUnit.BOX]: 'Koli',
  [ProductUnit.PACK]: 'Paket',
};
