import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { COLORS, FONTS } from '@/constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{
        fontFamily: focused ? FONTS.semiBold : FONTS.regular,
        fontSize: 10,
        color: focused ? COLORS.primary : COLORS.textMuted,
      }}>{label}</Text>
    </View>
  );
}

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          height: 70,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📦" label="طلبي" focused={focused} /> }}
      />
      <Tabs.Screen
        name="order/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="حسابي" focused={focused} /> }}
      />
    </Tabs>
  );
}
