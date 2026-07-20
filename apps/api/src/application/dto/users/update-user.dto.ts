import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * Kullanıcı güncelleme isteği.
 *
 * `PATCH /users/:id` (FIRM_ADMIN) için gövde. Kısmi güncellemeye izin verir:
 * `CreateUserDto`'nun tüm alanları burada opsiyoneldir (`PartialType`), böylece
 * yalnızca değiştirilmek istenen alanlar gönderilebilir. Özellikle `password`
 * opsiyonel olur: boş gönderilirse mevcut şifre korunur (servis katmanında ele
 * alınır). Alan doğrulama kuralları (`class-validator`) ve OpenAPI meta verisi
 * (`@ApiProperty`) `CreateUserDto`'dan devralınır (bkz. implementation_plan.md §9.3).
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
