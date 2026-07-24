import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { theme } from '@/theme';

/**
 * Vizör ölçüleri (mobile-tara.png'den ölçülerek): genişlik ekranın ~%63'ü,
 * yükseklik genişliğin ~%47'si (yatay dikdörtgen — barkod yatay okunur).
 */
const FRAME_WIDTH_RATIO = 0.63;
const FRAME_ASPECT = 0.47;
/**
 * Vizörün dikey konumu: mockup'ta tam ortada değil, hafif yukarıda durur —
 * altta sonuç kartına yer kalsın diye (kart açıldığında vizör kapanmamalı).
 */
const FRAME_CENTER_RATIO = 0.42;
/** Köşe göstergelerinin kol uzunluğu ve kalınlığı. */
const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

interface ScannerFrameProps {
  /** Sonuç kartı açıkken tarama çizgisi durur (okuma bitti sinyali). */
  active?: boolean;
}

/**
 * Kamera üzerindeki vizör (mobile-tara.png): 4 köşe göstergesi + süzülen
 * tarama çizgisi. Tam çerçeve çizgisi yoktur, mockup'ta yalnızca köşeler var.
 *
 * Animasyon `useNativeDriver: true` ile çalışır: kamera feed'i akarken JS
 * thread'ini bloklamamak için translate/opacity native tarafta sürülür.
 */
export function ScannerFrame({ active = true }: ScannerFrameProps) {
  const { width, height } = useWindowDimensions();
  const frameWidth = width * FRAME_WIDTH_RATIO;
  const frameHeight = frameWidth * FRAME_ASPECT;
  // Ortalamaya göre yukarı kaydırma miktarı (mockup konumu).
  const offsetY = height * (0.5 - FRAME_CENTER_RATIO);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.stopAnimation();
      return;
    }
    // Yukarı-aşağı süzülen çizgi; sonsuz döngü.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frameHeight - CORNER_WIDTH],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={{ width: frameWidth, height: frameHeight, marginBottom: offsetY * 2 }}>
        {/* Köşe göstergeleri — her biri iki kenarı boyalı bir kutu. */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {active ? (
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: theme.colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: theme.radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: theme.radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: theme.radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: theme.radius.md,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CORNER_WIDTH,
    borderRadius: CORNER_WIDTH,
    backgroundColor: theme.colors.primary,
  },
});
