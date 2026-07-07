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
  });

  afterAll(async () => {
    // Test verisini temizle (izolasyon için önce tenant'a bağlı kullanıcıları sil).
    // baseClient'e erişimimiz olmadığından, tenant extension bağlam yokken
    // filtre uygulamaz; bu yüzden id ile hedefli siliyoruz.
    const ids = [tenantAId, tenantBId].filter(Boolean);
    if (ids.length > 0) {
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
});
