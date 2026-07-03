import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Firma (tenant) kaydı isteği.
 *
 * `POST /auth/register-tenant` (Public) için gövde. Bir işlemde (transaction)
 * hem izole bir `Tenant` hem de o tenant'a bağlı ilk `FIRM_ADMIN` kullanıcısı
 * oluşturmak için gereken alanları taşır (bkz. implementation_plan.md §9.1).
 */
export class RegisterTenantDto {
  @ApiProperty({
    description: 'Firma (tenant) görünen adı.',
    example: 'Acme Lojistik A.Ş.',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  firmName!: string;

  @ApiProperty({
    description:
      'Firma için benzersiz kısa kod (slug). Login sırasında tenant çözümlemede kullanılır. ' +
      'Yalnızca küçük harf, rakam ve tire içerebilir.',
    example: 'acme-lojistik',
    minLength: 2,
    maxLength: 60,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug yalnızca küçük harf, rakam ve tire içerebilir (örn. acme-lojistik).',
  })
  slug!: string;

  @ApiProperty({
    description: 'İlk Firma Admini (FIRM_ADMIN) e-posta adresi.',
    example: 'admin@acme.com',
  })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  adminEmail!: string;

  @ApiProperty({
    description: 'İlk Firma Admini şifresi. bcrypt ile hashlenerek saklanır.',
    example: 'GucluParola123',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  // bcrypt 72 bayttan sonrasını yok sayar; üst sınırı buna göre koyuyoruz.
  @MinLength(8)
  @MaxLength(72)
  adminPassword!: string;

  @ApiProperty({
    description: 'İlk Firma Admini tam adı.',
    example: 'Ayşe Yılmaz',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminFullName!: string;
}
