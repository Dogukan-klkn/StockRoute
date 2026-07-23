import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';

/** Tam addan baş harfleri türetir (mockup: sağ üstteki yuvarlak avatar "AY"). */
function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Kullanıcının baş harflerini gösteren yuvarlak avatar. */
export function Avatar({ fullName }: { fullName: string }) {
  return (
    <View style={styles.circle} accessibilityLabel={fullName}>
      <Text style={styles.text}>{initials(fullName)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
