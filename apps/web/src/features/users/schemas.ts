import { z } from 'zod';
import { UserRole } from '@stockroute/shared-types';

/**
 * Kullanıcı oluşturma/düzenleme form şeması (react-hook-form + zod).
 *
 * Alanlar backend `CreateUserDto` ile hizalıdır. `password` burada opsiyoneldir
 * çünkü düzenleme modunda boş bırakılabilir ("değiştirmek istemiyorum"); ancak
 * **oluşturma** modunda zorunludur — bu koşullu kural `createUserFormSchema` ile
 * uygulanır (bkz. UserFormDialog: mod'a göre şema seçilir).
 */
const baseUserFormSchema = z.object({
  fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalı'),
  email: z.string().email('Geçerli bir e-posta girin'),
  role: z.nativeEnum(UserRole),
  /** Boş string "şube atanmadı" demektir; gönderimde undefined'a çevrilir. */
  branchId: z.string(),
  isActive: z.boolean(),
});

/** Düzenleme şeması: şifre boş bırakılabilir, girildiyse en az 8 karakter. */
export const editUserFormSchema = baseUserFormSchema.extend({
  password: z
    .string()
    .refine((value) => value === '' || value.length >= 8, 'Şifre en az 8 karakter olmalı'),
});

/** Oluşturma şeması: şifre zorunlu. */
export const createUserFormSchema = baseUserFormSchema.extend({
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
});

export type UserFormValues = z.infer<typeof editUserFormSchema>;
