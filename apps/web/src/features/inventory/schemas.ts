import { z } from 'zod';

/**
 * Stok düzeltme form şeması (react-hook-form + zod).
 *
 * `quantity` backend'de **mutlak değer değil, değişim miktarıdır (delta)**:
 * `newQuantity = previousQuantity + quantity` (bkz. inventory.service.ts —
 * adjustInventory). Bu yüzden negatif değerlere izin verilir, yalnızca 0
 * anlamsız olduğu için engellenir.
 *
 * `reason` backend'de opsiyoneldir (AdjustInventoryDto, max 255); audit trail
 * kalitesi için UI'da zorunlu tutulur (bkz. plan §9.5 — manuel düzeltmeler
 * izlenebilir kalmalı).
 */
export const adjustStockSchema = z.object({
  quantity: z.coerce
    .number({ error: 'Geçerli bir sayı girin' })
    .int('Miktar tam sayı olmalı')
    .refine((value) => value !== 0, 'Değişim miktarı 0 olamaz'),
  reason: z
    .string()
    .min(3, 'Düzeltme nedeni en az 3 karakter olmalı')
    .max(255, 'Düzeltme nedeni en fazla 255 karakter olabilir'),
});

/** Formun gönderdiği (doğrulanmış) değerler — `quantity` sayıya çevrilmiş halde. */
export type AdjustStockFormValues = z.output<typeof adjustStockSchema>;

/**
 * Formun tuttuğu ham değerler. `z.coerce` girdi tipini `unknown` yaptığı için
 * react-hook-form'a input/output tipleri ayrı verilir; alan boş string olarak
 * başlar ve doğrulamada sayıya çevrilir.
 */
export type AdjustStockFormInput = z.input<typeof adjustStockSchema>;

/**
 * Düşük stok eşiği form şeması.
 *
 * Backend `UpdateThresholdDto` ile hizalıdır: tam sayı ve negatif olamaz.
 * Eşik bir ayardır; stok miktarını değiştirmez ve audit kaydı yazmaz.
 */
export const thresholdSchema = z.object({
  minThreshold: z.coerce
    .number({ error: 'Geçerli bir sayı girin' })
    .int('Eşik tam sayı olmalı')
    .min(0, 'Eşik negatif olamaz'),
});

export type ThresholdFormValues = z.output<typeof thresholdSchema>;
export type ThresholdFormInput = z.input<typeof thresholdSchema>;
