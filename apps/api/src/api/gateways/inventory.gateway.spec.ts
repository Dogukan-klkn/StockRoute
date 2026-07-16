import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  SOCKET_EVENTS,
  type InventoryUpdatedPayload,
  type MovementCreatedPayload,
  type MovementStatusChangedPayload,
  type NotificationPayload,
} from '@stockroute/shared-types';
import type { Server, Socket } from 'socket.io';
import { InventoryGateway } from './inventory.gateway';

/**
 * InventoryGateway unit testleri (Gün 13).
 *
 * Gerçek Socket.io sunucusu açılmaz: `server`, `client` ve `JwtService`
 * mock'lanır. Doğrulanan davranışlar:
 *  - handleConnection: geçerli token → tenant room'una join + client.data set.
 *  - handleConnection: token yok / bozuk / tenantId'siz → disconnect.
 *  - Emit yardımcıları: yalnızca `tenant_{id}` room'una, doğru olay adıyla yayın.
 */
const jwtServiceMock = {
  verifyAsync: jest.fn(),
};

const tenantId = 'tenant-1';
const tenantRoom = `tenant_${tenantId}`;

interface ClientMock {
  id: string;
  data: Record<string, unknown>;
  handshake: {
    auth: Record<string, unknown>;
    headers: Record<string, string | undefined>;
  };
  join: jest.Mock;
  disconnect: jest.Mock;
}

const buildClient = (overrides: Partial<ClientMock['handshake']> = {}): ClientMock => ({
  id: 'socket-1',
  data: {},
  handshake: { auth: {}, headers: {}, ...overrides },
  join: jest.fn(),
  disconnect: jest.fn(),
});

describe('InventoryGateway', () => {
  let gateway: InventoryGateway;
  let emitMock: jest.Mock;
  let toMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [InventoryGateway, { provide: JwtService, useValue: jwtServiceMock }],
    }).compile();

    gateway = moduleRef.get(InventoryGateway);

    // `server.to(room).emit(event, payload)` zinciri mock'lanır.
    emitMock = jest.fn();
    toMock = jest.fn().mockReturnValue({ emit: emitMock });
    gateway.server = { to: toMock } as unknown as Server;
  });

  describe('handleConnection', () => {
    it("geçerli token ile tenant room'una join eder ve client.data doldurulur", async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user-1', tenantId, role: 'FIRM_ADMIN' });
      const client = buildClient({ auth: { token: 'gecerli-jwt' } });

      await gateway.handleConnection(client as unknown as Socket);

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('gecerli-jwt');
      expect(client.join).toHaveBeenCalledWith(tenantRoom);
      expect(client.data.tenantId).toBe(tenantId);
      expect(client.data.userId).toBe('user-1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("Authorization Bearer header'ındaki token da kabul edilir", async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user-1', tenantId, role: 'FIRM_ADMIN' });
      const client = buildClient({ headers: { authorization: 'Bearer header-jwt' } });

      await gateway.handleConnection(client as unknown as Socket);

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('header-jwt');
      expect(client.join).toHaveBeenCalledWith(tenantRoom);
    });

    it('token yoksa bağlantı düşürülür ve join çağrılmaz', async () => {
      const client = buildClient();

      await gateway.handleConnection(client as unknown as Socket);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
      expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('bozuk/geçersiz token ile bağlantı düşürülür', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('invalid signature'));
      const client = buildClient({ auth: { token: 'bozuk-jwt' } });

      await gateway.handleConnection(client as unknown as Socket);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it("payload'da tenantId yoksa bağlantı düşürülür", async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      const client = buildClient({ auth: { token: 'tenantsiz-jwt' } });

      await gateway.handleConnection(client as unknown as Socket);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('emit yardımcıları', () => {
    it('emitInventoryUpdated doğru room ve olay adıyla yayın yapar', () => {
      const payload: InventoryUpdatedPayload = {
        branchId: 'branch-1',
        productId: 'product-1',
        quantity: 42,
      };

      gateway.emitInventoryUpdated(tenantId, payload);

      expect(toMock).toHaveBeenCalledWith(tenantRoom);
      expect(emitMock).toHaveBeenCalledWith(SOCKET_EVENTS.INVENTORY_UPDATED, payload);
    });

    it('emitMovementCreated doğru room ve olay adıyla yayın yapar', () => {
      const payload: MovementCreatedPayload = {
        movement: {
          id: 'movement-1',
          sourceBranchId: 'branch-src',
          destinationBranchId: 'branch-dst',
          status: 'PENDING',
        },
      };

      gateway.emitMovementCreated(tenantId, payload);

      expect(toMock).toHaveBeenCalledWith(tenantRoom);
      expect(emitMock).toHaveBeenCalledWith(SOCKET_EVENTS.MOVEMENT_CREATED, payload);
    });

    it('emitMovementStatusChanged doğru room ve olay adıyla yayın yapar', () => {
      const payload: MovementStatusChangedPayload = {
        movementId: 'movement-1',
        status: 'APPROVED',
        branchIds: ['branch-src', 'branch-dst'],
      };

      gateway.emitMovementStatusChanged(tenantId, payload);

      expect(toMock).toHaveBeenCalledWith(tenantRoom);
      expect(emitMock).toHaveBeenCalledWith(SOCKET_EVENTS.MOVEMENT_STATUS_CHANGED, payload);
    });

    it('emitNotification doğru room ve olay adıyla yayın yapar', () => {
      const payload: NotificationPayload = {
        type: 'low-stock',
        title: 'Düşük stok',
        message: 'Ürün stoğu eşiğin altında',
        level: 'warning',
      };

      gateway.emitNotification(tenantId, payload);

      expect(toMock).toHaveBeenCalledWith(tenantRoom);
      expect(emitMock).toHaveBeenCalledWith(SOCKET_EVENTS.NOTIFICATION, payload);
    });

    it("emit yardımcıları farklı tenant'a yayın yapmaz (yalnızca verilen room)", () => {
      gateway.emitInventoryUpdated('tenant-2', {
        branchId: 'branch-1',
        productId: 'product-1',
        quantity: 1,
      });

      expect(toMock).toHaveBeenCalledTimes(1);
      expect(toMock).toHaveBeenCalledWith('tenant_tenant-2');
    });
  });
});
