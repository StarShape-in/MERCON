/**
 * Operator App Bottom Navigation
 * Dark floating pill, 4 items + centre FAB (white circle, orange plus, orange border)
 * Items: Home | Trips | [FAB] | Drivers | More
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadows } from '../theme/tokens';

export type OperatorTab = 'Home' | 'Trips' | 'Drivers' | 'More';

interface OperatorBottomNavProps {
  activeTab: OperatorTab | string;
  onTabPress: (tab: OperatorTab) => void;
  onFabPress?: () => void;
}

const LEFT_TABS:  { label: 'Home' | 'Trips'; icon: string }[]     = [{ label: 'Home', icon: '⌂' }, { label: 'Trips', icon: '🚛' }];
const RIGHT_TABS: { label: 'Drivers' | 'More'; icon: string }[]   = [{ label: 'Drivers', icon: '👤' }, { label: 'More', icon: '⋯' }];

export function OperatorBottomNav({ activeTab, onTabPress, onFabPress }: OperatorBottomNavProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, Shadows.nav]}>
        {/* Left tabs */}
        {LEFT_TABS.map(({ label, icon }) => {
          const active = label === activeTab;
          return (
            <TouchableOpacity key={label} onPress={() => onTabPress(label)} activeOpacity={0.7} style={styles.tab}>
              <Text style={[styles.icon, { color: active ? Colors.primary : 'rgba(255,255,255,0.45)' }]}>{icon}</Text>
              <Text style={[styles.label, { color: active ? Colors.primary : 'rgba(255,255,255,0.45)' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* FAB */}
        <View style={styles.fabSlot}>
          <TouchableOpacity onPress={onFabPress} activeOpacity={0.85} style={[styles.fab, Shadows.sm]}>
            <Text style={styles.fabIcon}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* Right tabs */}
        {RIGHT_TABS.map(({ label, icon }) => {
          const active = label === activeTab;
          return (
            <TouchableOpacity key={label} onPress={() => onTabPress(label)} activeOpacity={0.7} style={styles.tab}>
              <Text style={[styles.icon, { color: active ? Colors.primary : 'rgba(255,255,255,0.45)' }]}>{icon}</Text>
              <Text style={[styles.label, { color: active ? Colors.primary : 'rgba(255,255,255,0.45)' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  icon:    { fontSize: 18 },
  label:   { fontSize: 9, fontWeight: '600' },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: { fontSize: 22, color: Colors.primary, fontWeight: '700', lineHeight: 24 },
});
