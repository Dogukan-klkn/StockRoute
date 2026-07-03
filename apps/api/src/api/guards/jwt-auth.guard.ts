import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT ile korunan endpoint'ler için guard.
 *
 * Passport'un `jwt` stratejisini (bkz. `JwtStrategy`) tetikler: geçerli bir
 * Bearer token yoksa 401 döner, varsa doğrulanmış kullanıcıyı `request.user`'a
 * yerleştirir. Controller'da `@UseGuards(JwtAuthGuard)` ile kullanılır.
 *
 * Gün 6'da RBAC için `RolesGuard` bunun üzerine eklenecek (önce kimlik, sonra yetki).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
