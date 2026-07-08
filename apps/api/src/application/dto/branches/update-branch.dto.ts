import { PartialType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto';

/**
 * Şube güncelleme isteği.
 *
 * `PATCH /branches/:id` (FIRM_ADMIN) için gövde. Kısmi güncellemeye izin verir:
 * `CreateBranchDto`'nun tüm alanları burada opsiyoneldir (`PartialType`), böylece
 * yalnızca değiştirilmek istenen alanlar gönderilebilir. Alan doğrulama kuralları
 * (`class-validator`) ve OpenAPI meta verisi (`@ApiProperty`) `CreateBranchDto`'dan
 * devralınır (bkz. implementation_plan.md §9.2).
 */
export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
