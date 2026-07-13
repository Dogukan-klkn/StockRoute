import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CreateMovementDto } from '../../application/dto/movements/create-movement.dto';
import { GetMovementsFilterDto } from '../../application/dto/movements/get-movements-filter.dto';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';
import { MovementsService } from '../../modules/movements/movements.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

/**
 * Şubeler arası transfer (StockMovement) endpoint'leri (§9.6).
 *
 * Controller iş kuralı barındırmaz; isteği doğrular (DTO + global
 * ValidationPipe), `MovementsService`'e devreder ve dokümante eder
 * (Scalar/OpenAPI). Durum makinesi ve stok hareketleri servistedir.
 *
 * Güvenlik: Tüm controller `JwtAuthGuard` (kimlik) + `RolesGuard` (yetki) ile
 * korunur; sıra önemlidir (önce kimlik, sonra yetki — bkz. RolesGuard notu).
 * Aktif tenant bağlamı JWT'den gelir; sorgular Prisma extension ile otomatik
 * o tenant'a kısıtlanır (bkz. §6.1). Yetki matrisi §8: `SUPER_ADMIN`
 * (platform yöneticisi) her endpoint'e dahildir; onay/red yönetici rollerine,
 * sevk depo yetkisine sahip rollere açıktır. `cancel`'daki "talep eden veya
 * FIRM_ADMIN" kuralı rol matrisiyle ifade edilemediğinden serviste denetlenir.
 */
@ApiTags('movements')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
    UserRole.FIELD_STAFF,
  )
  @ApiOperation({
    summary: 'Transfer talebi oluştur',
    description:
      'Kaynak şubeden hedef şubeye ürün transfer talebi açar; talep `PENDING` ' +
      'durumunda oluşur ve yetkili onayı bekler. Kaynak ve hedef şube aynı olamaz. ' +
      'Tüm roller erişebilir.',
  })
  @ApiResponse({ status: 201, description: 'Talep oluşturuldu; kalemleriyle birlikte döner.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası veya kaynak ve hedef şube aynı.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMovementDto) {
    return this.movementsService.create(dto, user.userId);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
    UserRole.FIELD_STAFF,
  )
  @ApiOperation({
    summary: 'Transfer hareketlerini listele',
    description:
      'Aktif firmanın transfer hareketlerini kalem ve şube bilgisiyle, en yeni ' +
      'önce listeler. `status` tek duruma daraltır; `branchId` şubenin kaynak ' +
      'veya hedef olduğu hareketleri getirir. Tüm roller erişebilir.',
  })
  @ApiResponse({ status: 200, description: 'Hareket listesi.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz query parametresi).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  findAll(@Query() filter: GetMovementsFilterDto) {
    return this.movementsService.findAll(filter);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
    UserRole.FIELD_STAFF,
  )
  @ApiOperation({
    summary: 'Transfer hareketi detayı',
    description:
      'Tek hareketi ürünlü kalemleri, kaynak/hedef şubeleri ve işlemi yapan ' +
      'kullanıcılarla (talep eden, onaylayan, sevk eden, teslim alan) döner. ' +
      'Tüm roller erişebilir.',
  })
  @ApiResponse({ status: 200, description: 'Hareket detayı.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Stok hareketi bulunamadı.' })
  findOne(@Param('id') id: string) {
    return this.movementsService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer talebini onayla',
    description:
      '`PENDING` durumundaki talebi `APPROVED` yapar; onaylayan ve onay zamanı ' +
      'kaydedilir. SUPER_ADMIN, FIRM_ADMIN veya BRANCH_MANAGER.',
  })
  @ApiResponse({ status: 200, description: 'Talep onaylandı; güncel hareket döner.' })
  @ApiResponse({ status: 400, description: 'Bu durumdaki hareket onaylanamaz.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Stok hareketi bulunamadı.' })
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.movementsService.approve(id, user.userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer talebini reddet',
    description:
      '`PENDING` durumundaki talebi `REJECTED` yapar; stok değişmez. ' +
      'SUPER_ADMIN, FIRM_ADMIN veya BRANCH_MANAGER.',
  })
  @ApiResponse({ status: 200, description: 'Talep reddedildi; güncel hareket döner.' })
  @ApiResponse({ status: 400, description: 'Bu durumdaki hareket reddedilemez.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Stok hareketi bulunamadı.' })
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.movementsService.reject(id, user.userId);
  }

  @Post(':id/ship')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transferi sevk et',
    description:
      '`APPROVED` durumundaki hareketi `IN_TRANSIT` yapar ve kaynak şubeden ' +
      'stok düşer (kalem başına `TRANSFER_OUT` audit kaydıyla, tek transaction). ' +
      'Herhangi bir kalemde stok yetersizse işlem tamamen geri alınır. ' +
      'SUPER_ADMIN, FIRM_ADMIN, BRANCH_MANAGER veya WAREHOUSE_STAFF.',
  })
  @ApiResponse({ status: 200, description: 'Sevk edildi; güncel hareket döner.' })
  @ApiResponse({
    status: 400,
    description: 'Bu durumdaki hareket sevk edilemez veya kaynak şubede stok yetersiz/yok.',
  })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Stok hareketi bulunamadı.' })
  ship(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.movementsService.ship(id, user.userId);
  }

  @Post(':id/receive')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
    UserRole.FIELD_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transferi teslim al',
    description:
      '`IN_TRANSIT` durumundaki hareketi `RECEIVED` yapar ve hedef şubeye stok ' +
      'eklenir (kalem başına `TRANSFER_IN` audit kaydıyla, tek transaction). ' +
      'Hedefte envanter kaydı yoksa oluşturulur. Tüm roller erişebilir.',
  })
  @ApiResponse({ status: 200, description: 'Teslim alındı; güncel hareket döner.' })
  @ApiResponse({ status: 400, description: 'Bu durumdaki hareket teslim alınamaz.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Stok hareketi bulunamadı.' })
  receive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.movementsService.receive(id, user.userId);
  }

  @Post(':id/cancel')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
    UserRole.FIELD_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer talebini iptal et',
    description:
      '`PENDING` veya `APPROVED` durumundaki hareketi `CANCELLED` yapar; stok ' +
      'değişmez. Rol matrisi tüm rollere açıktır; asıl kural serviste denetlenir: ' +
      'yalnızca talebi oluşturan kullanıcı veya FIRM_ADMIN iptal edebilir.',
  })
  @ApiResponse({ status: 200, description: 'Talep iptal edildi; güncel hareket döner.' })
  @ApiResponse({ status: 400, description: 'Bu durumdaki hareket iptal edilemez.' })
  @ApiResponse({
    status: 403,
    description: 'Yalnızca talebi oluşturan kullanıcı veya firma yöneticisi iptal edebilir.',
  })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 404, description: 'Stok hareketi bulunamadı.' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.movementsService.cancel(id, user.userId, user.role);
  }
}
