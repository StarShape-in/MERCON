/**
 * Operator App Bottom Navigation
 * Dark floating pill, 4 items + centre FAB (white circle, orange plus, orange border)
 * Items: Home | Trips | [FAB] | Drivers | More
 * The active item is marked by an orange capsule behind its icon.
 */
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { House, Truck, User, Ellipsis, Plus, type LucideIcon } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows } from '../theme/tokens';

export type OperatorTab = 'Home' | 'Trips' | 'Drivers' | 'More';

interface OperatorBottomNavProps {
  activeTab: OperatorTab | string;
  onTabPress: (tab: OperatorTab) => void;
  onFabPress?: () => void;
}

const LEFT_TABS:  { label: 'Home' | 'Trips'; Icon: LucideIcon }[]   = [{ label: 'Home', Icon: House }, { label: 'Trips', Icon: Truck }];
const RIGHT_TABS: { label: 'Drivers' | 'More'; Icon: LucideIcon }[] = [{ label: 'Drivers', Icon: User }, { label: 'More', Icon: Ellipsis }];

const INACTIVE = 'rgba(255,255,255,0.55)';

export function OperatorBottomNav({ activeTab, onTabPress, onFabPress }: OperatorBottomNavProps) {
  // Capsule settles in when the active tab changes. Start fully visible (1) so the
  // first paint doesn't flash or hide the capsule before the entrance animation.
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    anim.setValue(0.95);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 9, tension: 120 }).start();
  }, [activeTab, anim]);

  const capsuleStyle = {
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange: [0.95, 1], outputRange: [0.96, 1] }) }],
  };

  const renderTab = ({ label, Icon }: { label: OperatorTab; Icon: LucideIcon }) => {
    const active = label === activeTab;
    return (
      <TouchableOpacity key={label} onPress={() => onTabPress(label)} activeOpacity={0.7} style={styles.tab}>
        {active ? (
          <Animated.View style={[styles.capsule, capsuleStyle]}>
            <Icon size={22} color={Colors.white} strokeWidth={2.4} />
          </Animated.View>
        ) : (
          <Icon size={24} color={INACTIVE} strokeWidth={2} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, Shadows.nav]}>
        {LEFT_TABS.map(renderTab)}

        {/* FAB */}
        <View style={styles.fabSlot}>
          <TouchableOpacity onPress={onFabPress} activeOpacity={0.85} style={[styles.fab, Shadows.sm]}>
            <Plus size={26} color={Colors.primary} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        {RIGHT_TABS.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: 0,
    marginBottom: -Spacing.sm, // sit low, close to the screen edge
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  capsule: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
  },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
