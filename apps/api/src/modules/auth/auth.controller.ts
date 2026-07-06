import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from '../../application/dto/auth/login.dto';
import { RegisterTenantDto } from '../../application/dto/auth/register-tenant.dto';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../api/decorators/current-user.decorator';
import { CurrentTenant } from '../../api/decorators/current-tenant.decorator';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { AuthService, type SafeUser } from './auth.service';

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
      'güncel profil bilgisini (şifre hariç) döner.',
  })
  @ApiResponse({ status: 200, description: 'Kullanıcı profili (şifre hariç) + tenantId.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  async me(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ): Promise<{ user: SafeUser; tenantId: string }> {
    // @CurrentUser + @CurrentTenant ile token bağlamı temiz biçimde alınır;
    // yanıt { user, tenantId } standart zarfına oturtulur (Gün 6).
    const profile = await this.authService.getProfile(user.userId, tenantId);
    return { user: profile, tenantId };
  }
}
