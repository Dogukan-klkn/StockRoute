/**
 * Şube (Branch) API yanıt tipi.
 *
 * Backend `Branch` Prisma modelini (bkz. apps/api/prisma/schema.prisma) birebir
 * yansıtır; GET/POST/PATCH uç noktaları bu şekli döner (sarmalayıcı zarf yoktur).
 * `city`, `address`, `phone` veritabanında nullable'dır.
 */
export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
