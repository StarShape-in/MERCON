/**
 * Driver App Bottom Navigation
 * Dark floating pill with 3 items: Home, Trips, Profile
 * Active item → orange icon + orange label
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadows } from '../theme/tokens';

// Replace these with lucide-react-native or @expo/vector-icons equivalents
// import { Home, Truck, User } from 'lucide-react-native';

export type DriverTab = 'Home' | 'Trips' | 'Profile';

interface DriverBottomNavProps {
  activeTab: DriverTab | string;
  onTabPress: (tab: DriverTab) => void;
}

const TABS: { label: DriverTab; icon: string }[] = [
  { label: 'Home',    icon: '⌂' },
  { label: 'Trips',   icon: '🚛' },
  { label: 'Profile', icon: '👤' },
];

export function DriverBottomNav({ activeTab, onTabPress }: DriverBottomNavProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, Shadows.nav]}>
        {TABS.map(({ label, icon }) => {
          const active = label === activeTab;
          return (
            <TouchableOpacity
              key={label}
              onPress={() => onTabPress(label)}
              activeOpacity={0.7}
              style={styles.tab}
            >
              {/* Swap the Text below with your icon component */}
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
