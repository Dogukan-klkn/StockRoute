import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Ürün güncelleme isteği.
 *
 * `PATCH /products/:id` (FIRM_ADMIN, BRANCH_MANAGER) için gövde. Kısmi
 * güncellemeye izin verir: `CreateProductDto`'nun tüm alanları burada
 * opsiyoneldir (`PartialType`), böylece yalnızca değiştirilmek istenen alanlar
 * gönderilebilir. Alan doğrulama kuralları (`class-validator`) ve OpenAPI meta
 * verisi (`@ApiProperty`) `CreateProductDto`'dan devralınır (bkz.
 * implementation_plan.md §9.2).
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
