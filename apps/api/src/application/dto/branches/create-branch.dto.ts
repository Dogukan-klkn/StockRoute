import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Şube oluşturma isteği.
 *
 * `POST /branches` (FIRM_ADMIN) için gövde. Şube, ait olduğu tenant'a otomatik
 * bağlanır: `tenantId` istemciden alınmaz; Prisma Client Extension tarafından
 * JWT'deki tenant bağlamından atanır (bkz. implementation_plan.md §6.1, §9.2).
 * Bu yüzden burada yalnızca kullanıcının girdiği iş alanları tanımlanır
 * (bkz. §7 — `Branch` modeli).
 */
export class CreateBranchDto {
  @ApiProperty({
    description: 'Şube görünen adı.',
    example: 'Merkez Şube',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description:
      'Şube kodu. Tenant içinde benzersizdir (bkz. §7 — `@@unique([tenantId, code])`).',
    example: 'IST-MERKEZ',
    minLength: 1,
    maxLength: 40,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @ApiProperty({
    description: 'Şube açık adresi.',
    example: 'Barbaros Bulvarı No:1, Beşiktaş',
    required: false,
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @ApiProperty({
    description: 'Şubenin bulunduğu şehir.',
    example: 'İstanbul',
    required: false,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiProperty({
    description: 'Şube iletişim telefonu.',
    example: '+90 212 000 00 00',
    required: false,
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    description: 'Şubenin aktif olup olmadığı. Belirtilmezse veritabanında true kabul edilir.',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
