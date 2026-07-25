/**
 * Driver App Bottom Navigation
 * Dark floating pill with 3 items: Home, Trips, Profile.
 * Route-based (expo-router): the active item reflects the current path.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '../theme/tokens';

export type DriverTab = 'Home' | 'Trips' | 'Profile';

interface DriverBottomNavProps {
  // Kept optional for backwards compatibility with screens that still pass them;
  // navigation is now driven by the router, so these are ignored.
  activeTab?: DriverTab | string;
  onTabPress?: (tab: DriverTab) => void;
}

const TABS: { label: DriverTab; icon: string; route: string }[] = [
  { label: 'Home',    icon: '⌂',  route: '/' },
  { label: 'Trips',   icon: '🚛', route: '/trips' },
  { label: 'Profile', icon: '👤', route: '/profile' },
];

export function DriverBottomNav(_props: DriverBottomNavProps = {}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, Shadows.nav]}>
        {TABS.map(({ label, icon, route }) => {
          const active = route === '/' ? pathname === '/' : pathname.startsWith(route);
          return (
            <TouchableOpacity
              key={label}
              onPress={() => { if (!active) router.navigate(route as any); }}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <Text style={[styles.icon, { color: active ? Colors.primary : 'rgba(255,255,255,0.45)' }]}>
                {icon}
              </Text>
              <Text style={[styles.label, { color: active ? Colors.primary : 'rgba(255,255,255,0.45)' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.navBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  icon:  { fontSize: 20 },
  label: { fontSize: 9, fontWeight: '600' },
});
