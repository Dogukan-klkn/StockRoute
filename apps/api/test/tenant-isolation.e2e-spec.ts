import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

/**
 * Çapraz Tenant İzolasyonu — uçtan uca (e2e) test (Gün 7).
 *
 * İki izole firma (Tenant A / Tenant B) kaydeder ve JWT'nin taşıdığı `tenantId`
 * bağlamının, Prisma extension + `/auth/me` üzerinden gerçekten izolasyon
 * sağladığını doğrular:
 *  - A'nın token'ı yalnızca A'nın kimliğini döndürür; asla B'nin verisini değil.
 *  - A'nın token'ı B'nin slug'ı ile üretilmiş bağlamı taklit edemez.
 *  - Kimlik bilgileri tenant sınırını aşmaz (aynı e-posta+şifre, yanlış slug → 401).
 *
 * Gereksinim: erişilebilir bir Postgres (bkz. docker-compose.yml, port 5433) ve
 * uygulanmış migration'lar. `DATABASE_URL` .env üzerinden okunur.
 */
describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;

  // Testi tekrar çalıştırılabilir kılmak için benzersiz slug/e-posta üretiriz;
  // Date/Math.random yerine yüksek çözünürlüklü sayaç kullanmak yeterlidir.
  const runId = process.hrtime.bigint().toString(36);

  const tenantA = {
    firmName: 'Tenant A Lojistik',
    slug: `tenant-a-${runId}`,
    adminEmail: `admin-a-${runId}@demo.test`,
    adminPassword: 'ParolaA-123',
    adminFullName: 'Admin A',
  };

  const tenantB = {
    firmName: 'Tenant B Tedarik',
    slug: `tenant-b-${runId}`,
    adminEmail: `admin-b-${runId}@demo.test`,
    adminPassword: 'ParolaB-123',
    adminFullName: 'Admin B',
  };

  let tokenA: string;
  let tokenB: string;
  let tenantAId: string;
  let tenantBId: string;
  let adminAId: string;

  // Gün 12 ek seed'i: her tenant için şubeler, ürün ve PENDING hareket.
  interface TenantScope {
    srcBranchId: string;
    dstBranchId: string;
    productId: string;
    movementId: string;
  }
  let scopeA: TenantScope;
  let scopeB: TenantScope;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // main.ts ile aynı global ValidationPipe: e2e davranışı prod ile eş olur.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    // İki izole firmayı kaydet ve dönen token/id'leri sakla.
    const resA = await request(server)
      .post('/auth/register-tenant')
      .send(tenantA)
      .expect(201);
    tokenA = resA.body.accessToken;
    tenantAId = resA.body.user.tenantId;
    adminAId = resA.body.user.id;

    const resB = await request(server)
      .post('/auth/register-tenant')
      .send(tenantB)
      .expect(201);
    tokenB = resB.body.accessToken;
    tenantBId = resB.body.user.tenantId;

    // Gün 12 ek seed'i: her tenant için 2 şube + 1 ürün + 1 PENDING hareket.
    // FIRM_ADMIN token'larıyla API üzerinden oluşturulur; böylece extension'ın
    // create yolundaki tenantId ataması da dolaylı olarak test edilir.
    const seedTenantScope = async (token: string, tag: string): Promise<TenantScope> => {
      const src = await request(server)
        .post('/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Kaynak ${tag}`, code: `SRC-${tag}-${runId}` })
        .expect(201);

      const dst = await request(server)
        .post('/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Hedef ${tag}`, code: `DST-${tag}-${runId}` })
        .expect(201);

      const product = await request(server)
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Ürün ${tag}`, sku: `P-${tag}-${runId}` })
        .expect(201);

      const movement = await request(server)
        .post('/movements')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceBranchId: src.body.id,
          destinationBranchId: dst.body.id,
          items: [{ productId: product.body.id, quantity: 5 }],
        })
        .expect(201);

      return {
        srcBranchId: src.body.id,
        dstBranchId: dst.body.id,
        productId: product.body.id,
        movementId: movement.body.id,
      };
    };

    scopeA = await seedTenantScope(tokenA, 'A');
    scopeB = await seedTenantScope(tokenB, 'B');
  });

  afterAll(async () => {
    // Test verisini temizle (izolasyon için önce tenant'a bağlı kullanıcıları sil).
    // baseClient'e erişimimiz olmadığından, tenant extension bağlam yokken
    // filtre uygulamaz; bu yüzden id ile hedefli siliyoruz.
    const ids = [tenantAId, tenantBId].filter(Boolean);
    if (ids.length > 0) {
      // Gün 12 ek seed'inin temizliği (FK sırasına dikkat: önce bağımlı satırlar).
      await prisma.client.stockMovementItem.deleteMany({
        where: { movement: { tenantId: { in: ids } } },
      });
      await prisma.client.stockMovement.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.client.inventory.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.client.product.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.client.branch.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.client.user.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.client.tenant.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  it('iki firma da ayrı tenantId ile oluşturulur (sanity)', () => {
    expect(tenantAId).toBeTruthy();
    expect(tenantBId).toBeTruthy();
    expect(tenantAId).not.toEqual(tenantBId);
    expect(tokenA).toBeTruthy();
    expect(tokenB).toBeTruthy();
    expect(tokenA).not.toEqual(tokenB);
  });

  it('Token_A ile /auth/me yalnızca Tenant A kimliğini döner', async () => {
    const res = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    // Yalnızca A'nın verisi dönmeli.
    expect(res.body.tenantId).toEqual(tenantAId);
    expect(res.body.user.id).toEqual(adminAId);
    expect(res.body.user.tenantId).toEqual(tenantAId);
    expect(res.body.user.email).toEqual(tenantA.adminEmail);
    expect(res.body.user.role).toEqual('FIRM_ADMIN');

    // B'ye ait hiçbir iz sızmamalı.
    expect(res.body.tenantId).not.toEqual(tenantBId);
    expect(res.body.user.email).not.toEqual(tenantB.adminEmail);

    // passwordHash asla dışa sızmamalı (SafeUser sözleşmesi).
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('Token_B ile /auth/me yalnızca Tenant B kimliğini döner', async () => {
    const res = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(res.body.tenantId).toEqual(tenantBId);
    expect(res.body.user.email).toEqual(tenantB.adminEmail);
    expect(res.body.tenantId).not.toEqual(tenantAId);
  });

  it('token olmadan /auth/me 401 döner (korumalı uç)', async () => {
    await request(server).get('/auth/me').expect(401);
  });

  it("A'nın kimlik bilgileri B'nin slug'ı ile giriş yapamaz (çapraz tenant login)", async () => {
    await request(server)
      .post('/auth/login')
      .send({
        email: tenantA.adminEmail,
        password: tenantA.adminPassword,
        tenantSlug: tenantB.slug,
      })
      .expect(401);
  });

  it("A, kendi slug'ı ile giriş yapıp aynı izole kimliği alır", async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({
        email: tenantA.adminEmail,
        password: tenantA.adminPassword,
        tenantSlug: tenantA.slug,
      })
      .expect(200);

    expect(res.body.user.tenantId).toEqual(tenantAId);
    expect(res.body.user.email).toEqual(tenantA.adminEmail);

    // Bu token ile /auth/me yine yalnızca A'yı döndürmeli.
    const me = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(me.body.tenantId).toEqual(tenantAId);
    expect(me.body.tenantId).not.toEqual(tenantBId);
  });

  describe('Cross-tenant movements isolation (Gün 12)', () => {
    it("Token_A ile GET /movements yalnızca A'nın hareketlerini listeler", async () => {
      const res = await request(server)
        .get('/movements')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const ids = (res.body as { id: string }[]).map((m) => m.id);
      expect(ids).toContain(scopeA.movementId);
      expect(ids).not.toContain(scopeB.movementId);
    });

    it("Token_A ile B'nin hareket detayı alınamaz (404 — extension filtreler)", async () => {
      // Prisma extension findUnique'e tenantId enjekte ettiğinden kayıt
      // "bulunamaz" ve servis 404 döner (403 değil; kaynak varlığı sızdırılmaz).
      const res = await request(server)
        .get(`/movements/${scopeB.movementId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect([404, 403]).toContain(res.status);
      expect(res.status).toEqual(404);
    });

    it("Token_A ile B'nin hareketi approve edilemez (404)", async () => {
      const res = await request(server)
        .post(`/movements/${scopeB.movementId}/approve`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect([404, 403]).toContain(res.status);

      // B'nin hareketi B tarafında hâlâ PENDING kalmalı.
      const movement = await prisma.client.stockMovement.findUnique({
        where: { id: scopeB.movementId },
      });
      expect(movement?.status).toEqual('PENDING');
    });

    it("Token_A ile B'nin hareketi cancel edilemez (404)", async () => {
      const res = await request(server)
        .post(`/movements/${scopeB.movementId}/cancel`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect([404, 403]).toContain(res.status);

      const movement = await prisma.client.stockMovement.findUnique({
        where: { id: scopeB.movementId },
      });
      expect(movement?.status).toEqual('PENDING');
    });

    it("Token_A ile B'nin branchId'leri kullanılarak hareket oluşturulamaz", async () => {
      const res = await request(server)
        .post('/movements')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          sourceBranchId: scopeB.srcBranchId,
          destinationBranchId: scopeB.dstBranchId,
          items: [{ productId: scopeA.productId, quantity: 1 }],
        });

      expect([400, 404]).toContain(res.status);
    });

    it("Token_A ile B'nin productId'si kullanılarak hareket oluşturulamaz", async () => {
      const res = await request(server)
        .post('/movements')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          sourceBranchId: scopeA.srcBranchId,
          destinationBranchId: scopeA.dstBranchId,
          items: [{ productId: scopeB.productId, quantity: 1 }],
        });

      expect([400, 404]).toContain(res.status);
    });

    it("Token_A ile GET /branches yalnızca A'nın şubelerini döner", async () => {
      const res = await request(server)
        .get('/branches')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const ids = (res.body as { id: string }[]).map((b) => b.id);
      expect(ids).toEqual(expect.arrayContaining([scopeA.srcBranchId, scopeA.dstBranchId]));
      expect(ids).not.toContain(scopeB.srcBranchId);
      expect(ids).not.toContain(scopeB.dstBranchId);
    });

    it("Token_A ile GET /products yalnızca A'nın ürünlerini döner", async () => {
      const res = await request(server)
        .get('/products')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const ids = (res.body as { id: string }[]).map((p) => p.id);
      expect(ids).toContain(scopeA.productId);
      expect(ids).not.toContain(scopeB.productId);
    });
  });

  describe('Prisma extension yazma korumaları (Gün 12)', () => {
    it("A'nın oluşturduğu hareketin tenantId'si DB'de Tenant A'ya eşittir", async () => {
      // prisma.client burada istek bağlamı dışında çalıştığından extension
      // filtre uygulamaz → ham satırı okuyup extension'ın create yolunda
      // doğru tenantId'yi yazdığını kanıtlarız.
      const movement = await prisma.client.stockMovement.findUnique({
        where: { id: scopeA.movementId },
      });

      expect(movement).toBeTruthy();
      expect(movement?.tenantId).toEqual(tenantAId);
      expect(movement?.tenantId).not.toEqual(tenantBId);
    });
  });
});
