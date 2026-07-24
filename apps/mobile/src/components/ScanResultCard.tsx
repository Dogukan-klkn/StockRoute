import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductUnit } from '@stockroute/shared-types';
import { theme } from '@/theme';
import type { InventoryItem, Product } from '@/lib/types';

/**
 * Ürün birimi Türkçe etiketleri — web'deki `PRODUCT_UNIT_LABELS` ile birebir
 * aynı (apps/web/src/features/products/schemas.ts). İki platform aynı ürünü
 * farklı isimlendirmesin diye kopyalandı; paylaşılan bir pakete taşınması
 * ileride değerlendirilebilir.
 */
const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  [ProductUnit.PIECE]: 'Adet',
  [ProductUnit.KG]: 'Kg',
  [ProductUnit.LITER]: 'Litre',
  [ProductUnit.BOX]: 'Koli',
  [ProductUnit.PACK]: 'Paket',
};

/** SKU için monospace font (plan §11.2) — platforma göre sistem monospace'i. */
const MONOSPACE = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

interface ScanResultCardProps {
  /** Okunan ham barkod (bulunamadı durumunda kullanıcıya gösterilir). */
  barcode: string;
  product: Product | undefined;
  /** Bu şubedeki envanter kaydı; yoksa şubede stok kaydı yok demektir. */
  inventoryItem: InventoryItem | undefined;
  isLoading: boolean;
  /** 404 — barkod bize ait bir ürüne denk gelmedi. */
  isNotFound: boolean;
  /** Ağ/sunucu hatası (404 dışı). */
  isError: boolean;
  /** Şube seçici gösteren rolde henüz şube seçilmemiş. */
  branchMissing: boolean;
  onRetry: () => void;
  onClose: () => void;
  onScanAgain: () => void;
}

/**
 * Tarama sonucu kartı (mobile-tara.png): alttan çıkan beyaz kart.
 *
 * Mockup'ta kartın altında iki buton var ama görsel kırpılmış ve etiketleri
 * okunamıyor. İkinci butonun hedefi (ürün detayı) mobil planda tanımlı
 * olmadığı için eklenmedi; yalnızca "Kapat" / "Tekrar Tara" var.
 */
export function ScanResultCard({
  barcode,
  product,
  inventoryItem,
  isLoading,
  isNotFound,
  isError,
  branchMissing,
  onRetry,
  onClose,
  onScanAgain,
}: ScanResultCardProps) {
  return (
    <View style={styles.card}>
      {isLoading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.mutedText}>Ürün aranıyor…</Text>
        </View>
      ) : isNotFound ? (
        <StatusBlock
          icon="help-circle"
          iconColor={theme.colors.warning}
          title="Ürün bulunamadı"
          description="Bu barkoda ait ürün bulunamadı."
          barcode={barcode}
        />
      ) : isError ? (
        <StatusBlock
          icon="cloud-offline"
          iconColor={theme.colors.danger}
          title="Bağlantı hatası"
          description="Ürün bilgisi alınamadı, tekrar deneyin."
          barcode={barcode}
        />
      ) : product ? (
        <FoundBlock product={product} inventoryItem={inventoryItem} branchMissing={branchMissing} />
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={onClose}>
          <Text style={styles.buttonGhostText}>Kapat</Text>
        </TouchableOpacity>
        {isError ? (
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onRetry}>
            <Text style={styles.buttonPrimaryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onScanAgain}>
            <Text style={styles.buttonPrimaryText}>Tekrar Tara</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/** Bulundu durumu: mockup'taki ✓ başlık + ürün satırı + miktar satırı. */
function FoundBlock({
  product,
  inventoryItem,
  branchMissing,
}: {
  product: Product;
  inventoryItem: InventoryItem | undefined;
  branchMissing: boolean;
}) {
  // Düşük stok kuralı stok ekranıyla birebir: quantity <= minThreshold.
  const low = inventoryItem !== undefined && inventoryItem.quantity <= inventoryItem.minThreshold;

  return (
    <>
      <View style={styles.badgeRow}>
        <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
        <Text style={styles.badgeText}>BARKOD TARANDI</Text>
      </View>

      <View style={styles.productRow}>
        <View style={styles.productIcon}>
          <Ionicons name="cube" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.productSku}>SKU: {product.sku}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {branchMissing ? (
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Bu şubedeki miktar</Text>
          <Text style={styles.quantityMissing}>Şube seçilmedi</Text>
        </View>
      ) : inventoryItem ? (
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Bu şubedeki miktar</Text>
          <View style={styles.quantityValueRow}>
            <Text style={[styles.quantityValue, low && styles.quantityValueLow]}>
              {inventoryItem.quantity}
            </Text>
            <Text style={styles.quantityUnit}>
              {PRODUCT_UNIT_LABELS[product.unit].toLowerCase()}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Bu şubedeki miktar</Text>
          <Text style={styles.quantityMissing}>Stok kaydı yok</Text>
        </View>
      )}

      {branchMissing ? (
        <Text style={styles.hintText}>Miktarı görmek için Stok sekmesinden bir şube seçin.</Text>
      ) : null}
    </>
  );
}

/** Bulunamadı / hata durumları için ortak blok (taranan barkodu da gösterir). */
function StatusBlock({
  icon,
  iconColor,
  title,
  description,
  barcode,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  barcode: string;
}) {
  return (
    <View style={styles.statusBlock}>
      <Ionicons name={icon} size={36} color={iconColor} />
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.mutedText}>{description}</Text>
      {/* Taranan değeri gösteriyoruz ki kullanıcı yanlış okumayı fark edebilsin. */}
      <Text style={styles.barcodeValue}>{barcode}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.md * 2,
    borderTopRightRadius: theme.radius.md * 2,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  centerBlock: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.textPrimary },
  productSku: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontFamily: MONOSPACE,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  quantityValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs },
  quantityValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  quantityValueLow: { color: theme.colors.danger },
  quantityUnit: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  quantityMissing: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  hintText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  statusBlock: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md },
  statusTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.textPrimary },
  mutedText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  barcodeValue: {
    fontSize: theme.fontSize.md,
    fontFamily: MONOSPACE,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xs },
  button: {
    flex: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  buttonGhost: { backgroundColor: theme.colors.background },
  buttonGhostText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  buttonPrimary: { backgroundColor: theme.colors.primary },
  buttonPrimaryText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.scanner.textPrimary,
  },
});
