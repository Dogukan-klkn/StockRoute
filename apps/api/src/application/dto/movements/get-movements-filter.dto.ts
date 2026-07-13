import { ApiPropertyOptional } from '@nestjs/swagger';
import { MovementStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * Stok hareketi (transfer) listeleme filtreleri.
 *
 * `GET /movements?status=&branchId=` (tüm roller) için query parametreleri
 * (bkz. implementation_plan.md §9.6). `branchId` verildiğinde şubenin hem
 * kaynak hem hedef olduğu hareketler döner (`OR` koşulu servis katmanında
 * kurulur).
 */
export class GetMovementsFilterDto {
  @ApiPropertyOptional({
    description: 'Yalnızca bu durumdaki hareketleri getirir.',
    enum: MovementStatus,
    example: MovementStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(MovementStatus)
  status?: MovementStatus;

  @ApiPropertyOptional({
    description: 'Yalnızca bu şubenin kaynak veya hedef olduğu hareketleri getirir (cuid).',
    example: 'cm5x1b2c30001v8m9d4e5f6a7',
  })
  @IsOptional()
  @IsString()
  branchId?: string;
}
