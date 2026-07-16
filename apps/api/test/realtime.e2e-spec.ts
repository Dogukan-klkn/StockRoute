import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SOCKET_EVENTS, type MovementCreatedPayload } from '@stockroute/shared-types';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

/**
 * Gerçek Zamanlı Yayın — uçtan uca (e2e) test (Gün 13).
 *
 * Gerçek NestJS uygulaması dinamik portta ayağa kaldırılır (`app.listen(0)`),
 * `socket.io-client` ile iki tenant'ın istemcisi bağlanır ve doğrulanır:
 *  - Geçerli token ile bağlantı kurulur ve AÇIK kalır.
 *  - Tenant A'da oluşturulan hareket, yalnızca A'nın istemcisine `movement:created`
 *    olarak düşer; Tenant B'nin istemcisi olayı ALMAZ (tenant izolasyonu — plan §2.2).
 *  - Token'sız / bozuk token'lı bağlantı sunucu tarafından koparılır.
 *
 * Gereksinim: erişilebilir bir Postgres (bkz. docker-compose.yml, port 5433) ve
 * uygulanmış migration'lar. `DATABASE_URL` .env üzerinden okunur.
 */
jest.setTimeout(30000);

/** Beklenen olayı süre sınırıyla bekler; süre dolarsa reject eder. */
const waitForEvent = <T>(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`'${event}' olayı ${timeoutMs}ms içinde gelmedi`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

/** Verilen pencere boyunca olayın GELMEDİĞİNİ doğrular; gelirse reject eder. */
const expectNoEvent = (socket: ClientSocket, event: string, windowMs = 1000): Promise<void> =>
  new Promise((resolve, reject) => {
    const onEvent = (): void => {
      clearTimeout(timer);
      reject(new Error(`'${event}' olayı gelmemeliydi ama geldi (tenant izolasyonu ihlali)`));
    };
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, windowMs);
    socket.once(event, onEvent);
  });

/** Bağlantının kurulmasını bekler. */
const waitForConnect = (socket: ClientSocket, timeoutMs = 5000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Bağlantı ${timeoutMs}ms içinde kurulamadı`)),
      timeoutMs,
    );
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

describe('Realtime Gateway (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let baseUrl: string;

  const runId = process.hrtime.bigint().toString(36);

  const tenantA = {
    firmName: 'Realtime Tenant A',
    slug: `rt-tenant-a-${runId}`,
    adminEmail: `rt-admin-a-${runId}@demo.test`,
    adminPassword: 'ParolaA-123',
    adminFullName: 'Admin A',
  };

  const tenantB = {
    firmName: 'Realtime Tenant B',
    slug: `rt-tenant-b-${runId}`,
    adminEmail: `rt-admin-b-${runId}@demo.test`,
    adminPassword: 'ParolaB-123',
    adminFullName: 'Admin B',
  };

  let tokenA: string;
  let tokenB: string;
  let tenantAId: string;
  let tenantBId: string;

  // Tenant A'nın hareket oluşturabilmesi için seed: 2 şube + 1 ürün.
  let srcBranchId: string;
  let dstBranchId: string;
  let productId: string;

  let clientA: ClientSocket;
  let clientB: ClientSocket;

  /** Test isteğine göre istemci üretir; reconnection kapalıdır (deterministik). */
  const connectClient = (auth?: Record<string, string>): ClientSocket =>
    io(baseUrl, { auth, reconnection: false, transports: ['websocket'] });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    // Socket.io istemcisinin bağlanabilmesi için uygulama gerçekten dinlemeli;
    // 0 → işletim sistemi boş bir port atar (paralel çalışmalarda çakışma olmaz).
    await app.listen(0);
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;

    // İki izole firma kaydet.
    const resA = await request(server).post('/auth/register-tenant').send(tenantA).expect(201);
    tokenA = resA.body.accessToken;
    tenantAId = resA.body.user.tenantId;

    const resB = await request(server).post('/auth/register-tenant').send(tenantB).expect(201);
    tokenB = resB.body.accessToken;
    tenantBId = resB.body.user.tenantId;

    // Tenant A seed'i: kaynak/hedef şube + ürün.
    const src = await request(server)
      .post('/branches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'RT Kaynak', code: `RT-SRC-${runId}` })
      .expect(201);
    srcBranchId = src.body.id;

    const dst = await request(server)
      .post('/branches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'RT Hedef', code: `RT-DST-${runId}` })
      .expect(201);
    dstBranchId = dst.body.id;

    const product = await request(server)
      .post('/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'RT Ürün', sku: `RT-P-${runId}` })
      .expect(201);
    productId = product.body.id;

    // İki tenant'ın istemcisini bağla; her ikisi de kendi room'una alınır.
    clientA = connectClient({ token: tokenA });
    clientB = connectClient({ token: tokenB });
    await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);
  });

  afterAll(async () => {
    clientA?.close();
    clientB?.close();

    // Test verisini temizle (FK sırasına dikkat: önce bağımlı satırlar).
    const ids = [tenantAId, tenantBId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.client.inventoryLog.deleteMany({ where: { tenantId: { in: ids } } });
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

  it('geçerli token ile bağlanan istemciler bağlı kalır (sanity)', () => {
    expect(clientA.connected).toBe(true);
    expect(clientB.connected).toBe(true);
    expect(tenantAId).not.toEqual(tenantBId);
  });

  it("Tenant A'nın hareketi yalnızca A'nın istemcisine movement:created olarak düşer", async () => {
    // Dinleyicileri HTTP isteğinden ÖNCE kur; olay yanıttan önce yayınlanabilir.
    const eventForA = waitForEvent<MovementCreatedPayload>(
      clientA,
      SOCKET_EVENTS.MOVEMENT_CREATED,
    );
    const noEventForB = expectNoEvent(clientB, SOCKET_EVENTS.MOVEMENT_CREATED);

    const res = await request(server)
      .post('/movements')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sourceBranchId: srcBranchId,
        destinationBranchId: dstBranchId,
        items: [{ productId, quantity: 3 }],
      })
      .expect(201);

    const payload = await eventForA;

    // İstemci A olayı doğru payload ile alır; tenantId payload'da bulunmaz.
    expect(payload.movement.id).toEqual(res.body.id);
    expect(payload.movement.sourceBranchId).toEqual(srcBranchId);
    expect(payload.movement.destinationBranchId).toEqual(dstBranchId);
    expect(payload.movement.status).toEqual('PENDING');
    expect(payload).not.toHaveProperty('tenantId');
    expect(payload.movement).not.toHaveProperty('tenantId');

    // İstemci B (farklı tenant) olayı ASLA almamalı — tenant izolasyonu.
    await noEventForB;
  });

  it("token'sız bağlantı denemesi sunucu tarafından koparılır", async () => {
    const anonymous = connectClient();
    // Dinleyici bağlantıdan ÖNCE kurulur: websocket transport'ta CONNECT ve
    // DISCONNECT paketleri aynı tick'te işlenebilir; sonradan takılan dinleyici
    // olayı kaçırır (yarış durumu).
    const disconnected = waitForEvent<string>(anonymous, 'disconnect');

    await waitForConnect(anonymous);
    const reason = await disconnected;

    expect(reason).toEqual('io server disconnect');
    anonymous.close();
  });

  it('bozuk token ile bağlantı denemesi sunucu tarafından koparılır', async () => {
    const forged = connectClient({ token: 'bozuk.jwt.token' });
    const disconnected = waitForEvent<string>(forged, 'disconnect');

    await waitForConnect(forged);
    const reason = await disconnected;

    expect(reason).toEqual('io server disconnect');
    forged.close();
  });
});
