import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Product } from '@prisma/client';
import type { CreateProductDto } from '../../application/dto/products/create-product.dto';
import type { UpdateProductDto } from '../../application/dto/products/update-product.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * `findAll` için opsiyonel liste filtreleri.
 * `search` isim veya SKU içinde (büyük/küçük harf duyarsız) arar;
 * `category` tam eşleşme ile kategoriye kısıtlar.
 */
export interface FindAllProductsFilters {
  search?: string;
  category?: string;
}

/**
 * Ürün (Product) iş kuralları (Application katmanı).
 *
 * Ürün kataloğu için CRUD operasyonlarını ve barkod ile aramayı sağlar.
 * Controller iş kuralı içermez; kural ve veri erişimi bu katmandadır
 * (bkz. plan §15 — katman disiplini).
 *
 * NOT (tenant izolasyonu): Bu servisin çağrıldığı tüm endpoint'ler `JwtAuthGuard`
 * ile korunur; yani istek boyunca aktif bir `tenantId` bağlamı vardır. Prisma
 * Client Extension bu bağlamı okuyup sorgulara otomatik `where: { tenantId }`
 * ekler ve `create` sırasında `tenantId`'yi atar. Bu yüzden buradaki sorgulara
 * **manuel `tenantId` verilmez** — yalın yazılır (bkz. plan §6.1, tenant.extension.ts).
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni ürün oluşturur. `tenantId` extension tarafından atanır.
   * SKU tenant içinde benzersizdir; çakışırsa 409 döner
   * (bkz. §7 — `@@unique([tenantId, sku])`).
   */
  async create(dto: CreateProductDto): Promise<Product> {
    // `tenantId` extension tarafından çalışma zamanında atanır; derleyici bunu
    // bilmediği için zorunlu görür. Bu yüzden create verisini `tenantId` hariç
    // tipleyip öyle veriyoruz (bkz. tenant.extension.ts — injectTenantIntoData).
    const data: Omit<Prisma.ProductUncheckedCreateInput, 'tenantId'> = {
      name: dto.name,
      sku: dto.sku,
      barcode: dto.barcode,
      unit: dto.unit,
      category: dto.category,
      description: dto.description,
      isActive: dto.isActive,
    };

    try {
      return await this.prisma.client.product.create({
        data: data as Prisma.ProductUncheckedCreateInput,
      });
    } catch (error) {
      throw this.mapKnownErrors(error);
    }
  }

  /**
   * Aktif tenant'a ait ürünleri döner. Extension `tenantId` filtresini otomatik
   * eklediği için burada yalnızca kullanıcı filtreleri kurulur: `search` isim
   * veya SKU içinde duyarsız arama yapar, `category` tam eşleşme ile daraltır.
   */
  async findAll(filters: FindAllProductsFilters = {}): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    return this.prisma.client.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Tek bir ürünü id ile döner. Extension sorguyu tenant'a kısıtlar; başka bir
   * tenant'ın ürünü (ya da olmayan id) sonuç döndürmez → 404.
   */
  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.client.product.findFirst({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı.');
    }

    return product;
  }

  /**
   * Ürünü barkod ile döner (mobil tarama akışı). `@@index([tenantId, barcode])`
   * sayesinde sorgu indeks üzerinden çalışır; eşleşme yoksa 404 döner.
   */
  async findByBarcode(barcode: string): Promise<Product> {
    const product = await this.prisma.client.product.findFirst({
      where: { barcode },
    });

    if (!product) {
      throw new NotFoundException('Bu barkoda sahip bir ürün bulunamadı.');
    }

    return product;
  }

  /**
   * Ürünü kısmen günceller. Önce varlığı (ve tenant kapsamı) doğrulanır, sonra
   * güncellenir. SKU çakışması olursa 409 döner.
   */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    // Var olmayan / başka tenant'a ait id için P2025 yerine anlaşılır 404 verelim.
    await this.findOne(id);

    try {
      return await this.prisma.client.product.update({
        where: { id },
        data: {
          name: dto.name,
          sku: dto.sku,
          barcode: dto.barcode,
          unit: dto.unit,
          category: dto.category,
          description: dto.description,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      throw this.mapKnownErrors(error);
    }
  }

  /**
   * Ürünü siler. Önce varlığı (ve tenant kapsamı) doğrulanır.
   */
  async remove(id: string): Promise<Product> {
    await this.findOne(id);
    return this.prisma.client.product.delete({
      where: { id },
    });
  }

  /**
   * Bilinen Prisma hatalarını uygun HTTP istisnalarına çevirir.
   * - P2002: benzersizlik ihlali (tenant içi SKU) → 409
   * Diğer hatalar olduğu gibi yükseltilir (global exception filter ele alır).
   */
  private mapKnownErrors(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Bu SKU firmada zaten kullanımda.');
    }
    return error instanceof Error ? error : new Error('Bilinmeyen bir hata oluştu.');
  }
}
