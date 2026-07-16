import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  SOCKET_EVENTS,
  type InventoryUpdatedPayload,
  type MovementCreatedPayload,
  type MovementStatusChangedPayload,
  type NotificationPayload,
} from '@stockroute/shared-types';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../application/interfaces/jwt-payload.interface';

/**
 * Gerçek zamanlı envanter/transfer yayın gateway'i (plan §5.2, §10).
 *
 * Bağlantı akışı (plan §6.1):
 *  1. İstemci `auth: { token }` (veya `Authorization: Bearer ...` header'ı) ile bağlanır.
 *  2. Token `JwtService` ile doğrulanır; geçersizse bağlantı düşürülür.
 *  3. İstemci `tenant_{tenantId}` room'una alınır — birincil izolasyon sınırı.
 *
 * Yayın kuralı: tüm emit'ler yalnızca ilgili tenant room'una gider; global
 * broadcast (`io.emit`) hiçbir koşulda kullanılmaz (plan §2.2).
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class InventoryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(InventoryGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Bağlantıyı doğrular ve istemciyi tenant room'una alır. Token yoksa ya da
   * doğrulanamazsa bağlantı sessizce düşürülür — hata fırlatılmaz, çünkü
   * gateway'de fırlatılan hata bağlantı yaşam döngüsünü bozabilir.
   */
  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Bağlantı reddedildi (token yok): ${client.id}`);
      client.disconnect();
      return;
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      this.logger.warn(`Bağlantı reddedildi (geçersiz token): ${client.id}`);
      client.disconnect();
      return;
    }

    if (typeof payload.tenantId !== 'string' || payload.tenantId.length === 0) {
      this.logger.warn(`Bağlantı reddedildi (tenantId claim'i yok): ${client.id}`);
      client.disconnect();
      return;
    }

    await client.join(this.tenantRoom(payload.tenantId));
    client.data.tenantId = payload.tenantId;
    client.data.userId = payload.sub;
    this.logger.log(
      `İstemci bağlandı: ${client.id} → ${this.tenantRoom(payload.tenantId)} (user: ${payload.sub})`,
    );
  }

  handleDisconnect(client: Socket): void {
    const tenantId = client.data.tenantId as string | undefined;
    this.logger.log(`İstemci ayrıldı: ${client.id}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
  }

  // --- Emit yardımcıları: yalnızca ilgili tenant room'una yayın yapılır. ---

  emitInventoryUpdated(tenantId: string, payload: InventoryUpdatedPayload): void {
    this.server.to(this.tenantRoom(tenantId)).emit(SOCKET_EVENTS.INVENTORY_UPDATED, payload);
  }

  emitMovementCreated(tenantId: string, payload: MovementCreatedPayload): void {
    this.server.to(this.tenantRoom(tenantId)).emit(SOCKET_EVENTS.MOVEMENT_CREATED, payload);
  }

  emitMovementStatusChanged(tenantId: string, payload: MovementStatusChangedPayload): void {
    this.server.to(this.tenantRoom(tenantId)).emit(SOCKET_EVENTS.MOVEMENT_STATUS_CHANGED, payload);
  }

  emitNotification(tenantId: string, payload: NotificationPayload): void {
    this.server.to(this.tenantRoom(tenantId)).emit(SOCKET_EVENTS.NOTIFICATION, payload);
  }

  /** Tenant room adı tek yerde üretilir; format: `tenant_{id}`. */
  private tenantRoom(tenantId: string): string {
    return `tenant_${tenantId}`;
  }

  /**
   * Token'ı önce `handshake.auth.token`'dan, yoksa `Authorization: Bearer ...`
   * header'ından ayıklar (plan §10 — istemci `auth: { token }` ile bağlanır).
   */
  private extractToken(client: Socket): string | undefined {
    const authToken: unknown = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header !== 'string') {
      return undefined;
    }
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : undefined;
  }
}
