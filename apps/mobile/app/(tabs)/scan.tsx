import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ScannerFrame } from '@/components/ScannerFrame';
import { ScanResultCard } from '@/components/ScanResultCard';
import { isConnectionError } from '@/lib/api-client';
import { useEffectiveBranch } from '@/hooks/useEffectiveBranch';
import { useInventory } from '@/hooks/useInventory';
import { isNotFoundError, useProductByBarcode } from '@/hooks/useProductByBarcode';
import { theme } from '@/theme';

/**
 * Taranacak barkod formatları (Gün 19 keşfi).
 *
 * ean13/ean8/upc_a/upc_e perakende ürün barkodlarının çoğunluğu; code128/code39
 * iç depo etiketleri; itf14 koli/palet; qr ileride iç etiketleme için.
 * Liste bilinçli olarak dar tutuldu — her ek format tarama maliyetini artırır.
 */
const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'itf14',
  'qr',
] as const;

/**
 * Geliştirme tetikleyicisinin kullandığı test barkodları (yalnızca `__DEV__`).
 * Emülatörde gerçek barkod okutulamadığı için akışı bunlarla doğruluyoruz.
 */
const DEV_BARCODES = [
  { label: 'Geçerli', value: '8690637001239' },
  { label: 'Düşük stok', value: '8690637000089' },
  { label: 'Stoksuz', value: '8690637005503' },
  { label: 'Bilinmeyen', value: '0000000000000' },
] as const;

/**
 * Barkod tarama ekranı (plan §12.2, mobile-tara.png).
 *
 * Bu aşamada (Gün 19 / Aşama 1) kamera görünümü, izin akışı ve vizör overlay'i
 * yer alır; okunan barkodun ürün sorgusu ve sonuç kartı Aşama 2'de eklenir.
 *
 * Mockup'taki sol geri butonu uygulanmadı: "Tara" bir tab'dır, geri dönülecek
 * bir stack yoktur — buton işlevsiz kalırdı.
 */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Okunan barkod. Doluyken kamera dinleyicisi susar — tekrar tarama koruması.
   *
   * Bu olmadan `onBarcodeScanned` kare başına tetiklenir ve saniyede onlarca
   * istek gider. Kart kapanınca null'a döner ve tarama yeniden başlar.
   */
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  // Tab değişince kamera kapanmalı (pil + gizlilik): odak yokken CameraView
  // hiç mount edilmez, böylece donanım serbest kalır. Ekrandan ayrılırken
  // fener de söndürülür — aksi halde arkada yanık kalırdı.
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        setTorch(false);
      };
    }, []),
  );

  const { canSelectBranch, effectiveBranchId } = useEffectiveBranch();
  const productQuery = useProductByBarcode(scannedBarcode);
  // Stok ekranıyla aynı sorgu anahtarı → veri çoğu zaman cache'ten gelir,
  // "bu şubedeki miktar" ile stok listesindeki miktar daima aynı kaynaktan.
  const inventoryQuery = useInventory(effectiveBranchId || undefined);

  const product = productQuery.data;

  /**
   * Ürünün bu şubedeki envanter kaydı.
   *
   * NOT: `GET /inventory` `productId` filtresi desteklemiyor (DTO whitelist'i
   * bilinmeyen parametreyi 400'le reddediyor), bu yüzden eşleştirme şubenin
   * envanter listesi üzerinden client-side yapılıyor. Bilinen boşluk; API'ye
   * `productId` filtresi eklenmesi ileride iyileştirme olarak notlandı.
   */
  const inventoryItem = useMemo(() => {
    if (!product || !inventoryQuery.data) return undefined;
    return inventoryQuery.data.find((item) => item.productId === product.id);
  }, [product, inventoryQuery.data]);

  // Haptik geri bildirim: depo ortamında kullanıcı ekrana bakmadan sonucu anlar.
  // Her sonuç için tek titreşim — sorgu tamamlandığında bir kez.
  const feedbackGivenFor = useRef<string | null>(null);
  useEffect(() => {
    if (!scannedBarcode || productQuery.isLoading) return;
    if (feedbackGivenFor.current === scannedBarcode) return;
    feedbackGivenFor.current = scannedBarcode;

    void Haptics.notificationAsync(
      productQuery.isSuccess
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
  }, [scannedBarcode, productQuery.isLoading, productQuery.isSuccess]);

  /**
   * Okunan barkodu işler. Kameranın `onBarcodeScanned`'i de, `__DEV__`
   * tetikleyicisi de buraya girer — yani ikisi de aynı akışı çalıştırır.
   * Sadece barkod değerini alır; kameranın geometri alanlarına (cornerPoints,
   * bounds) ihtiyaç yok.
   */
  const handleBarcodeScanned = useCallback((barcode: string) => {
    // Zaten bir sonuç açıkken yeni okuma alma (çift koruma: state + guard).
    setScannedBarcode((current) => current ?? barcode);
  }, []);

  const handleCameraScan = useCallback(
    (result: BarcodeScanningResult) => handleBarcodeScanned(result.data),
    [handleBarcodeScanned],
  );

  const closeResult = useCallback(() => {
    setScannedBarcode(null);
    feedbackGivenFor.current = null;
  }, []);

  // İzin durumu henüz okunmadı — bir kare "izin yok" ekranı yanıp sönmesin.
  if (!permission) {
    return (
      <ScannerScaffold>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScannerScaffold>
    );
  }

  if (!permission.granted) {
    // canAskAgain false ise sistem diyaloğu bir daha açılmaz (iOS'ta ilk retten
    // sonra kalıcı) → kullanıcıyı uygulama ayarlarına yönlendiriyoruz.
    const canAsk = permission.canAskAgain;
    return (
      <ScannerScaffold>
        <View style={styles.center}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Kamera izni gerekiyor</Text>
          <Text style={styles.permissionText}>
            {canAsk
              ? 'Barkod okutmak için kameraya erişmemiz gerekiyor.'
              : 'Kamera izni reddedildi. Barkod okutmak için Ayarlar’dan kamera iznini açın.'}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => (canAsk ? requestPermission() : Linking.openSettings())}
          >
            <Text style={styles.permissionButtonText}>
              {canAsk ? 'Kamera İznine İzin Ver' : 'Ayarlar’ı Aç'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScannerScaffold>
    );
  }

  return (
    <View style={styles.root}>
      {isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          // Sonuç açıkken handler'ı hiç bağlama: kamera kare başına tetiklemesin.
          onBarcodeScanned={scannedBarcode ? undefined : handleCameraScan}
        />
      ) : (
        // Odak yokken kameranın yerini koyu zemin tutar (layout zıplamasın).
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
      )}

      <ScannerFrame active={!scannedBarcode} />

      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        <View style={styles.header}>
          {/* Sol taraf boş: geri butonu tab navigasyonunda uygulanmadı. */}
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Barkod Tara</Text>
          <TouchableOpacity
            style={[styles.headerButton, torch && styles.headerButtonActive]}
            onPress={() => setTorch((value) => !value)}
            accessibilityLabel={torch ? 'Feneri kapat' : 'Feneri aç'}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-outline'}
              size={20}
              color={torch ? theme.colors.primary : theme.scanner.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/*
        Geliştirme tetikleyicisi: emülatörde kamera gerçek bir barkod okuyamaz
        (sanal sahne). Bu buton `handleBarcodeScanned`'i — kameranın çağıracağı
        fonksiyonun aynısını — çağırarak sonrasındaki tüm akışın test edilmesini
        sağlar. `__DEV__` guard'ı sayesinde production bundle'a girmez.
      */}
      {__DEV__ && !scannedBarcode ? (
        <View style={styles.devBar} pointerEvents="box-none">
          {DEV_BARCODES.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.devButton}
              onPress={() => handleBarcodeScanned(item.value)}
            >
              <Text style={styles.devButtonText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {scannedBarcode ? (
        <View style={styles.resultWrap} pointerEvents="box-none">
          <ScanResultCard
            barcode={scannedBarcode}
            product={productQuery.data}
            inventoryItem={inventoryItem}
            isLoading={productQuery.isLoading}
            isNotFound={isNotFoundError(productQuery.error)}
            isError={productQuery.isError && !isNotFoundError(productQuery.error)}
            isConnectionIssue={isConnectionError(productQuery.error)}
            branchMissing={canSelectBranch && !effectiveBranchId}
            onRetry={() => productQuery.refetch()}
            onClose={closeResult}
            onScanAgain={closeResult}
          />
        </View>
      ) : null}
    </View>
  );
}

/** İzin/yükleme ekranları için koyu zeminli kabuk (kamera yokken). */
function ScannerScaffold({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.scaffold} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Barkod Tara</Text>
        <View style={styles.headerSpacer} />
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.scanner.background },
  scaffold: { flex: 1, backgroundColor: theme.scanner.background },
  cameraPlaceholder: { backgroundColor: theme.scanner.background },
  headerSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.scanner.textPrimary,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.scanner.controlBackground,
  },
  headerButtonActive: { backgroundColor: theme.scanner.textPrimary },
  headerSpacer: { width: 40, height: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.scanner.controlBackground,
    marginBottom: theme.spacing.sm,
  },
  permissionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.scanner.textPrimary,
  },
  permissionText: {
    fontSize: theme.fontSize.md,
    color: theme.scanner.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  permissionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.scanner.textPrimary,
  },
  resultWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  devBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  devButton: {
    backgroundColor: theme.scanner.dim,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  devButtonText: { fontSize: theme.fontSize.xs, color: theme.scanner.textSecondary },
});
