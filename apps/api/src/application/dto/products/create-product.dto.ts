import { ApiProperty } from '@nestjs/swagger';
import { ProductUnit } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Ürün oluşturma isteği.
 *
 * `POST /products` (FIRM_ADMIN, BRANCH_MANAGER) için gövde. Ürün, ait olduğu
 * tenant'a otomatik bağlanır: `tenantId` istemciden alınmaz; Prisma Client
 * Extension tarafından JWT'deki tenant bağlamından atanır (bkz.
 * implementation_plan.md §6.1, §9.2). Bu yüzden burada yalnızca kullanıcının
 * girdiği iş alanları tanımlanır (bkz. §7 — `Product` modeli).
 */
export class CreateProductDto {
  @ApiProperty({
    description: 'Ürün görünen adı.',
    example: 'Ayçiçek Yağı 5L',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    description:
      'Stok kodu (SKU). Tenant içinde benzersizdir (bkz. §7 — `@@unique([tenantId, sku])`).',
    example: 'AYC-YAG-5L',
    minLength: 1,
    maxLength: 60,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  sku!: string;

  @ApiProperty({
    description:
      'Ürün barkodu. Mobil tarama akışında `GET /products/barcode/:barcode` ile aranır.',
    example: '8690000000017',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({
    description:
      'Ürünün stok takip birimi. Belirtilmezse veritabanında PIECE kabul edilir.',
    enum: ProductUnit,
    enumName: 'ProductUnit',
    example: ProductUnit.LITER,
    required: false,
    default: ProductUnit.PIECE,
  })
  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @ApiProperty({
    description: 'Ürün kategorisi (serbest metin).',
    example: 'Gıda',
    required: false,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiProperty({
    description: 'Ürün açıklaması.',
    example: 'Rafine ayçiçek yağı, 5 litrelik teneke ambalaj.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description:
      'Ürünün aktif olup olmadığı. Belirtilmezse veritabanında true kabul edilir.',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
