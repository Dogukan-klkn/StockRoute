import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Kullanıcı girişi isteği.
 *
 * `POST /auth/login` (Public) için gövde. Kullanıcı e-postası tek başına
 * benzersiz değildir (aynı e-posta farklı tenant'larda bulunabilir); bu yüzden
 * `tenantSlug` ile hangi firma altında giriş yapıldığı belirtilir
 * (bkz. implementation_plan.md §9.1, §7 — `@@unique([tenantId, email])`).
 */
export class LoginDto {
  @ApiProperty({
    description: 'Kullanıcı e-posta adresi.',
    example: 'admin@acme.com',
  })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email!: string;

  @ApiProperty({
    description: 'Kullanıcı şifresi.',
    example: 'GucluParola123',
  })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({
    description: 'Giriş yapılacak firmanın kısa kodu (slug).',
    example: 'acme-lojistik',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  tenantSlug!: string;
}
