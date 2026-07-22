import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import type { AppSocket } from '../lib/socket';

/**
 * Uygulama genelinde tek Socket.io bağlantısı sağlar (plan §10).
 *
 * Bağlantı yaşam döngüsü burada BİR KEZ kurulur (`useSocket`); bileşenler
 * `useSocketContext()` ile aynı bağlantıyı paylaşır. Her bileşenin kendi
 * `useSocket()` çağrısını yapması yasaktır — bağlantı singleton olsa da
 * gereksiz effect/listener kalabalığı üretir.
 *
 * Uygulama kökünde `AppProviders` içinde sarmalanır; oturum yoksa bağlantı
 * kurulmaz ve context `socket: null` döner (tüketiciler bunu tolere eder).
 */
interface SocketContextValue {
  socket: AppSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * Real-time → query cache köprüsünü kuran görünmez bileşen.
 *
 * `useRealtimeSync` context'i okuduğu için Provider'ın ALTINDA çalışmalıdır;
 * `SocketProvider` gövdesinde çağrılamaz. Ayrı bir bileşen olması aynı zamanda
 * "uygulamada bir kez dinle" kuralını yapısal olarak garanti eder.
 */
function RealtimeSync() {
  useRealtimeSync();
  return null;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { socket, connected } = useSocket();

  const value = useMemo<SocketContextValue>(() => ({ socket, connected }), [socket, connected]);

  return (
    <SocketContext.Provider value={value}>
      <RealtimeSync />
      {children}
    </SocketContext.Provider>
  );
}

/** Paylaşılan socket bağlantısına erişir. `SocketProvider` altında kullanılmalıdır. */
export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocketContext, SocketProvider içinde kullanılmalıdır.');
  }
  return ctx;
}
