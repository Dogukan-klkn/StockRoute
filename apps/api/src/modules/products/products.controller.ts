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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CreateProductDto } from '../../application/dto/products/create-product.dto';
import { UpdateProductDto } from '../../application/dto/products/update-product.dto';
import { Roles } from '../../api/decorators/roles.decorator';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { RolesGuard } from '../../api/guards/roles.guard';
import { ProductsService } from './products.service';

/**
 * Ürün (Product) endpoint'leri (§9.2).
 *
 * Controller iş kuralı barındırmaz; isteği doğrular (DTO + global ValidationPipe),
 * `ProductsService`'e devreder ve dokümante eder (Scalar/OpenAPI).
 *
 * Güvenlik: Tüm controller `JwtAuthGuard` (kimlik) + `RolesGuard` (yetki) ile
 * korunur; sıra önemlidir (önce kimlik, sonra yetki — bkz. RolesGuard notu).
 * Aktif tenant bağlamı JWT'den gelir; ürün sorguları Prisma extension ile
 * otomatik o tenant'a kısıtlanır (bkz. §6.1). Yetki matrisi §8:
 *  - Okuma (GET liste/detay): FIRM_ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF
 *  - Barkod ile arama (mobil tarama): tüm roller (FIELD_STAFF dahil)
 *  - POST/PATCH: FIRM_ADMIN, BRANCH_MANAGER
 *  - DELETE: yalnızca FIRM_ADMIN
 */
@ApiTags('products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ürün oluştur',
    description: 'Aktif firmanın kataloğuna yeni bir ürün ekler. FIRM_ADMIN veya BRANCH_MANAGER.',
  })
  @ApiResponse({ status: 201, description: 'Ürün oluşturuldu.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 409, description: 'Bu SKU firmada zaten kullanımda.' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER, UserRole.WAREHOUSE_STAFF)
  @ApiOperation({
    summary: 'Ürünleri listele / ara',
    description:
      'Aktif firmaya ait ürünleri döner. `search` isim veya SKU içinde arar, ' +
      '`category` kategoriye göre daraltır. FIRM_ADMIN, BRANCH_MANAGER veya WAREHOUSE_STAFF.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'İsim veya SKU içinde büyük/küçük harf duyarsız arama.',
    example: 'ayçiçek',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Kategoriye göre tam eşleşme filtresi.',
    example: 'Gıda',
  })
  @ApiResponse({ status: 200, description: 'Ürün listesi.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  findAll(@Query('search') search?: string, @Query('category') category?: string) {
    return this.productsService.findAll({ search, category });
  }

  @Get('barcode/:barcode')
  @Roles(
    UserRole.FIRM_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.WAREHOUSE_STAFF,
    UserRole.FIELD_STAFF,
  )
  @ApiOperation({
    summary: 'Barkod ile ürün bul',
    description: 'Barkodu verilen ürünü döner (mobil tarama akışı). Tüm roller erişebilir.',
  })
  @ApiResponse({ status: 200, description: 'Ürün detayı.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Bu barkoda sahip bir ürün bulunamadı.' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER, UserRole.WAREHOUSE_STAFF)
  @ApiOperation({
    summary: 'Ürün detayı',
    description: 'Id ile tek bir ürünü döner. FIRM_ADMIN, BRANCH_MANAGER veya WAREHOUSE_STAFF.',
  })
  @ApiResponse({ status: 200, description: 'Ürün detayı.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Ürün bulunamadı.' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({
    summary: 'Ürün güncelle',
    description: 'Bir ürünü kısmen günceller. FIRM_ADMIN veya BRANCH_MANAGER.',
  })
  @ApiResponse({ status: 200, description: 'Ürün güncellendi.' })
  @ApiResponse({ status: 400, description: 'Doğrulama hatası (geçersiz gövde).' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Ürün bulunamadı.' })
  @ApiResponse({ status: 409, description: 'Bu SKU firmada zaten kullanımda.' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.FIRM_ADMIN)
  @ApiOperation({
    summary: 'Ürün sil',
    description: 'Bir ürünü siler. Yalnızca FIRM_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Ürün silindi.' })
  @ApiResponse({ status: 401, description: 'Token yok, geçersiz veya kullanıcı pasif.' })
  @ApiResponse({ status: 403, description: 'Bu işlem için gerekli yetkiye sahip değilsiniz.' })
  @ApiResponse({ status: 404, description: 'Ürün bulunamadı.' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
