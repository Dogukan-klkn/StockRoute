import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Envanter listeleme filtreleri.
 *
 * `GET /inventory?branchId=&lowStock=` (yetkili roller) için query parametreleri
 * (bkz. implementation_plan.md §9.5). Query değerleri HTTP üzerinden her zaman
 * string geldiğinden `lowStock`, global ValidationPipe (`transform: true`) ile
 * birlikte `@Transform` üzerinden boolean'a çevrilir.
 */
export class GetInventoryFilterDto {
  @ApiProperty({
    description:
      'Yalnızca bu şubenin envanterini getirir (cuid). Verilmezse tenant genelindeki tüm şubeler listelenir.',
    example: 'cm5x1b2c30001v8m9d4e5f6a7',
    required: false,
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({
    description:
      'true verilirse yalnızca düşük stoktaki kayıtları getirir (`quantity <= minThreshold`).',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value === 'boolean') return value;
    return value === 'true';
  })
  @IsBoolean()
  lowStock?: boolean;
}
