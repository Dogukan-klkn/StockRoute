import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';

/**
 * StockRoute marka kilidi — mavi kutu ikonu + "StockRoute" kelime markası.
 * İkon, app icon ile aynı marka kaynağından (assets/icon.png) gelir.
 * Mockup'taki (mobile-stok.png) üst-sol logo yerleşimiyle aynı görsel dil.
 */
export function Logo() {
  return (
    <View style={styles.row}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.icon}
        accessibilityLabel="StockRoute logosu"
      />
      <Text style={styles.wordmark}>
        Stock<Text style={styles.wordmarkAccent}>Route</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  icon: { width: 48, height: 48, borderRadius: theme.radius.md },
  wordmark: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  wordmarkAccent: { color: theme.colors.primary },
});
