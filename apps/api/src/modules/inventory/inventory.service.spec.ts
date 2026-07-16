import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@prisma/client';
import { InventoryGateway } from '../../api/gateways/inventory.gateway';
import type { AdjustInventoryDto } from '../../application/dto/inventory/adjust-inventory.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TenantContextService } from '../../infrastructure/tenant/tenant-context.service';
import { InventoryService } from './inventory.service';

/**
 * InventoryService unit testleri (Gün 13 kapsamı: adjust sonrası
 * `inventory:updated` yayını). PrismaService ve gateway tamamen mock'lanır;
 * `$transaction` callback'e mock client'ın kendisini `tx` olarak geçirir.
 */
const prismaMock = {
  client: {
    branch: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    inventory: {
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      fields: { minThreshold: 'minThreshold-field-ref' },
    },
    inventoryLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
};

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

const userId = 'user-1';
const branchId = 'branch-1';
const productId = 'product-1';

const buildDto = (overrides: Partial<AdjustInventoryDto> = {}): AdjustInventoryDto => ({
  branchId,
  productId,
  quantity: 10,
  reason: 'Sayım düzeltmesi',
  ...overrides,
});

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.client.$transaction.mockImplementation(
      async (cb: (tx: typeof prismaMock.client) => Promise<unknown>) => cb(prismaMock.client),
    );

    // Varsayılan happy-path mock'ları: şube/ürün bulunur, mevcut stok 50.
    prismaMock.client.branch.findFirst.mockResolvedValue({ id: branchId });
    prismaMock.client.product.findFirst.mockResolvedValue({ id: productId });
    prismaMock.client.inventory.upsert.mockResolvedValue({ id: 'inv-1', quantity: 50 });
    prismaMock.client.inventory.update.mockResolvedValue({ id: 'inv-1', quantity: 60 });
    prismaMock.client.inventoryLog.create.mockResolvedValue({});

    tenantContextMock.getTenantId.mockReturnValue(tenantId);

    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: InventoryGateway, useValue: gatewayMock },
        { provide: TenantContextService, useValue: tenantContextMock },
      ],
    }).compile();

    service = moduleRef.get(InventoryService);
  });

  describe('adjustInventory', () => {
    it('happy path: stok günceller, MANUAL_ADJUSTMENT logu yazar ve sonucu döner', async () => {
      const result = await service.adjustInventory(userId, buildDto());

      expect(prismaMock.client.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { quantity: 60 },
        include: { product: true, branch: true },
      });
      expect(prismaMock.client.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          branchId,
          productId,
          userId,
          type: TransactionType.MANUAL_ADJUSTMENT,
          quantityChange: 10,
          previousQuantity: 50,
          newQuantity: 60,
        }),
      });
      expect(result).toEqual({ id: 'inv-1', quantity: 60 });
    });

    it('şube bulunamazsa NotFoundException fırlatır', async () => {
      prismaMock.client.branch.findFirst.mockResolvedValue(null);

      await expect(service.adjustInventory(userId, buildDto())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.client.inventory.update).not.toHaveBeenCalled();
    });

    it('stok negatife düşecekse BadRequestException fırlatır', async () => {
      await expect(
        service.adjustInventory(userId, buildDto({ quantity: -100 })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.client.inventory.update).not.toHaveBeenCalled();
    });
  });

  describe('gerçek zamanlı olay yayını (Gün 13)', () => {
    it('adjust sonrası inventory:updated yeni miktarla emit edilir', async () => {
      await service.adjustInventory(userId, buildDto());

      expect(gatewayMock.emitInventoryUpdated).toHaveBeenCalledTimes(1);
      expect(gatewayMock.emitInventoryUpdated).toHaveBeenCalledWith(tenantId, {
        branchId,
        productId,
        quantity: 60,
      });
    });

    it('düzeltme başarısız olursa (negatif stok) emit edilmez', async () => {
      await expect(
        service.adjustInventory(userId, buildDto({ quantity: -100 })),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(gatewayMock.emitInventoryUpdated).not.toHaveBeenCalled();
    });

    it('gateway emit hata fırlatırsa iş akışı kırılmaz (best-effort yayın)', async () => {
      gatewayMock.emitInventoryUpdated.mockImplementation(() => {
        throw new Error('socket patladı');
      });

      await expect(service.adjustInventory(userId, buildDto())).resolves.toEqual({
        id: 'inv-1',
        quantity: 60,
      });
    });

    it('tenant bağlamı yoksa emit çağrılmaz ve akış kırılmaz', async () => {
      tenantContextMock.getTenantId.mockReturnValue(undefined);

      await expect(service.adjustInventory(userId, buildDto())).resolves.toBeDefined();
      expect(gatewayMock.emitInventoryUpdated).not.toHaveBeenCalled();
    });
  });
});
