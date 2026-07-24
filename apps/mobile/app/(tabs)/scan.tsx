import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { ScannerFrame } from '@/components/ScannerFrame';
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
        />
      ) : (
        // Odak yokken kameranın yerini koyu zemin tutar (layout zıplamasın).
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
      )}

      <ScannerFrame />

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
});
