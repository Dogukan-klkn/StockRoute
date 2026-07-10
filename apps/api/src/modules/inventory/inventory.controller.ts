import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdjustInventoryDto } from '../../application/dto/inventory/adjust-inventory.dto';
import { GetInventoryFilterDto } from '../../application/dto/inventory/get-inventory-filter.dto';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../api/decorators/current-user.decorator';
import { Roles } from '../../api/decorators/roles.decorator';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { RolesGuard } from '../../api/guards/roles.guard';
import { InventoryService } from './inventory.service';

/**
 * Envanter (Inventory) endpoint'leri (§9.5).
 *
 * Controller iş kuralı barındırmaz; isteği doğrular (DTO + global ValidationPipe),
 * `InventoryService`'e devreder ve dokümante eder (Scalar/OpenAPI).
 *
 * Güvenlik: Tüm controller `JwtAuthGuard` (kimlik) + `RolesGuard` (yetki) ile
 * korunur; sıra önemlidir (önce kimlik, sonra yetki — bkz. RolesGuard notu).
 * Aktif tenant bağlamı JWT'den gelir; envanter sorguları Prisma extension ile
 * otomatik o tenant'a kısıtlanır (bkz. §6.1). Yetki matrisi §8:
 *  - GET /inventory: tüm roller (FIELD_STAFF dahil). Not: branch bazlı veri
 *    kısıtlaması (kendi şubesiyle sınırlama) ileride ele alınacak.
 *  - POST /inventory/adjust: FIRM_ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF.
 */
@ApiTags('inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
    UserRole.FIELD_STAFF,
  )
  @ApiOperation({
    summary: 'Envanteri listele',
    description:
      'Aktif firmanın envanter kayıtlarını ilişkili ürün ve şube bilgisiyle döner. ' +
      '`branchId` tek şubeye daraltır; `lowStock=true` yalnızca düşük stok ' +
      '(`quantity <= minThreshold`) kayıtlarını getirir. Tüm roller erişebilir.',
  })
  @ApiResponse({ status: 200, description: 'Envanter listesi.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz query parametresi).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  findAll(@Query() filters: GetInventoryFilterDto) {
    return this.inventoryService.findAll({
      branchId: filters.branchId,
      lowStock: filters.lowStock,
    });
  }

  @Post('adjust')
  @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER, UserRole.WAREHOUSE_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manuel stok düzeltmesi yap',
    description:
      'İlgili şube+ürün stokunu verilen miktar kadar artırır/azaltır ve audit trail ' +
      'için bir `InventoryLog` kaydı (`type: MANUAL_ADJUSTMENT`) yazar. Envanter ' +
      'kaydı yoksa 0 stokla oluşturulur. FIRM_ADMIN, BRANCH_MANAGER veya WAREHOUSE_STAFF.',
  })
  @ApiResponse({ status: 200, description: 'Stok düzeltildi; güncel envanter kaydı döner.' })
  @ApiResponse({
    status: 400,
    description: 'Doğrulama hatası veya yetersiz stok (stok negatife düşürülemez).',
  })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Şube veya ürün bulunamadı.' })
  adjust(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdjustInventoryDto) {
    return this.inventoryService.adjustInventory(user.userId, dto);
  }
}
