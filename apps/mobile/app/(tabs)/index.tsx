import { StyleSheet, Text, View } from 'react-native';
import { UserRole } from '@stockroute/shared-types';
import { theme } from '@/theme';

// Gün 18 iskeleti: tema (ui-tokens) ve shared-types'ın Metro tarafından
// gerçekten bundle'a alındığını doğrulamak için her ikisini de tüketiyoruz.
// Gerçek stok listesi Gün 19'da gelecek.
export default function StockScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şube Stok</Text>
      <Text style={styles.body}>Ana ekran iskeleti.</Text>
      <Text style={styles.meta}>Roller: {Object.values(UserRole).join(', ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  body: { color: theme.colors.textSecondary },
  meta: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});
