import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  SOCKET_EVENTS,
  type NotificationPayload,
  type NotificationLevel,
} from '@stockroute/shared-types';
import type { AlertColor } from '@mui/material';
import { useSocketContext } from '../providers/SocketProvider';
import { useSnackbar } from '../components/SnackbarProvider';
import { MOVEMENTS_QUERY_KEY } from '../features/movements/hooks/useMovements';
import { INVENTORY_QUERY_KEY } from '../features/inventory/hooks/useInventory';

/**
 * Real-time olaylarını TanStack Query cache'ine bağlayan merkezi katman
 * (plan §10, §12.1).
 *
 * Strateji — **invalidate**, cache'e doğrudan yazma değil. Gerekçe:
 *  1. Payload'lar liste satırı çizmeye yetmez: `movement:created` yalnızca
 *     `{ id, sourceBranchId, destinationBranchId, status }` taşır; listede
 *     gereken `items[]`, şube adları ve `createdAt` yoktur. Cache'e yazacak
 *     veri olmadığı için yine sunucudan çekmek gerekir.
 *  2. Query anahtarları filtrelidir (`['movements', status, branchId]`). Durum
 *     değişince kayıt bir filtre kovasından diğerine taşınmalıdır; önek bazlı
 *     invalidate bunu tek çağrıda halleder.
 *  3. Sunucu tek doğruluk kaynağı kalır; elle cache mutasyonunun sapma riski yok.
 *
 * `refetchType: 'active'` ile yalnızca ekranda mount olmuş query'ler yeniden
 * çekilir; arka plandakiler stale işaretlenir ve kullanıcı o ekrana dönünce
 * tazelenir. Böylece açık olmayan ekranlar için boşuna istek atılmaz.
 *
 * Tenant izolasyonu sunucudadır (`tenant_{id}` room); istemci gelen olayı ek
 * filtreden geçirmez.
 */

/** Olay yoğunluğunu tek invalidate'e indiren bekleme süresi (ms). */
const COALESCE_MS = 200;

/** Bildirim seviyesini MUI Alert rengine eşler. */
function toAlertColor(level: NotificationLevel): AlertColor {
  // NotificationLevel ('info' | 'warning' | 'error' | 'success') ile AlertColor
  // aynı değerleri taşır; eşleme yine de açık yazılır ki paket tarafında yeni
  // bir seviye eklenirse derleyici burada uyarsın.
  switch (level) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
    default:
      return 'info';
  }
}

/**
 * Socket olaylarını dinler ve ilgili query'leri geçersizleştirir.
 *
 * Uygulamada BİR KEZ çağrılır (bkz. RealtimeSync bileşeni); birden çok çağrı
 * aynı olayı defalarca işler.
 */
export function useRealtimeSync(): void {
  const { socket } = useSocketContext();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();

  // Snackbar fonksiyonu effect bağımlılığı olmasın: değişse bile listener'ları
  // yeniden kurmak istemeyiz (bağlantı sabit kalmalı).
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    // Aynı işlemden doğan olay salvosunu (ör. çok kalemli bir transferin
    // teslim alınmasında her kalem için bir `inventory:updated`) tek
    // invalidate'te birleştirir.
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const coalesce = (key: string, run: () => void) => {
      const pending = timers.get(key);
      if (pending) {
        clearTimeout(pending);
      }
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          run();
        }, COALESCE_MS),
      );
    };

    const invalidate = (client: QueryClient, queryKey: readonly unknown[]) =>
      client.invalidateQueries({ queryKey, refetchType: 'active' });

    // Yeni transfer: liste ve dashboard sayaçları tazelenir.
    const handleMovementCreated = () => {
      coalesce('movements', () => void invalidate(queryClient, MOVEMENTS_QUERY_KEY));
    };

    // Durum değişimi: liste + açık detay modalı birlikte tazelenir. Detay
    // anahtarı (`['movements','detail',id]`) aynı önekin altında olduğundan
    // tek invalidate ikisini de kapsar. Durum geçişi stok da hareket ettirir
    // (sevk/teslim), bu yüzden envanter de tazelenir.
    const handleMovementStatusChanged = () => {
      coalesce('movements', () => void invalidate(queryClient, MOVEMENTS_QUERY_KEY));
      coalesce('inventory', () => void invalidate(queryClient, INVENTORY_QUERY_KEY));
    };

    // Stok değişimi: envanter listesi ve düşük stok görünümleri tazelenir.
    const handleInventoryUpdated = () => {
      coalesce('inventory', () => void invalidate(queryClient, INVENTORY_QUERY_KEY));
    };

    // Genel bildirim: kullanıcıya seviye rengiyle gösterilir (ör. düşük stok).
    const handleNotification = (payload: NotificationPayload) => {
      const text = payload.title ? `${payload.title}: ${payload.message}` : payload.message;
      notifyRef.current(text, toAlertColor(payload.level));
    };

    socket.on(SOCKET_EVENTS.MOVEMENT_CREATED, handleMovementCreated);
    socket.on(SOCKET_EVENTS.MOVEMENT_STATUS_CHANGED, handleMovementStatusChanged);
    socket.on(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
    socket.on(SOCKET_EVENTS.NOTIFICATION, handleNotification);

    return () => {
      socket.off(SOCKET_EVENTS.MOVEMENT_CREATED, handleMovementCreated);
      socket.off(SOCKET_EVENTS.MOVEMENT_STATUS_CHANGED, handleMovementStatusChanged);
      socket.off(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
      socket.off(SOCKET_EVENTS.NOTIFICATION, handleNotification);
      // Bekleyen invalidate'ler unmount sonrası çalışmasın.
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [socket, queryClient]);
}
