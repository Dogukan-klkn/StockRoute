import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#2563EB' }}>
      <Tabs.Screen name="index" options={{ title: 'Stok' }} />
      <Tabs.Screen name="scan" options={{ title: 'Tara' }} />
      <Tabs.Screen name="transfers" options={{ title: 'Transferler' }} />
    </Tabs>
  );
}
