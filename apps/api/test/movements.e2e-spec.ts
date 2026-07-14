import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MovementStatus, TransactionType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

jest.setTimeout(30000);

/**
 * Şubeler arası transfer (StockMovement) iş akışı — uçtan uca (e2e) test (Gün 12).
 *
 * Gün 11'de yazılan `MovementsService`/`MovementsController` davranışlarını
 * gerçek HTTP + gerçek Postgres üzerinde kanıtlar:
 *  - Happy path: PENDING → APPROVED → IN_TRANSIT → RECEIVED ve stok korunumu.
 *  - RBAC: rol matrisi (§8) guard'larca zorlanır; `cancel`'ın "talep eden veya
 *    FIRM_ADMIN" kuralı serviste denetlenir.
 *  - İş kuralı ihlalleri: aynı şube, yetersiz stok (transaction rollback),
 *    eksik envanter kaydı, geçersiz durum geçişi, DTO doğrulama.
 *
 * NOT: Onay/sevk/teslim/iptal endpoint'leri `@HttpCode(HttpStatus.OK)` ile
 * 200 döner (controller tasarımı); yalnızca `POST /movements` 201 döner.
 *
 * NOT: `POST /users` endpoint'i mevcut olmadığından test kullanıcıları DB'ye
 * doğrudan yazılır (bcrypt hash) ve token `/auth/login` ile alınır.
 *
 * Gereksinim: erişilebilir bir Postgres (bkz. docker-compose.yml, port 5433) ve
 * uygulanmış migration'lar. `DATABASE_URL` .env üzerinden okunur.
 */
describe('Movements (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;

  // Benzersiz slug/e-posta/SKU üretimi — testi tekrar çalıştırılabilir kılar.
  const runId = process.hrtime.bigint().toString(36);

  const tenant = {
    firmName: 'Movements Test AŞ',
    slug: `movements-${runId}`,
    adminEmail: `admin-${runId}@demo.test`,
    adminPassword: 'Parola-123',
    adminFullName: 'Movements Admin',
  };

  const USER_PASSWORD = 'Parola-123';
  const INITIAL_STOCK = 100;

  let tenantId: string;
  let adminToken: string;
  let managerToken: string;
  let warehouseToken: string;
  let fieldToken: string;
  let field2Token: string;

  let srcBranchId: string;
  let dstBranchId: string;
  let p1Id: string;
  let p2Id: string;
  /** Hiçbir şubede envanter kaydı olmayan ürün (eksik kayıt senaryosu). */
  let p3Id: string;

  /** Kullanıcıyı DB'ye doğrudan yazar ve /auth/login ile token döner. */
  const createUserAndLogin = async (role: UserRole, emailPrefix: string): Promise<string> => {
    const email = `${emailPrefix}-${runId}@demo.test`;
    await prisma.client.user.create({
      data: {
        tenantId,
        email,
        passwordHash: await bcrypt.hash(USER_PASSWORD, 10),
        fullName: `${emailPrefix} kullanıcı`,
        role,
        branchId: srcBranchId,
      },
    });

    const res = await request(server)
      .post('/auth/login')
      .send({ email, password: USER_PASSWORD, tenantSlug: tenant.slug })
      .expect(200);

    return res.body.accessToken as string;
  };

  /** Verilen token ile PENDING transfer talebi oluşturur, id'sini döner. */
  const createMovement = async (
    token: string,
    items: { productId: string; quantity: number }[] = [{ productId: p1Id, quantity: 5 }],
  ): Promise<string> => {
    const res = await request(server)
      .post('/movements')
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceBranchId: srcBranchId, destinationBranchId: dstBranchId, items })
      .expect(201);

    return res.body.id as string;
  };

  /** Şube+ürün envanterini DB'den okur; kayıt yoksa null döner. */
  const getInventory = (branchId: string, productId: string) =>
    prisma.client.inventory.findUnique({
      where: { branchId_productId: { branchId, productId } },
    });

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

    // 1) Tenant + FIRM_ADMIN.
    const reg = await request(server).post('/auth/register-tenant').send(tenant).expect(201);
    adminToken = reg.body.accessToken;
    tenantId = reg.body.user.tenantId;

    // 2) Kaynak ve hedef şubeler.
    const src = await request(server)
      .post('/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Kaynak Şube', code: `SRC-${runId}` })
      .expect(201);
    srcBranchId = src.body.id;

    const dst = await request(server)
      .post('/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Hedef Şube', code: `DST-${runId}` })
      .expect(201);
    dstBranchId = dst.body.id;

    // 3) Ürünler (P3'e bilerek stok girilmez).
    const p1 = await request(server)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ürün 1', sku: `P1-${runId}` })
      .expect(201);
    p1Id = p1.body.id;

    const p2 = await request(server)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ürün 2', sku: `P2-${runId}` })
      .expect(201);
    p2Id = p2.body.id;

    const p3 = await request(server)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ürün 3 (stoksuz)', sku: `P3-${runId}` })
      .expect(201);
    p3Id = p3.body.id;

    // 4) Roller: BRANCH_MANAGER, WAREHOUSE_STAFF, 2× FIELD_STAFF (çapraz iptal için).
    managerToken = await createUserAndLogin(UserRole.BRANCH_MANAGER, 'manager');
    warehouseToken = await createUserAndLogin(UserRole.WAREHOUSE_STAFF, 'warehouse');
    fieldToken = await createUserAndLogin(UserRole.FIELD_STAFF, 'field');
    field2Token = await createUserAndLogin(UserRole.FIELD_STAFF, 'field2');

    // 5) Başlangıç stoğu: kaynak şubede P1 ve P2 için 100'er birim.
    for (const productId of [p1Id, p2Id]) {
      await request(server)
        .post('/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ branchId: srcBranchId, productId, quantity: INITIAL_STOCK })
        .expect(200);
    }
  });

  afterAll(async () => {
    // Yalnızca bu testin tenant'ına bağlı verileri hedefli sil (FK sırasına dikkat).
    if (tenantId) {
      await prisma.client.inventoryLog.deleteMany({ where: { tenantId } });
      await prisma.client.stockMovementItem.deleteMany({
        where: { movement: { tenantId } },
      });
      await prisma.client.stockMovement.deleteMany({ where: { tenantId } });
      await prisma.client.inventory.deleteMany({ where: { tenantId } });
      await prisma.client.product.deleteMany({ where: { tenantId } });
      await prisma.client.branch.deleteMany({ where: { tenantId } });
      await prisma.client.user.deleteMany({ where: { tenantId } });
      await prisma.client.tenant.deleteMany({ where: { id: tenantId } });
    }
    await app.close();
  });

  describe('Transfer happy path (uçtan uca)', () => {
    // Adımlar aynı hareket üzerinde sıralı ilerler.
    let movementId: string;
    const qtyP1 = 10;
    const qtyP2 = 5;

    it('FIELD_STAFF iki ürünlü transfer talebi oluşturur (201, PENDING)', async () => {
      const res = await request(server)
        .post('/movements')
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({
          sourceBranchId: srcBranchId,
          destinationBranchId: dstBranchId,
          note: 'Happy path transferi',
          items: [
            { productId: p1Id, quantity: qtyP1 },
            { productId: p2Id, quantity: qtyP2 },
          ],
        })
        .expect(201);

      expect(res.body.status).toEqual(MovementStatus.PENDING);
      expect(res.body.items).toHaveLength(2);
      movementId = res.body.id;
    });

    it('BRANCH_MANAGER talebi onaylar (200, APPROVED)', async () => {
      const res = await request(server)
        .post(`/movements/${movementId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.status).toEqual(MovementStatus.APPROVED);
      expect(res.body.approvedById).toBeTruthy();
      expect(res.body.approvedAt).toBeTruthy();
    });

    it('WAREHOUSE_STAFF sevk eder (200, IN_TRANSIT); kaynak stok düşer, TRANSFER_OUT loglanır', async () => {
      const res = await request(server)
        .post(`/movements/${movementId}/ship`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);

      expect(res.body.status).toEqual(MovementStatus.IN_TRANSIT);
      expect(res.body.shippedById).toBeTruthy();
      expect(res.body.shippedAt).toBeTruthy();

      // Kaynak stoklar DB'den doğrulanır.
      const srcP1 = await getInventory(srcBranchId, p1Id);
      const srcP2 = await getInventory(srcBranchId, p2Id);
      expect(srcP1?.quantity).toEqual(INITIAL_STOCK - qtyP1);
      expect(srcP2?.quantity).toEqual(INITIAL_STOCK - qtyP2);

      // Audit: her kalem için TRANSFER_OUT logu yazılmış olmalı.
      const outLogs = await prisma.client.inventoryLog.findMany({
        where: { tenantId, type: TransactionType.TRANSFER_OUT },
      });
      expect(outLogs).toHaveLength(2);
      expect(outLogs.map((l) => l.productId).sort()).toEqual([p1Id, p2Id].sort());
    });

    it('FIELD_STAFF teslim alır (200, RECEIVED); hedef stok artar, TRANSFER_IN loglanır', async () => {
      const res = await request(server)
        .post(`/movements/${movementId}/receive`)
        .set('Authorization', `Bearer ${fieldToken}`)
        .expect(200);

      expect(res.body.status).toEqual(MovementStatus.RECEIVED);
      expect(res.body.receivedById).toBeTruthy();
      expect(res.body.receivedAt).toBeTruthy();

      // Hedefte envanter kaydı yoktu; upsert ile oluşup miktar almış olmalı.
      const dstP1 = await getInventory(dstBranchId, p1Id);
      const dstP2 = await getInventory(dstBranchId, p2Id);
      expect(dstP1?.quantity).toEqual(qtyP1);
      expect(dstP2?.quantity).toEqual(qtyP2);

      const inLogs = await prisma.client.inventoryLog.findMany({
        where: { tenantId, type: TransactionType.TRANSFER_IN },
      });
      expect(inLogs).toHaveLength(2);
    });

    it('toplam stok korunur: kaynak + hedef = başlangıç', async () => {
      for (const productId of [p1Id, p2Id]) {
        const src = await getInventory(srcBranchId, productId);
        const dst = await getInventory(dstBranchId, productId);
        expect((src?.quantity ?? 0) + (dst?.quantity ?? 0)).toEqual(INITIAL_STOCK);
      }
    });
  });

  describe('RBAC zorlaması (Plan §8 & §9.6)', () => {
    // Guard, hareketin durumuna bakmadan rolü reddeder; bu yüzden 403
    // senaryolarında var olan herhangi bir hareket id'si yeterlidir.
    let pendingId: string;

    beforeAll(async () => {
      pendingId = await createMovement(fieldToken);
    });

    it('FIELD_STAFF approve edemez (403)', async () => {
      await request(server)
        .post(`/movements/${pendingId}/approve`)
        .set('Authorization', `Bearer ${fieldToken}`)
        .expect(403);
    });

    it('WAREHOUSE_STAFF approve edemez (403)', async () => {
      await request(server)
        .post(`/movements/${pendingId}/approve`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);
    });

    it('FIELD_STAFF ship edemez (403)', async () => {
      await request(server)
        .post(`/movements/${pendingId}/ship`)
        .set('Authorization', `Bearer ${fieldToken}`)
        .expect(403);
    });

    it('WAREHOUSE_STAFF reject edemez (403)', async () => {
      await request(server)
        .post(`/movements/${pendingId}/reject`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);
    });

    it("başka FIELD_STAFF, talep edenin hareketini iptal edemez (403)", async () => {
      await request(server)
        .post(`/movements/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${field2Token}`)
        .expect(403);
    });

    it('talep eden kendi hareketini iptal eder (200, CANCELLED)', async () => {
      const res = await request(server)
        .post(`/movements/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${fieldToken}`)
        .expect(200);

      expect(res.body.status).toEqual(MovementStatus.CANCELLED);
    });

    it("FIRM_ADMIN başkasının hareketini iptal eder (200, CANCELLED)", async () => {
      const otherId = await createMovement(fieldToken);

      const res = await request(server)
        .post(`/movements/${otherId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toEqual(MovementStatus.CANCELLED);
    });

    it('Authorization başlığı olmadan istek 401 döner', async () => {
      await request(server).get('/movements').expect(401);
      await request(server).post(`/movements/${pendingId}/approve`).expect(401);
    });
  });

  describe('İş kuralı ihlalleri', () => {
    it('kaynak ve hedef şube aynıysa 400 döner', async () => {
      await request(server)
        .post('/movements')
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({
          sourceBranchId: srcBranchId,
          destinationBranchId: srcBranchId,
          items: [{ productId: p1Id, quantity: 1 }],
        })
        .expect(400);
    });

    it('yetersiz stokla ship 400 döner ve kaynak stok değişmez (transaction rollback)', async () => {
      // İlk kalem geçerli, ikinci kalem stoğu aşar → tüm işlem geri alınmalı.
      const movementId = await createMovement(fieldToken, [
        { productId: p1Id, quantity: 1 },
        { productId: p2Id, quantity: 999_999 },
      ]);
      await request(server)
        .post(`/movements/${movementId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const p1Before = await getInventory(srcBranchId, p1Id);
      const p2Before = await getInventory(srcBranchId, p2Id);

      await request(server)
        .post(`/movements/${movementId}/ship`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(400);

      // Rollback kanıtı: geçerli kalemin düşümü dahil hiçbir değişiklik kalmamalı.
      const p1After = await getInventory(srcBranchId, p1Id);
      const p2After = await getInventory(srcBranchId, p2Id);
      expect(p1After?.quantity).toEqual(p1Before?.quantity);
      expect(p2After?.quantity).toEqual(p2Before?.quantity);

      // Durum da IN_TRANSIT'e geçmemiş olmalı.
      const movement = await prisma.client.stockMovement.findUnique({
        where: { id: movementId },
      });
      expect(movement?.status).toEqual(MovementStatus.APPROVED);
    });

    it('kaynakta envanter kaydı olmayan ürünle ship 400 döner', async () => {
      const movementId = await createMovement(fieldToken, [{ productId: p3Id, quantity: 1 }]);
      await request(server)
        .post(`/movements/${movementId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request(server)
        .post(`/movements/${movementId}/ship`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(400);
    });

    it('PENDING hareketi ship etmeye çalışmak 400 döner', async () => {
      const movementId = await createMovement(fieldToken);

      await request(server)
        .post(`/movements/${movementId}/ship`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(400);
    });

    it('boş items dizisi 400 döner (ArrayMinSize)', async () => {
      await request(server)
        .post('/movements')
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({ sourceBranchId: srcBranchId, destinationBranchId: dstBranchId, items: [] })
        .expect(400);
    });

    it('quantity: 0 olan kalem 400 döner (Min(1))', async () => {
      await request(server)
        .post('/movements')
        .set('Authorization', `Bearer ${fieldToken}`)
        .send({
          sourceBranchId: srcBranchId,
          destinationBranchId: dstBranchId,
          items: [{ productId: p1Id, quantity: 0 }],
        })
        .expect(400);
    });
  });
});
