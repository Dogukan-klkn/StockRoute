import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LoginDto } from '../../application/dto/auth/login.dto';
import { RegisterTenantDto } from '../../application/dto/auth/register-tenant.dto';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../api/decorators/current-user.decorator';
import { CurrentTenant } from '../../api/decorators/current-tenant.decorator';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { AuthService, type UserProfile } from './auth.service';

/**
 * Kimlik doğrulama endpoint'leri (§9.1).
 *
 * Controller iş kuralı barındırmaz; yalnızca isteği doğrular (DTO + global
 * ValidationPipe), `AuthService`'e devreder ve dokümante eder (Scalar/OpenAPI).
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-tenant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Firma (tenant) kaydı',
    description:
      'Yeni bir izole firma (tenant) ve ona bağlı ilk FIRM_ADMIN kullanıcısını ' +
      'tek bir transaction içinde oluşturur. Public endpoint.',
  })
  @ApiResponse({
    status: 201,
    description: 'Firma ve admin oluşturuldu; accessToken + user döner.',
  })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 409, description: 'Firma kodu (slug) veya e-posta zaten kullanımda.' })
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Giriş yap',
    description:
      'E-posta, şifre ve firma kodu (tenantSlug) ile giriş yapar. Başarılıysa ' +
      'accessToken ve kullanıcı bilgisini (şifre hariç) döner. Public endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Giriş başarılı; accessToken + user döner.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 401, description: 'E-posta, şifre veya firma kodu hatalı.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Mevcut kullanıcı',
    description:
      "Authorization header'ındaki Bearer token ile doğrulanan kullanıcının " +
      'güncel profil bilgisini (şifre hariç) döner. Kullanıcıya bir şube ' +
      'atanmışsa `user.branch` özet şube bilgisini içerir; atanmamışsa (ör. ' +
      'FIRM_ADMIN) `null` olur. Şube listeleme yetkisi olmayan roller kendi ' +
      'şubelerini bu alandan öğrenir.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı profili (şifre hariç) + atanmış şube + tenantId.',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm5x1b2c30000v8m9c3d4e5f6' },
            tenantId: { type: 'string', example: 'cm5x1b2c30000v8m9a0b1c2d3' },
            email: { type: 'string', example: 'depo@demo.test' },
            fullName: { type: 'string', example: 'Depo Personeli' },
            role: {
              type: 'string',
              enum: Object.values(UserRole),
              example: UserRole.WAREHOUSE_STAFF,
            },
            branchId: { type: 'string', nullable: true, example: 'cm5x1b2c30001v8m9d4e5f6a7' },
            isActive: { type: 'boolean', example: true },
            branch: {
              type: 'object',
              nullable: true,
              description: 'Kullanıcıya atanmış şube; atanmamışsa null.',
              properties: {
                id: { type: 'string', example: 'cm5x1b2c30001v8m9d4e5f6a7' },
                name: { type: 'string', example: 'İstanbul Merkez Depo' },
                code: { type: 'string', example: 'IST-MERKEZ' },
                city: { type: 'string', nullable: true, example: 'İstanbul' },
              },
            },
          },
        },
        tenantId: { type: 'string', example: 'cm5x1b2c30000v8m9a0b1c2d3' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  async me(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ): Promise<{ user: UserProfile; tenantId: string }> {
    // @CurrentUser + @CurrentTenant ile token bağlamı temiz biçimde alınır;
    // yanıt { user, tenantId } standart zarfına oturtulur (Gün 6).
    const profile = await this.authService.getProfile(user.userId, tenantId);
    return { user: profile, tenantId };
  }
}
