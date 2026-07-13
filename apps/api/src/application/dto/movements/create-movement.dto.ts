import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Transfer talebindeki tek bir ürün kalemi.
 *
 * `CreateMovementDto.items` dizisinin elemanıdır; her kalem `MovementItem`
 * satırı olarak kaydedilir (bkz. implementation_plan.md §7 — `MovementItem`).
 *
 * Not: Kimlikler Prisma şemasında `cuid()` üretildiği için UUID formatı değil,
 * boş olmayan string olarak doğrulanır.
 */
export class MovementItemDto {
  @ApiProperty({
    description: 'Transfer edilecek ürünün kimliği (cuid).',
    example: 'cm5x1b2c30002v8m9a1b2c3d4',
  })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Transfer edilecek adet. En az 1 olmalıdır.',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}

/**
 * Yeni transfer talebi (stok hareketi) oluşturma isteği.
 *
 * `POST /movements` (tüm roller) için gövde. Talep `PENDING` durumunda
 * oluşturulur ve onay/sevk/teslim durum makinesinden geçer
 * (bkz. implementation_plan.md §9.6).
 *
 * `tenantId` istemciden alınmaz; Prisma Client Extension tarafından JWT'deki
 * tenant bağlamından atanır (bkz. §6.1). Talebi oluşturan `requestedById` de
 * gövdeden değil, `@CurrentUser()` üzerinden JWT'den gelir.
 */
export class CreateMovementDto {
  @ApiProperty({
    description: 'Stokun çıkacağı kaynak şubenin kimliği (cuid).',
    example: 'cm5x1b2c30001v8m9d4e5f6a7',
  })
  @IsString()
  @IsNotEmpty()
  sourceBranchId!: string;

  @ApiProperty({
    description: 'Stokun gireceği hedef şubenin kimliği (cuid). Kaynak şubeden farklı olmalıdır.',
    example: 'cm5x1b2c30003v8m9e7f8a9b0',
  })
  @IsString()
  @IsNotEmpty()
  destinationBranchId!: string;

  @ApiProperty({
    description: 'Transfer talebine ilişkin serbest metin not.',
    example: 'Hafta sonu kampanyası için acil sevkiyat.',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Transfer edilecek ürün kalemleri. En az bir kalem zorunludur.',
    type: [MovementItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MovementItemDto)
  items!: MovementItemDto[];
}
