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
import { CreateUserDto } from '../../application/dto/users/create-user.dto';
import { UpdateUserDto } from '../../application/dto/users/update-user.dto';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../api/decorators/current-user.decorator';
import { Roles } from '../../api/decorators/roles.decorator';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { RolesGuard } from '../../api/guards/roles.guard';
import { UsersService } from './users.service';

/**
 * Kullanıcı (User) endpoint'leri (§9.3).
 *
 * Controller iş kuralı barındırmaz; isteği doğrular (DTO + global ValidationPipe),
 * `UsersService`'e devreder ve dokümante eder (Scalar/OpenAPI).
 *
 * Güvenlik: Tüm controller `JwtAuthGuard` (kimlik) + `RolesGuard` (yetki) ile
 * korunur; sıra önemlidir (önce kimlik, sonra yetki — bkz. RolesGuard notu).
 * Aktif tenant bağlamı JWT'den gelir; kullanıcı sorguları Prisma extension ile
 * otomatik o tenant'a kısıtlanır (bkz. §6.1). Yetki matrisi §8: kullanıcı
 * yönetiminin tamamı (GET/POST/PATCH/DELETE) yalnızca FIRM_ADMIN'e açıktır.
 */
@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.FIRM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Kullanıcı oluştur',
    description: 'Aktif firmaya yeni bir kullanıcı ekler. Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 201, description: 'Kullanıcı oluşturuldu (şifre hariç).' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 409, description: 'Bu e-posta firmada zaten kullanımda.' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(UserRole.FIRM_ADMIN)
  @ApiOperation({
    summary: 'Kullanıcıları listele',
    description: 'Aktif firmaya ait tüm kullanıcıları döner (şifre hariç). Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Kullanıcı listesi.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.FIRM_ADMIN)
  @ApiOperation({
    summary: 'Kullanıcı detayı',
    description: 'Id ile tek bir kullanıcıyı döner (şifre hariç). Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Kullanıcı detayı.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.FIRM_ADMIN)
  @ApiOperation({
    summary: 'Kullanıcı güncelle',
    description:
      'Bir kullanıcıyı kısmen günceller. Şifre alanı boş bırakılırsa değişmez. Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Kullanıcı güncellendi (şifre hariç).' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  @ApiResponse({ status: 409, description: 'Bu e-posta firmada zaten kullanımda.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.FIRM_ADMIN)
  @ApiOperation({
    summary: 'Kullanıcı sil',
    description: 'Bir kullanıcıyı siler. FIRM_ADMIN kendi hesabını silemez. Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Kullanıcı silindi.' })
  @ApiResponse({ status: 400, description: 'Kendi hesabınızı silemezsiniz.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(id, user.userId);
  }
}
