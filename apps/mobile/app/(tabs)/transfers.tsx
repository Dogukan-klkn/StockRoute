import { StyleSheet, Text, View } from 'react-native';

export default function TransfersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gelen Transferler</Text>
      <Text>Transfer teslim alma ekranı iskeleti.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
});
