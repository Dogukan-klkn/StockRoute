import { io, type Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type InventoryUpdatedPayload,
  type MovementCreatedPayload,
  type MovementStatusChangedPayload,
  type NotificationPayload,
} from '@stockroute/shared-types';

/**
 * Socket.io istemci yönetimi (plan §10) — uygulama genelinde TEK bağlantı.
 *
 * Bağlantı sunucudaki `InventoryGateway` ile eşleşir: istemci `auth: { token }`
 * ile bağlanır, sunucu token'ı doğrulayıp `tenant_{tenantId}` room'una alır.
 * Tenant izolasyonu sunucu tarafındadır; istemci gelen olayı ek filtreden
 * geçirmez (bkz. socket-events.ts notu).
 *
 * Tasarım kararı — modül düzeyi singleton: React 18 StrictMode geliştirmede
 * effect'leri iki kez çalıştırır. Bağlantı bir React ref'inde tutulsaydı ikinci
 * çalıştırma ikinci bir soket açardı. Bağlantıyı modül düzeyinde tutup
 * referans sayacıyla yönetmek, kaç effect çalışırsa çalışsın tek soket
 * garantisi verir.
 *
 * Real-time "best-effort"tür: bağlantı kurulamazsa uygulama HTTP üzerinden
 * çalışmaya devam eder; bu modül hiçbir koşulda hata fırlatmaz.
 */

/** Sunucu → istemci olaylarının tip haritası; `socket.on` bunu kullanır. */
export interface ServerToClientEvents {
  [SOCKET_EVENTS.INVENTORY_UPDATED]: (payload: InventoryUpdatedPayload) => void;
  [SOCKET_EVENTS.MOVEMENT_CREATED]: (payload: MovementCreatedPayload) => void;
  [SOCKET_EVENTS.MOVEMENT_STATUS_CHANGED]: (payload: MovementStatusChangedPayload) => void;
  [SOCKET_EVENTS.NOTIFICATION]: (payload: NotificationPayload) => void;
}

/** İstemci → sunucu olayı yok; gateway yalnızca yayın yapar. */
export type ClientToServerEvents = Record<string, never>;

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
/** Bağlantıyı kaç tüketicinin (effect) istediği — 0'a düşünce kapatılır. */
let refCount = 0;
/** Aktif bağlantının kurulduğu token; değişirse soket yeniden kurulur. */
let currentToken: string | null = null;
/** Bekleyen gecikmeli kapatma zamanlayıcısı (bkz. TEARDOWN_GRACE_MS). */
let teardownTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Sayaç sıfırlanınca kapatmadan önce beklenen süre.
 *
 * StrictMode'da effect "çalış → temizle → tekrar çalış" sırası izler: temizlik
 * anında sayaç sıfıra düşer. Hemen kapatsaydık her mount'ta gereksiz bir
 * disconnect/reconnect turu yaşanırdı (sunucuda da bağlan/ayrıl gürültüsü).
 * Kısa bir gecikme, hemen ardından gelen ikinci `acquireSocket` çağrısının
 * mevcut bağlantıyı devralmasına izin verir; gerçek logout'ta ise bu süre
 * dolar ve bağlantı kapanır.
 */
const TEARDOWN_GRACE_MS = 300;

/**
 * Bağlantıyı açar (ya da mevcut bağlantıyı paylaşır) ve tüketici sayacını
 * artırır. Dönen fonksiyon çağrıldığında sayaç düşer; sıfırlanınca bağlantı
 * kapanır. Aynı token için ikinci çağrı yeni soket AÇMAZ.
 */
export function acquireSocket(token: string): { socket: AppSocket; release: () => void } {
  // Token değiştiyse (başka kullanıcıya geçiş) eski bağlantı geçersizdir:
  // sunucu room ataması eski tenant'a yapılmıştır, kapatıp yeniden kurarız.
  if (socket && currentToken !== token) {
    closeSocket();
  }

  // Bekleyen kapatma varsa iptal et: bu çağrı bağlantıyı devralıyor.
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
  }

  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      // Yalnızca WebSocket: HTTP long-polling'e düşmek gereksiz istek üretir ve
      // handshake'i yavaşlatır; gateway WebSocket'i destekliyor.
      transports: ['websocket'],
      // Otomatik yeniden bağlanma açık (socket.io varsayılanı) — ağ kesintisinde
      // istemci kendi kendine toparlanır.
      reconnection: true,
    });
    currentToken = token;

    socket.on('connect_error', (error) => {
      // Yalnızca loglanır: real-time bir iyileştirmedir, çekirdek işlev HTTP
      // üzerinden çalışmaya devam eder.
      console.warn('[socket] bağlantı hatası:', error.message);
    });
  }

  refCount += 1;
  const acquired = socket;

  let released = false;
  return {
    socket: acquired,
    release: () => {
      // Aynı release iki kez çağrılırsa sayaç bozulmasın (StrictMode koruması).
      if (released) {
        return;
      }
      released = true;
      refCount -= 1;
      if (refCount <= 0) {
        // Hemen kapatma: StrictMode'un ikinci effect çalıştırması bağlantıyı
        // devralabilsin (bkz. TEARDOWN_GRACE_MS).
        if (teardownTimer) {
          clearTimeout(teardownTimer);
        }
        teardownTimer = setTimeout(() => {
          teardownTimer = null;
          if (refCount <= 0) {
            closeSocket();
          }
        }, TEARDOWN_GRACE_MS);
      }
    },
  };
}

/** Bağlantıyı kapatır ve modül durumunu sıfırlar (logout / token değişimi). */
export function closeSocket(): void {
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
  refCount = 0;
}

/** Test ve hata ayıklama için mevcut bağlantı (yoksa null). */
export function getSocket(): AppSocket | null {
  return socket;
}
