import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MovementStatus, TransactionType, UserRole } from '@prisma/client';
import { InventoryGateway } from '../../api/gateways/inventory.gateway';
import type { CreateMovementDto } from '../../application/dto/movements/create-movement.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TenantContextService } from '../../infrastructure/tenant/tenant-context.service';
import { MovementsService } from './movements.service';

/**
 * MovementsService unit testleri.
 *
 * PrismaService tamamen mock'lanır; gerçek veritabanına vurulmaz.
 * `$transaction`, callback'e mock client'ın kendisini `tx` olarak geçirir —
 * böylece `ship`/`receive` içindeki transaction gövdesi de aynı mock'larla
 * doğrulanır.
 */
const prismaMock = {
  client: {
    stockMovement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    branch: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
};

/** Gün 13: gateway emit'leri mock'lanır; gerçek Socket.io sunucusu açılmaz. */
const gatewayMock = {
  emitInventoryUpdated: jest.fn(),
  emitMovementCreated: jest.fn(),
  emitMovementStatusChanged: jest.fn(),
  emitNotification: jest.fn(),
};

const tenantId = 'tenant-1';
const tenantContextMock = {
  getTenantId: jest.fn(),
};

const userId = 'user-requester';
const otherUserId = 'user-other';
const movementId = 'movement-1';
const sourceBranchId = 'branch-src';
const destinationBranchId = 'branch-dst';

interface MockMovement {
  id: string;
  status: MovementStatus;
  requestedById: string;
  sourceBranchId: string;
  destinationBranchId: string;
  items: { productId: string; quantity: number }[];
}

const buildMovement = (overrides: Partial<MockMovement> = {}): MockMovement => ({
  id: movementId,
  status: MovementStatus.PENDING,
  requestedById: userId,
  sourceBranchId,
  destinationBranchId,
  items: [{ productId: 'product-1', quantity: 10 }],
  ...overrides,
});

const buildCreateDto = (overrides: Partial<CreateMovementDto> = {}): CreateMovementDto => ({
  sourceBranchId,
  destinationBranchId,
  note: 'Test transferi',
  items: [{ productId: 'product-1', quantity: 5 }],
  ...overrides,
});

describe('MovementsService', () => {
  let service: MovementsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.client.$transaction.mockImplementation(
      async (cb: (tx: typeof prismaMock.client) => Promise<unknown>) => cb(prismaMock.client),
    );

    // create'in tenant kapsamı doğrulaması için varsayılan: şube/ürün bulunur.
    prismaMock.client.branch.findUnique.mockResolvedValue({ id: sourceBranchId });
    prismaMock.client.product.findUnique.mockResolvedValue({ id: 'product-1' });

    // Emit'lerin tenant room'una yönlenebilmesi için varsayılan: bağlam dolu.
    tenantContextMock.getTenantId.mockReturnValue(tenantId);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: InventoryGateway, useValue: gatewayMock },
        { provide: TenantContextService, useValue: tenantContextMock },
      ],
    }).compile();

    service = moduleRef.get(MovementsService);
  });

  describe('create', () => {
    it('geçerli DTO ile PENDING durumunda, requestedById ve items ile oluşturur', async () => {
      const dto = buildCreateDto();
      const created = buildMovement();
      prismaMock.client.stockMovement.create.mockResolvedValue(created);

      const result = await service.create(dto, userId);

      expect(prismaMock.client.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceBranchId,
          destinationBranchId,
          note: dto.note,
          status: MovementStatus.PENDING,
          requestedById: userId,
          items: {
            create: [{ productId: 'product-1', quantity: 5 }],
          },
        }),
        include: { items: true },
      });
      expect(result).toBe(created);
    });

    it('kaynak ve hedef şube aynıysa BadRequestException fırlatır', async () => {
      const dto = buildCreateDto({ destinationBranchId: sourceBranchId });

      await expect(service.create(dto, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.stockMovement.create).not.toHaveBeenCalled();
    });

    it('şube tenant kapsamında bulunamazsa BadRequestException fırlatır', async () => {
      prismaMock.client.branch.findUnique.mockResolvedValue(null);

      await expect(service.create(buildCreateDto(), userId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prismaMock.client.stockMovement.create).not.toHaveBeenCalled();
    });

    it('ürün tenant kapsamında bulunamazsa BadRequestException fırlatır', async () => {
      prismaMock.client.product.findUnique.mockResolvedValue(null);

      await expect(service.create(buildCreateDto(), userId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prismaMock.client.stockMovement.create).not.toHaveBeenCalled();
    });

    it('Prisma çağrısındaki data içinde tenantId alanı bulunmaz (extension atar)', async () => {
      prismaMock.client.stockMovement.create.mockResolvedValue(buildMovement());

      await service.create(buildCreateDto(), userId);

      const createArgs = prismaMock.client.stockMovement.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createArgs.data).not.toHaveProperty('tenantId');
    });
  });

  describe('findAll / findOne', () => {
    it('findAll filtresiz çağrıldığında boş where ile tüm hareketleri döner', async () => {
      const movements = [buildMovement()];
      prismaMock.client.stockMovement.findMany.mockResolvedValue(movements);

      const result = await service.findAll({});

      expect(prismaMock.client.stockMovement.findMany).toHaveBeenCalledWith({
        where: {},
        include: { items: true, sourceBranch: true, destinationBranch: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBe(movements);
    });

    it('findAll status filtresini where koşuluna ekler', async () => {
      prismaMock.client.stockMovement.findMany.mockResolvedValue([]);

      await service.findAll({ status: MovementStatus.APPROVED });

      expect(prismaMock.client.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: MovementStatus.APPROVED } }),
      );
    });

    it('findAll branchId filtresi için kaynak/hedef OR koşulu üretir', async () => {
      prismaMock.client.stockMovement.findMany.mockResolvedValue([]);

      await service.findAll({ branchId: sourceBranchId });

      expect(prismaMock.client.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ sourceBranchId }, { destinationBranchId: sourceBranchId }],
          },
        }),
      );
    });

    it('findOne kayıt bulunamazsa NotFoundException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(null);

      await expect(service.findOne(movementId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('approve / reject', () => {
    it('PENDING hareketi APPROVED yapar; approvedById ve approvedAt set edilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());
      const updated = buildMovement({ status: MovementStatus.APPROVED });
      prismaMock.client.stockMovement.update.mockResolvedValue(updated);

      const result = await service.approve(movementId, userId);

      expect(prismaMock.client.stockMovement.update).toHaveBeenCalledWith({
        where: { id: movementId },
        data: {
          status: MovementStatus.APPROVED,
          approvedById: userId,
          approvedAt: expect.any(Date),
        },
        include: { items: true },
      });
      expect(result).toBe(updated);
    });

    it('PENDING dışı durumdan approve BadRequestException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );

      await expect(service.approve(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.stockMovement.update).not.toHaveBeenCalled();
    });

    it('PENDING hareketi REJECTED yapar; approvedById ve approvedAt set edilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());
      const updated = buildMovement({ status: MovementStatus.REJECTED });
      prismaMock.client.stockMovement.update.mockResolvedValue(updated);

      const result = await service.reject(movementId, userId);

      expect(prismaMock.client.stockMovement.update).toHaveBeenCalledWith({
        where: { id: movementId },
        data: {
          status: MovementStatus.REJECTED,
          approvedById: userId,
          approvedAt: expect.any(Date),
        },
        include: { items: true },
      });
      expect(result).toBe(updated);
    });

    it('PENDING dışı durumdan reject BadRequestException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.REJECTED }),
      );

      await expect(service.reject(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.stockMovement.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('talep eden kullanıcı PENDING hareketi iptal edebilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());
      const updated = buildMovement({ status: MovementStatus.CANCELLED });
      prismaMock.client.stockMovement.update.mockResolvedValue(updated);

      const result = await service.cancel(movementId, userId, UserRole.FIELD_STAFF);

      expect(prismaMock.client.stockMovement.update).toHaveBeenCalledWith({
        where: { id: movementId },
        data: { status: MovementStatus.CANCELLED },
        include: { items: true },
      });
      expect(result).toBe(updated);
    });

    it('talep eden kullanıcı APPROVED hareketi iptal edebilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.CANCELLED }),
      );

      await expect(service.cancel(movementId, userId, UserRole.FIELD_STAFF)).resolves.toBeDefined();
    });

    it('FIRM_ADMIN başka kullanıcının hareketini iptal edebilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.CANCELLED }),
      );

      await expect(
        service.cancel(movementId, otherUserId, UserRole.FIRM_ADMIN),
      ).resolves.toBeDefined();
      expect(prismaMock.client.stockMovement.update).toHaveBeenCalled();
    });

    it('talep eden olmayan ve FIRM_ADMIN olmayan kullanıcıya ForbiddenException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());

      await expect(
        service.cancel(movementId, otherUserId, UserRole.BRANCH_MANAGER),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.client.stockMovement.update).not.toHaveBeenCalled();
    });

    it.each([
      MovementStatus.IN_TRANSIT,
      MovementStatus.RECEIVED,
      MovementStatus.REJECTED,
      MovementStatus.CANCELLED,
    ])('%s durumundaki hareket iptal edilemez (BadRequestException)', async (status) => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement({ status }));

      await expect(service.cancel(movementId, userId, UserRole.FIRM_ADMIN)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prismaMock.client.stockMovement.update).not.toHaveBeenCalled();
    });
  });

  describe('ship', () => {
    it('APPROVED dışı durumdan ship BadRequestException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());

      await expect(service.ship(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.stockMovement.update).not.toHaveBeenCalled();
      expect(prismaMock.client.inventory.update).not.toHaveBeenCalled();
    });

    it('happy path: IN_TRANSIT olur, stok düşer ve TRANSFER_OUT logu yazılır', async () => {
      const movement = buildMovement({ status: MovementStatus.APPROVED });
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(movement);
      const updated = buildMovement({ status: MovementStatus.IN_TRANSIT });
      prismaMock.client.stockMovement.update.mockResolvedValue(updated);
      prismaMock.client.inventory.findUnique.mockResolvedValue({ id: 'inv-1', quantity: 100 });
      prismaMock.client.inventory.update.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      const result = await service.ship(movementId, userId);

      expect(prismaMock.client.stockMovement.update).toHaveBeenCalledWith({
        where: { id: movementId },
        data: {
          status: MovementStatus.IN_TRANSIT,
          shippedById: userId,
          shippedAt: expect.any(Date),
        },
        include: { items: true },
      });
      expect(prismaMock.client.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { quantity: 90 },
      });
      expect(prismaMock.client.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          branchId: sourceBranchId,
          productId: 'product-1',
          userId,
          type: TransactionType.TRANSFER_OUT,
          quantityChange: -10,
          previousQuantity: 100,
          newQuantity: 90,
        }),
      });
      expect(result).toBe(updated);
    });

    it('kaynak şubede inventory kaydı yoksa BadRequestException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.inventory.findUnique.mockResolvedValue(null);

      await expect(service.ship(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.inventory.update).not.toHaveBeenCalled();
      expect(prismaMock.client.inventoryLog.create).not.toHaveBeenCalled();
    });

    it('yetersiz stokta BadRequestException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.inventory.findUnique.mockResolvedValue({ id: 'inv-1', quantity: 5 });

      await expect(service.ship(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.inventory.update).not.toHaveBeenCalled();
      expect(prismaMock.client.inventoryLog.create).not.toHaveBeenCalled();
    });

    it('çoklu kalemde her kalem için ayrı stok düşümü ve log yazımı yapar', async () => {
      const movement = buildMovement({
        status: MovementStatus.APPROVED,
        items: [
          { productId: 'product-1', quantity: 10 },
          { productId: 'product-2', quantity: 20 },
        ],
      });
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(movement);
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.inventory.findUnique
        .mockResolvedValueOnce({ id: 'inv-1', quantity: 100 })
        .mockResolvedValueOnce({ id: 'inv-2', quantity: 50 });
      prismaMock.client.inventory.update.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      await service.ship(movementId, userId);

      expect(prismaMock.client.inventory.update).toHaveBeenCalledTimes(2);
      expect(prismaMock.client.inventory.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'inv-2' },
        data: { quantity: 30 },
      });
      expect(prismaMock.client.inventoryLog.create).toHaveBeenCalledTimes(2);
    });

    it('tüm işlem prisma.$transaction içinde yürütülür', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.inventory.findUnique.mockResolvedValue({ id: 'inv-1', quantity: 100 });
      prismaMock.client.inventory.update.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      await service.ship(movementId, userId);

      expect(prismaMock.client.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('receive', () => {
    it('IN_TRANSIT dışı durumdan receive BadRequestException fırlatır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );

      await expect(service.receive(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.stockMovement.update).not.toHaveBeenCalled();
      expect(prismaMock.client.inventory.upsert).not.toHaveBeenCalled();
    });

    it('happy path: RECEIVED olur, hedef stok artar ve TRANSFER_IN logu yazılır', async () => {
      const movement = buildMovement({ status: MovementStatus.IN_TRANSIT });
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(movement);
      const updated = buildMovement({ status: MovementStatus.RECEIVED });
      prismaMock.client.stockMovement.update.mockResolvedValue(updated);
      prismaMock.client.inventory.findUnique.mockResolvedValue({ id: 'inv-dst', quantity: 50 });
      prismaMock.client.inventory.upsert.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      const result = await service.receive(movementId, userId);

      expect(prismaMock.client.stockMovement.update).toHaveBeenCalledWith({
        where: { id: movementId },
        data: {
          status: MovementStatus.RECEIVED,
          receivedById: userId,
          receivedAt: expect.any(Date),
        },
        include: { items: true },
      });
      expect(prismaMock.client.inventory.upsert).toHaveBeenCalledWith({
        where: {
          branchId_productId: { branchId: destinationBranchId, productId: 'product-1' },
        },
        update: { quantity: { increment: 10 } },
        create: expect.objectContaining({
          branchId: destinationBranchId,
          productId: 'product-1',
          quantity: 10,
          minThreshold: 0,
        }),
      });
      expect(prismaMock.client.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          branchId: destinationBranchId,
          productId: 'product-1',
          userId,
          type: TransactionType.TRANSFER_IN,
          quantityChange: 10,
          previousQuantity: 50,
          newQuantity: 60,
        }),
      });
      expect(result).toBe(updated);
    });

    it('hedef inventory kaydı yoksa previousQuantity=0 ile log yazılır', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.RECEIVED }),
      );
      prismaMock.client.inventory.findUnique.mockResolvedValue(null);
      prismaMock.client.inventory.upsert.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      await service.receive(movementId, userId);

      expect(prismaMock.client.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousQuantity: 0,
          newQuantity: 10,
          quantityChange: 10,
        }),
      });
    });

    it('tüm işlem prisma.$transaction içinde yürütülür', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.RECEIVED }),
      );
      prismaMock.client.inventory.findUnique.mockResolvedValue(null);
      prismaMock.client.inventory.upsert.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      await service.receive(movementId, userId);

      expect(prismaMock.client.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('gerçek zamanlı olay yayını (Gün 13)', () => {
    it('create sonrası movement:created tenant room bilgisiyle emit edilir', async () => {
      const created = buildMovement();
      prismaMock.client.stockMovement.create.mockResolvedValue(created);

      await service.create(buildCreateDto(), userId);

      expect(gatewayMock.emitMovementCreated).toHaveBeenCalledTimes(1);
      expect(gatewayMock.emitMovementCreated).toHaveBeenCalledWith(tenantId, {
        movement: {
          id: created.id,
          sourceBranchId: created.sourceBranchId,
          destinationBranchId: created.destinationBranchId,
          status: created.status,
        },
      });
    });

    it('approve sonrası movement:statusChanged APPROVED ile emit edilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );

      await service.approve(movementId, userId);

      expect(gatewayMock.emitMovementStatusChanged).toHaveBeenCalledWith(tenantId, {
        movementId,
        status: MovementStatus.APPROVED,
        branchIds: [sourceBranchId, destinationBranchId],
      });
    });

    it('reject sonrası movement:statusChanged REJECTED ile emit edilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.REJECTED }),
      );

      await service.reject(movementId, userId);

      expect(gatewayMock.emitMovementStatusChanged).toHaveBeenCalledWith(tenantId, {
        movementId,
        status: MovementStatus.REJECTED,
        branchIds: [sourceBranchId, destinationBranchId],
      });
    });

    it('cancel sonrası movement:statusChanged CANCELLED ile emit edilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.CANCELLED }),
      );

      await service.cancel(movementId, userId, UserRole.FIRM_ADMIN);

      expect(gatewayMock.emitMovementStatusChanged).toHaveBeenCalledWith(tenantId, {
        movementId,
        status: MovementStatus.CANCELLED,
        branchIds: [sourceBranchId, destinationBranchId],
      });
    });

    it('ship sonrası statusChanged IN_TRANSIT ve her kalem için inventory:updated emit edilir', async () => {
      const movement = buildMovement({
        status: MovementStatus.APPROVED,
        items: [
          { productId: 'product-1', quantity: 10 },
          { productId: 'product-2', quantity: 20 },
        ],
      });
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(movement);
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.inventory.findUnique
        .mockResolvedValueOnce({ id: 'inv-1', quantity: 100 })
        .mockResolvedValueOnce({ id: 'inv-2', quantity: 50 });
      prismaMock.client.inventory.update.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      await service.ship(movementId, userId);

      expect(gatewayMock.emitMovementStatusChanged).toHaveBeenCalledWith(tenantId, {
        movementId,
        status: MovementStatus.IN_TRANSIT,
        branchIds: [sourceBranchId, destinationBranchId],
      });
      expect(gatewayMock.emitInventoryUpdated).toHaveBeenCalledTimes(2);
      expect(gatewayMock.emitInventoryUpdated).toHaveBeenNthCalledWith(1, tenantId, {
        branchId: sourceBranchId,
        productId: 'product-1',
        quantity: 90,
      });
      expect(gatewayMock.emitInventoryUpdated).toHaveBeenNthCalledWith(2, tenantId, {
        branchId: sourceBranchId,
        productId: 'product-2',
        quantity: 30,
      });
    });

    it('receive sonrası statusChanged RECEIVED ve her kalem için inventory:updated emit edilir', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.IN_TRANSIT }),
      );
      prismaMock.client.stockMovement.update.mockResolvedValue(
        buildMovement({ status: MovementStatus.RECEIVED }),
      );
      prismaMock.client.inventory.findUnique.mockResolvedValue({ id: 'inv-dst', quantity: 50 });
      prismaMock.client.inventory.upsert.mockResolvedValue({});
      prismaMock.client.inventoryLog.create.mockResolvedValue({});

      await service.receive(movementId, userId);

      expect(gatewayMock.emitMovementStatusChanged).toHaveBeenCalledWith(tenantId, {
        movementId,
        status: MovementStatus.RECEIVED,
        branchIds: [sourceBranchId, destinationBranchId],
      });
      expect(gatewayMock.emitInventoryUpdated).toHaveBeenCalledTimes(1);
      expect(gatewayMock.emitInventoryUpdated).toHaveBeenCalledWith(tenantId, {
        branchId: destinationBranchId,
        productId: 'product-1',
        quantity: 60,
      });
    });

    it('geçersiz durum geçişinde (PENDING → ship) hiçbir olay emit edilmez', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(buildMovement());

      await expect(service.ship(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);

      expect(gatewayMock.emitMovementStatusChanged).not.toHaveBeenCalled();
      expect(gatewayMock.emitInventoryUpdated).not.toHaveBeenCalled();
      expect(gatewayMock.emitMovementCreated).not.toHaveBeenCalled();
    });

    it('geçersiz durum geçişinde (APPROVED → approve) emit edilmez', async () => {
      prismaMock.client.stockMovement.findUnique.mockResolvedValue(
        buildMovement({ status: MovementStatus.APPROVED }),
      );

      await expect(service.approve(movementId, userId)).rejects.toBeInstanceOf(BadRequestException);

      expect(gatewayMock.emitMovementStatusChanged).not.toHaveBeenCalled();
    });

    it('gateway emit hata fırlatırsa iş akışı kırılmaz (best-effort yayın)', async () => {
      const created = buildMovement();
      prismaMock.client.stockMovement.create.mockResolvedValue(created);
      gatewayMock.emitMovementCreated.mockImplementation(() => {
        throw new Error('socket patladı');
      });

      await expect(service.create(buildCreateDto(), userId)).resolves.toBe(created);
    });

    it('tenant bağlamı yoksa emit çağrılmaz ve akış kırılmaz', async () => {
      tenantContextMock.getTenantId.mockReturnValue(undefined);
      const created = buildMovement();
      prismaMock.client.stockMovement.create.mockResolvedValue(created);

      await expect(service.create(buildCreateDto(), userId)).resolves.toBe(created);
      expect(gatewayMock.emitMovementCreated).not.toHaveBeenCalled();
    });
  });
});
