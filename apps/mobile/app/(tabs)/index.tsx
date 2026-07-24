import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { theme } from '@/theme';
import { useAuthStore } from '@/lib/auth-store';
import { useBranchStore } from '@/lib/branch-store';
import { useBranches, useInventory } from '@/hooks/useInventory';
import { useEffectiveBranch } from '@/hooks/useEffectiveBranch';
import { useDebounce } from '@/hooks/useDebounce';
import { isLowStock, type InventoryItem } from '@/lib/types';

export default function StockScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Seçili şube artık paylaşılan store'da: tarama ekranı (Gün 19) aynı şubeyi
  // okuyor, iki ekran çelişmiyor. Rol mantığı Gün 18'den değişmedi.
  const { canSelectBranch, ownBranch, effectiveBranchId } = useEffectiveBranch();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const setSelectedBranchId = useBranchStore((state) => state.setSelectedBranchId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const branchesQuery = useBranches(canSelectBranch);
  const inventoryQuery = useInventory(effectiveBranchId || undefined);

  const items = inventoryQuery.data ?? [];

  // Ürün araması client-side (web deseni): ad veya SKU üzerinde.
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) => it.product.name.toLowerCase().includes(q) || it.product.sku.toLowerCase().includes(q),
    );
  }, [items, debouncedSearch]);

  // İstatistikler: toplam ürün, düşük stok, kategori (product.category distinct, null hariç).
  const totalCount = items.length;
  const lowStockCount = useMemo(() => items.filter(isLowStock).length, [items]);
  const categoryCount = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.product.category) set.add(it.product.category);
    }
    return set.size;
  }, [items]);

  const selectedBranchName = canSelectBranch
    ? (branchesQuery.data?.find((b) => b.id === selectedBranchId)?.name ?? '')
    : (ownBranch?.name ?? '');

  const onLogout = () => {
    Alert.alert('Çıkış Yap', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Üst bar: logo + avatar (avatara basınca çıkış) */}
      <View style={styles.topbar}>
        <Logo />
        <TouchableOpacity onPress={onLogout} accessibilityLabel="Çıkış menüsü">
          <Avatar fullName={user?.fullName ?? ''} />
        </TouchableOpacity>
      </View>

      {/* Şube seçici (yetkili rol) veya şube adı kartı (kendi şubesi) */}
      {canSelectBranch ? (
        <Pressable style={styles.branchCard} onPress={() => setPickerOpen(true)}>
          <View style={styles.branchLeft}>
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.branchLabel}>Şube:</Text>
          </View>
          <View style={styles.branchLeft}>
            <Text style={styles.branchValue}>{selectedBranchName || 'Şube seçin'}</Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </View>
        </Pressable>
      ) : ownBranch ? (
        <View style={styles.branchCard}>
          <View style={styles.branchLeft}>
            <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.branchLabel}>Şube:</Text>
          </View>
          <Text style={styles.branchValue}>{ownBranch.name}</Text>
        </View>
      ) : null}

      {/* Arama */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ürün ara..."
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* İstatistik kartları */}
      {effectiveBranchId ? (
        <View style={styles.statsRow}>
          <StatCard value={totalCount} label="Toplam Ürün" accent />
          <StatCard value={lowStockCount} label="Düşük Stok" />
          <StatCard value={categoryCount} label="Kategori" />
        </View>
      ) : null}

      {/* Liste + durumlar */}
      <StockBody
        canSelectBranch={canSelectBranch}
        ownBranch={ownBranch}
        effectiveBranchId={effectiveBranchId}
        query={inventoryQuery}
        items={filtered}
        totalItems={items.length}
        searching={debouncedSearch.trim().length > 0}
      />

      {/* Şube seçici modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Şube Seçin</Text>
            {branchesQuery.isLoading ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={{ margin: theme.spacing.lg }}
              />
            ) : branchesQuery.data && branchesQuery.data.length > 0 ? (
              branchesQuery.data.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedBranchId(branch.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{branch.name}</Text>
                  {branch.id === selectedBranchId && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>Şube bulunamadı.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/** 3'lü istatistik kartından biri (mockup: Toplam Ürün / Düşük Stok / Kategori). */
function StatCard({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface StockBodyProps {
  canSelectBranch: boolean;
  ownBranch: { id: string; name: string } | null;
  effectiveBranchId: string;
  query: ReturnType<typeof useInventory>;
  items: InventoryItem[];
  totalItems: number;
  searching: boolean;
}

/** Liste gövdesi + tüm boş/yükleme durumları. */
function StockBody({
  canSelectBranch,
  ownBranch,
  effectiveBranchId,
  query,
  items,
  totalItems,
  searching,
}: StockBodyProps) {
  // Şubesi atanmamış kullanıcı (kendi şubesine bağlı rol ama branch=null).
  if (!canSelectBranch && !ownBranch) {
    return <EmptyState icon="business-outline" text="Hesabınıza şube atanmamış." />;
  }
  // Yetkili rol henüz şube seçmedi.
  if (!effectiveBranchId) {
    return <EmptyState icon="location-outline" text="Stok görmek için bir şube seçin." />;
  }
  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (query.isError) {
    return (
      <EmptyState icon="alert-circle-outline" text="Stok yüklenemedi. Aşağı çekip yenileyin." />
    );
  }
  // Arama sonucu boş vs stok boş — ayrı mesajlar.
  const emptyText = searching ? 'Aramanıza uygun ürün bulunamadı.' : 'Bu şubede ürün bulunmuyor.';

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
      ListHeaderComponent={
        items.length > 0 ? (
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Ürün Listesi</Text>
            <Text style={styles.listHeaderCount}>{totalItems} ürün</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={<EmptyState icon="cube-outline" text={emptyText} />}
      renderItem={({ item }) => <StockRow item={item} />}
    />
  );
}

/** Tek stok satırı (mockup: ad + SKU + nokta + miktar; düşük stok kırmızı). */
function StockRow({ item }: { item: InventoryItem }) {
  const low = isLowStock(item);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowName}>{item.product.name}</Text>
        <Text style={styles.rowSku}>SKU: {item.product.sku}</Text>
      </View>
      <View style={styles.rowRight}>
        <View
          style={[
            styles.dot,
            { backgroundColor: low ? theme.colors.danger : theme.colors.success },
          ]}
        />
        <Text style={[styles.rowQty, low && styles.rowQtyLow]}>{item.quantity}</Text>
      </View>
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
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  branchLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  branchLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  branchValue: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.textPrimary },
  statValueAccent: { color: theme.colors.primary },
  statLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: 2 },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  listHeaderTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  listHeaderCount: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  rowLeft: { flex: 1 },
  rowName: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary },
  rowSku: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowQty: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.textPrimary },
  rowQtyLow: { color: theme.colors.danger },
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
  modalBackdrop: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalRowText: { fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
});
