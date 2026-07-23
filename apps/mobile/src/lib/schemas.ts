import { z } from 'zod';

/** Login formu doğrulaması — web ile aynı sözleşme ve Türkçe mesajlar. */
export const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'Firma kodu zorunludur'),
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Şifre zorunludur'),
});

export type LoginInput = z.infer<typeof loginSchema>;
