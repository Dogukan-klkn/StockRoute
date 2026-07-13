import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CreateBranchDto } from '../../application/dto/branches/create-branch.dto';
import { UpdateBranchDto } from '../../application/dto/branches/update-branch.dto';
import { Roles } from '../../api/decorators/roles.decorator';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { RolesGuard } from '../../api/guards/roles.guard';
import { BranchesService } from './branches.service';

/**
 * Şube (Branch) endpoint'leri (§9.2).
 *
 * Controller iş kuralı barındırmaz; isteği doğrular (DTO + global ValidationPipe),
 * `BranchesService`'e devreder ve dokümante eder (Scalar/OpenAPI).
 *
 * Güvenlik: Tüm controller `JwtAuthGuard` (kimlik) + `RolesGuard` (yetki) ile
 * korunur; sıra önemlidir (önce kimlik, sonra yetki — bkz. RolesGuard notu).
 * Aktif tenant bağlamı JWT'den gelir; şube sorguları Prisma extension ile
 * otomatik o tenant'a kısıtlanır (bkz. §6.1). Yetki matrisi §8:
 *  - Okuma (GET): FIRM_ADMIN, BRANCH_MANAGER
 *  - Yazma (POST/PATCH/DELETE): yalnızca FIRM_ADMIN
 */
@ApiTags('branches')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(UserRole.FIRM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Şube oluştur',
    description: 'Aktif firmaya yeni bir şube ekler. Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 201, description: 'Şube oluşturuldu.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 409, description: 'Bu şube kodu firmada zaten kullanımda.' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({
    summary: 'Şubeleri listele',
    description: 'Aktif firmaya ait tüm şubeleri döner. FIRM_ADMIN veya BRANCH_MANAGER.',
  })
  @ApiResponse({ status: 200, description: 'Şube listesi.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({
    summary: 'Şube detayı',
    description: 'Id ile tek bir şubeyi döner. FIRM_ADMIN veya BRANCH_MANAGER.',
  })
  @ApiResponse({ status: 200, description: 'Şube detayı.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Şube bulunamadı.' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.FIRM_ADMIN)
  @ApiOperation({
    summary: 'Şube güncelle',
    description: 'Bir şubeyi kısmen günceller. Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Şube güncellendi.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Şube bulunamadı.' })
  @ApiResponse({ status: 409, description: 'Bu şube kodu firmada zaten kullanımda.' })
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.FIRM_ADMIN)
  @ApiOperation({
    summary: 'Şube sil',
    description: 'Bir şubeyi siler. Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Şube silindi.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Şube bulunamadı.' })
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
