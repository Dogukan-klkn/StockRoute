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

/**
 * `GET /branches/selectable` yanıt tipi — seçim listeleri için minimal görünüm.
 *
 * Yönetsel alanlar (adres, şehir, telefon, durum, tarihler) bilinçli olarak
 * yoktur; bu sayede uç nokta tüm rollere açıktır (bkz. apps/api —
 * BranchesService.findSelectable). Yalnızca aktif şubeleri içerir.
 */
export interface SelectableBranch {
  id: string;
  name: string;
  code: string;
}
