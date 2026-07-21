import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Düşük stok eşiği güncelleme isteği.
 *
 * `PATCH /inventory/:id/threshold` (FIRM_ADMIN, BRANCH_MANAGER) için gövde.
 * Eşik bir **ayardır**, stok hareketi değildir: bu yüzden `Inventory.quantity`
 * değişmez ve `InventoryLog` yazılmaz (audit trail yalnızca stok hareketleri
 * içindir — bkz. implementation_plan.md §9.5, POST /inventory/adjust).
 *
 * `Inventory.minThreshold` eşiği aşağıdaki düşük stok kuralında kullanılır:
 * `quantity <= minThreshold` (bkz. §7 — Inventory modeli).
 */
export class UpdateThresholdDto {
  @ApiProperty({
    description:
      'Yeni düşük stok eşiği. `quantity <= minThreshold` olduğunda kayıt düşük ' +
      'stok sayılır. Negatif olamaz.',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  minThreshold!: number;
}
