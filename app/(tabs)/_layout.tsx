/**
 * Fresh — Tab Layout
 * Bottom navigation: Shop, Bulk, Basket, Orders, Profile
 * Supports dark mode via useDynamic() and i18n via t()
 */

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../src/stores/cartStore';
import { useDynamic } from '../../src/hooks/useDynamic';
import { useT } from '../../src/i18n';

type TabIconName = 'leaf' | 'grid' | 'basket' | 'receipt' | 'person';

const tabConfig: { name: string; titleKey: string; fallback: string; icon: TabIconName }[] = [
  { name: 'index', titleKey: 'tabs.shop', fallback: 'Shop', icon: 'leaf' },
  { name: 'bulk', titleKey: 'tabs.bulk', fallback: 'Bulk', icon: 'grid' },
  { name: 'cart', titleKey: 'tabs.basket', fallback: 'Basket', icon: 'basket' },
  { name: 'orders', titleKey: 'tabs.orders', fallback: 'Orders', icon: 'receipt' },
  { name: 'profile', titleKey: 'tabs.profile', fallback: 'Profile', icon: 'person' },
];

function CartBadge() {
  const items = useCartStore((s) => s.items);
  const d = useDynamic();
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  if (itemCount === 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: d.accentLight, borderColor: d.borderBright }]}>
      <Text style={[styles.badgeText, { color: d.accent }]}>{itemCount > 9 ? '9+' : itemCount}</Text>
    </View>
  );
}

export default function TabLayout() {
  const d = useDynamic();
  const t = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: d.tabActive,
        tabBarInactiveTintColor: d.tabInactive,
        tabBarStyle: [styles.tabBar, {
          backgroundColor: d.tabBg,
          borderTopColor: d.border,
        }],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {tabConfig.map((tab) => {
        let title = tab.fallback;
        try { title = t(tab.titleKey) || tab.fallback; } catch {}
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title,
              tabBarIcon: ({ color, focused }) => (
                <View>
                  <Ionicons
                    name={focused ? tab.icon : (`${tab.icon}-outline` as any)}
                    size={24}
                    color={color}
                  />
                  {tab.name === 'cart' && <CartBadge />}
                </View>
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'android' ? 10 : 24,
    height: Platform.OS === 'android' ? 64 : 84,
    ...Platform.select({
      web: { backdropFilter: 'blur(24px)' } as any,
      default: {},
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
