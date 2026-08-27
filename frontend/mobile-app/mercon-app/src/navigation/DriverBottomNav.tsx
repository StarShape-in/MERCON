/**
 * Driver App Bottom Navigation
 * Dark floating pill with 3 items: Home, Trips, Profile.
 * The active item is marked by an orange "capsule" (icon + label) that gently
 * settles in when the page changes; inactive items show a dim icon only.
 * Route-based (expo-router).
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { House, Truck, User, type LucideIcon } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows } from '../theme/tokens';

import { useLanguage } from '../lib/language-context';

export type DriverTab = 'Home' | 'Trips' | 'Profile';

interface DriverBottomNavProps {
  activeTab?: DriverTab | string;
  onTabPress?: (tab: DriverTab) => void;
}

const TABS: { label: DriverTab; labelKey: string; Icon: LucideIcon; route: string }[] = [
  { label: 'Home', labelKey: 'nav_home', Icon: House, route: '/' },
  { label: 'Trips', labelKey: 'nav_trips', Icon: Truck, route: '/trips' },
  { label: 'Profile', labelKey: 'nav_profile', Icon: User, route: '/profile' },
];

const INACTIVE = 'rgba(255, 255, 255, 0.65)';

export function DriverBottomNav(_props: DriverBottomNavProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();

  const isBilingual = language === 'ur-en';
  const isUrdu = language === 'ur';

  // Capsule settles in when the active page changes. Start fully visible (1) so the
  // first paint doesn't flash or hide the capsule before/during navigation.
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    anim.setValue(0.95);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 9, tension: 120 }).start();
  }, [pathname, anim]);

  const capsuleStyle = {
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange: [0.95, 1], outputRange: [0.96, 1] }) }],
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, Shadows.nav]}>
        {TABS.map(({ label, labelKey, Icon, route }) => {
          const active = route === '/' ? pathname === '/' : pathname.startsWith(route);
          return (
            <TouchableOpacity
              key={label}
              onPress={() => { if (!active) router.navigate(route as any); }}
              activeOpacity={0.7}
              style={styles.tab}
            >
              {active ? (
                <Animated.View
                  style={[
                    styles.capsule,
                    isBilingual && styles.capsuleBilingual,
                    capsuleStyle,
                  ]}
                >
                  <Icon size={isBilingual ? 18 : 20} color="#FFFFFF" strokeWidth={2.4} />
                  <Text
                    style={[
                      styles.capsuleLabel,
                      isBilingual && styles.capsuleLabelBilingual,
                      isUrdu && styles.capsuleLabelUrdu,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {t(labelKey, label)}
                  </Text>
                </Animated.View>
              ) : (
                <Icon size={24} color={INACTIVE} strokeWidth={2} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 0,
    marginBottom: -Spacing.sm, // sit low, close to the screen edge
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#3E3C3D',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FA634E',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    maxWidth: '100%',
  },
  capsuleBilingual: {
    paddingHorizontal: 8,
    gap: 4,
  },
  capsuleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  capsuleLabelUrdu: {
    fontSize: 12,
  },
  capsuleLabelBilingual: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
