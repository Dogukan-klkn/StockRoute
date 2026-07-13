import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Manuel stok düzeltme isteği (audit trail'li).
 *
 * `POST /inventory/adjust` (FIRM_ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF) için
 * gövde. Her çağrı ilgili `Inventory.quantity` değerini günceller **ve** bir
 * `InventoryLog` satırı yazar (`type: MANUAL_ADJUSTMENT`); böylece manuel
 * düzeltmeler izlenebilir kalır (bkz. implementation_plan.md §9.5).
 *
 * `tenantId` istemciden alınmaz; Prisma Client Extension tarafından JWT'deki
 * tenant bağlamından atanır (bkz. §6.1). İşlemi yapan `userId` de gövdeden
 * değil, `@CurrentUser()` üzerinden JWT'den gelir.
 *
 * Not: Kimlikler Prisma şemasında `cuid()` üretildiği için UUID formatı değil,
 * boş olmayan string olarak doğrulanır (bkz. §7 — `Inventory` modeli).
 */
export class AdjustInventoryDto {
  @ApiProperty({
    description: 'Stok düzeltmesi yapılacak şubenin kimliği (cuid).',
    example: 'cm5x1b2c30001v8m9d4e5f6a7',
  })
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @ApiProperty({
    description: 'Stok düzeltmesi yapılacak ürünün kimliği (cuid).',
    example: 'cm5x1b2c30002v8m9a1b2c3d4',
  })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description:
      'Stok değişim miktarı. Pozitif değer stok ekler, negatif değer düşer ' +
      '(ör. sayım farkı, fire).',
    example: -5,
  })
  @IsInt()
  quantity!: number;

  @ApiProperty({
    description: 'Düzeltme gerekçesi. `InventoryLog.reason` alanına yazılır (audit trail).',
    example: 'Sayım farkı: raf sayımında 5 adet eksik tespit edildi.',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
