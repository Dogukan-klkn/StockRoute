import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/auth-store';
import { acquireSocket, type AppSocket } from '../lib/socket';

export interface UseSocketResult {
  /** Aktif bağlantı; oturum yoksa veya bağlantı kurulmadıysa null. */
  socket: AppSocket | null;
  /** Soket şu an bağlı mı — topbar göstergesi için. */
  connected: boolean;
}

/**
 * Socket bağlantısının yaşam döngüsünü oturuma bağlar (plan §10).
 *
 * Token varsa bağlanır, token değişirse (başka kullanıcı) yeniden kurar,
 * logout'ta (token null) kapatır. Bağlantının kendisi `lib/socket.ts`'teki
 * referans sayaçlı singleton'da yaşar; bu hook yalnızca "istiyorum/bıraktım"
 * sinyalini verir ve bağlantı durumunu React state'ine yansıtır.
 *
 * Uygulamada doğrudan çağrılmaz — `SocketProvider` tek tüketicidir. Bileşenler
 * `useSocketContext()` ile bağlantıya erişir (tek bağlantı kuralı).
 */
export function useSocket(): UseSocketResult {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setSocket(null);
      setConnected(false);
      return;
    }

    const { socket: activeSocket, release } = acquireSocket(accessToken);
    setSocket(activeSocket);
    // Soket paylaşılan bir singleton olduğundan bu effect'e bağlandığında
    // bağlantı zaten kurulmuş olabilir; `connected` olayını beklemeyip mevcut
    // durumu okuruz.
    setConnected(activeSocket.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    activeSocket.on('connect', handleConnect);
    activeSocket.on('disconnect', handleDisconnect);

    return () => {
      activeSocket.off('connect', handleConnect);
      activeSocket.off('disconnect', handleDisconnect);
      release();
    };
  }, [accessToken]);

  return { socket, connected };
}
