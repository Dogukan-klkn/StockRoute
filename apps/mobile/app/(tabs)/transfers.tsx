import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MovementStatus } from '@stockroute/shared-types';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { theme } from '@/theme';
import { useAuthStore } from '@/lib/auth-store';
import { isConnectionError } from '@/lib/api-client';
import { useEffectiveBranch } from '@/hooks/useEffectiveBranch';
import { useIncomingTransfers, useReceiveTransfer } from '@/hooks/useIncomingTransfers';
import { formatMovementDate, shortMovementId, type Movement } from '@/lib/types';

/**
 * Gelen Transferler (plan §12.2, mobile-transferler.png).
 *
 * Mobilde saha personeli YALNIZCA teslim alır: onaylama, reddetme, sevk etme,
 * iptal ve transfer oluşturma web tarafındadır. Bu yüzden mockup'taki
 * "+ Yeni Transfer" butonu ve durum filtresi chip'leri (Tümü/Beklemede/
 * Onaylandı) uygulanmadı — ekran yalnızca IN_TRANSIT (Yolda) transferleri
 * gösterir, hepsinin tek aksiyonu "Teslim Al"dır.
 */
export default function TransfersScreen() {
  const user = useAuthStore((state) => state.user);

  // Şube kaynağı stok ve tarama ekranlarıyla ortak (Gün 19 / Aşama 1).
  const { canSelectBranch, ownBranch, effectiveBranchId } = useEffectiveBranch();

  const transfersQuery = useIncomingTransfers(effectiveBranchId || undefined);
  const receiveMutation = useReceiveTransfer();

  // Hangi kartın butonu beklemede — yalnızca o kart spinner göstersin.
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const branchName = canSelectBranch
    ? (transfersQuery.data?.[0]?.destinationBranch.name ?? '')
    : (ownBranch?.name ?? '');

  const onReceive = (movement: Movement) => {
    const itemCount = movement.items.length;
    Alert.alert(
      'Teslim Al',
      `${shortMovementId(movement.id)} numaralı transfer teslim alınacak.\n` +
        `${itemCount} kalem ${movement.destinationBranch.name} stoğuna eklenecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Teslim Al',
          onPress: () => {
            setReceivingId(movement.id);
            receiveMutation.mutate(movement.id, {
              onSuccess: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
              onError: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Teslim alınamadı', 'İşlem tamamlanamadı, tekrar deneyin.');
              },
              onSettled: () => setReceivingId(null),
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <Logo />
        <Avatar fullName={user?.fullName ?? ''} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Gelen Transferler</Text>
        <Text style={styles.subtitle}>
          {branchName ? `${branchName} — teslim bekleyenler` : 'Teslim bekleyen transferler'}
        </Text>
      </View>

      <TransfersBody
        canSelectBranch={canSelectBranch}
        ownBranch={ownBranch}
        effectiveBranchId={effectiveBranchId}
        query={transfersQuery}
        receivingId={receivingId}
        onReceive={onReceive}
      />
    </SafeAreaView>
  );
}

interface TransfersBodyProps {
  canSelectBranch: boolean;
  ownBranch: { id: string; name: string } | null;
  effectiveBranchId: string;
  query: ReturnType<typeof useIncomingTransfers>;
  receivingId: string | null;
  onReceive: (movement: Movement) => void;
}

/** Liste gövdesi + tüm boş/yükleme/hata durumları (stok ekranıyla aynı desen). */
function TransfersBody({
  canSelectBranch,
  ownBranch,
  effectiveBranchId,
  query,
  receivingId,
  onReceive,
}: TransfersBodyProps) {
  if (!canSelectBranch && !ownBranch) {
    return <EmptyState icon="business-outline" text="Hesabınıza şube atanmamış." />;
  }
  if (!effectiveBranchId) {
    return <EmptyState icon="location-outline" text="Transferleri görmek için bir şube seçin." />;
  }
  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (query.isError) {
    // Sunucuya ulaşılamadı (ağ/zaman aşımı) ile sunucunun hata döndürmesi
    // kullanıcı için farklı eylemler gerektirir: ilkinde bağlantı, ikincisinde
    // tekrar deneme. Mesaj buna göre ayrışır.
    return (
      <EmptyState
        icon="cloud-offline-outline"
        text={
          isConnectionError(query.error)
            ? 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip aşağı çekerek yenileyin.'
            : 'Transferler yüklenemedi. Aşağı çekip yenileyin.'
        }
      />
    );
  }

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
      ListEmptyComponent={
        <EmptyState icon="checkmark-done-outline" text="Teslim bekleyen transfer yok." />
      }
      renderItem={({ item }) => (
        <TransferCard
          movement={item}
          receiving={receivingId === item.id}
          disabled={receivingId !== null}
          onReceive={onReceive}
        />
      )}
    />
  );
}

/**
 * Tek transfer kartı (mockup: no + durum chip'i, kaynak → hedef, aksiyon).
 *
 * Mockup kartta ürün adı ve görseli gösteriyor; ancak `GET /movements` liste
 * yanıtındaki kalemler ürün ilişkisi içermez (yalnızca productId). Ürün adı
 * uydurmamak için kartta kalem sayısı ve toplam adet gösteriliyor.
 */
function TransferCard({
  movement,
  receiving,
  disabled,
  onReceive,
}: {
  movement: Movement;
  receiving: boolean;
  disabled: boolean;
  onReceive: (movement: Movement) => void;
}) {
  const totalQuantity = movement.items.reduce((sum, item) => sum + item.quantity, 0);
  // Sevk tarihi teslim akışında asıl ilgilenilen tarih; yoksa oluşturulma.
  const date = movement.shippedAt ?? movement.createdAt;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.movementNo}>{shortMovementId(movement.id)}</Text>
        <View style={styles.statusChip}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Yolda</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <Ionicons name="business-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.routeText} numberOfLines={1}>
          {movement.sourceBranch.name}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.routeText} numberOfLines={1}>
          {movement.destinationBranch.name}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {movement.items.length} kalem · {totalQuantity} adet
        </Text>
        <Text style={styles.metaText}>{formatMovementDate(date)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.receiveButton, disabled && !receiving && styles.receiveButtonDisabled]}
        onPress={() => onReceive(movement)}
        disabled={disabled}
      >
        {receiving ? (
          <ActivityIndicator color={theme.scanner.textPrimary} />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.scanner.textPrimary} />
            <Text style={styles.receiveButtonText}>Teslim Al</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={48} color={theme.colors.textSecondary} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  header: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  title: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    flexGrow: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  movementNo: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.statusColors[MovementStatus.IN_TRANSIT],
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.statusColors[MovementStatus.IN_TRANSIT],
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  routeText: {
    flexShrink: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  receiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  receiveButtonDisabled: { opacity: 0.5 },
  receiveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.scanner.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
