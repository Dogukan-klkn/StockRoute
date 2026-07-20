import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Kullanıcı oluşturma isteği.
 *
 * `POST /users` (FIRM_ADMIN) için gövde. Kullanıcı, ait olduğu tenant'a otomatik
 * bağlanır: `tenantId` istemciden alınmaz; Prisma Client Extension tarafından
 * JWT'deki tenant bağlamından atanır (bkz. implementation_plan.md §6.1, §9.3).
 * Bu yüzden burada yalnızca kullanıcının girdiği iş alanları tanımlanır
 * (bkz. §7 — `User` modeli). Şifre servis katmanında bcrypt ile hash'lenir;
 * `passwordHash` asla yanıtta dönmez (SafeUser sözleşmesi).
 */
export class CreateUserDto {
  @ApiProperty({
    description:
      'Kullanıcının giriş e-postası. Tenant içinde benzersizdir (bkz. §7 — `@@unique([tenantId, email])`).',
    example: 'ahmet.yilmaz@firma.com',
    maxLength: 180,
  })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiProperty({
    description: "Kullanıcı şifresi (düz metin). Servis katmanında bcrypt ile hash'lenir.",
    example: 'GucluSifre123',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({
    description: 'Kullanıcının görünen adı soyadı.',
    example: 'Ahmet Yılmaz',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({
    description: 'Kullanıcının rolü (RBAC — bkz. §8 rol matrisi).',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.BRANCH_MANAGER,
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({
    description:
      "Kullanıcının atandığı şube id'si. FIRM_ADMIN için boş bırakılabilir; şube " +
      'bazlı roller (BRANCH_MANAGER, WAREHOUSE_STAFF, FIELD_STAFF) için beklenir.',
    example: 'clx0branch0id',
    required: false,
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({
    description: 'Kullanıcının aktif olup olmadığı. Belirtilmezse veritabanında true kabul edilir.',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
