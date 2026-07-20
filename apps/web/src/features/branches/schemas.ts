import { z } from 'zod';

/**
 * Şube oluşturma/düzenleme form şeması (react-hook-form + zod).
 *
 * Alanlar backend `CreateBranchDto` ile hizalıdır: `name`, `code` zorunlu;
 * `city`, `address`, `phone` opsiyonel; `isActive` boolean. `code` mockup'taki
 * örneklerle (SB-KDK, MRK-001) uyumlu olarak yalnızca büyük harf, rakam ve tire
 * kabul eder (bkz. plan §12.1).
 */
export const branchFormSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  code: z
    .string()
    .min(2, 'Kod en az 2 karakter olmalı')
    .regex(/^[A-Z0-9-]+$/, 'Sadece büyük harf, rakam ve tire kullanın'),
  city: z.string().min(2, 'Şehir gerekli'),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean(),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;
