import { z } from 'zod';

/**
 * Transfer talebi form şeması (react-hook-form + zod).
 *
 * Backend `CreateMovementDto` ile hizalıdır: kaynak/hedef şube zorunlu, `note`
 * opsiyonel, `items` en az bir kalem ve her kalemde `quantity >= 1`. Kaynak ve
 * hedef şubenin farklı olması kuralı backend'de de denetlenir (400); burada
 * kullanıcıya isteği göndermeden geri bildirim vermek için tekrarlanır.
 */
export const movementFormSchema = z
  .object({
    sourceBranchId: z.string().min(1, 'Kaynak şube seçin'),
    destinationBranchId: z.string().min(1, 'Hedef şube seçin'),
    note: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Ürün seçin'),
          quantity: z.coerce
            .number({ error: 'Geçerli bir sayı girin' })
            .int('Miktar tam sayı olmalı')
            .min(1, 'Miktar en az 1'),
        }),
      )
      .min(1, 'En az bir ürün ekleyin'),
  })
  .refine((data) => data.sourceBranchId !== data.destinationBranchId, {
    message: 'Kaynak ve hedef şube aynı olamaz',
    path: ['destinationBranchId'],
  })
  .refine(
    // Aynı ürün iki kez eklenirse backend `@@unique([movementId, productId])`
    // kısıtı nedeniyle 500 verir; formda önceden engellenir.
    (data) => new Set(data.items.map((item) => item.productId)).size === data.items.length,
    { message: 'Aynı ürün birden fazla kez eklenemez', path: ['items'] },
  );

/** Formun gönderdiği (doğrulanmış) değerler — `quantity` sayıya çevrilmiş. */
export type MovementFormValues = z.output<typeof movementFormSchema>;

/** Formun tuttuğu ham değerler (`z.coerce` girdiyi `unknown` yapar). */
export type MovementFormInput = z.input<typeof movementFormSchema>;
