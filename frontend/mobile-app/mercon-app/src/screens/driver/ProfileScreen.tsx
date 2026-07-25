import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Avatar, Badge } from '../../components';
import { DriverBottomNav } from '../../navigation/DriverBottomNav';
import { useAuth } from '../../lib/auth-context';
import { useProfile } from '../../lib/use-profile';
import { initialsOf } from '../../lib/profile';

const SETTING_ROWS: { icon: string; label: string; value?: string; arrow?: boolean; route?: string }[] = [
  { icon: '🔔', label: 'Notifications', route: '/notifications', arrow: true },
  { icon: '🌐', label: 'Language', value: 'English', arrow: true },
  { icon: '🔒', label: 'Privacy Policy', arrow: true },
  { icon: '📖', label: 'About MERCON', arrow: true },
  { icon: '❓', label: 'Help & Support', arrow: true },
];

function statusVariant(status: string): 'success' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'Available': return 'success';
    case 'OnTrip': return 'info';
    case 'Suspended': return 'warning';
    default: return 'neutral';
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const ProfileScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Profile');
  const router = useRouter();
  const { profile: authProfile, signOut } = useAuth();
  const { profile, loading, error } = useProfile();

  const name = profile?.name ?? authProfile?.name ?? 'Driver';
  const refId = profile?.ref_id ?? authProfile?.ref_id ?? '—';
  const status = profile?.status ?? authProfile?.status ?? '';

  const details = profile
    ? [
        { icon: '🪪', label: 'License No.', value: profile.license_number },
        { icon: '📆', label: 'License Expiry', value: formatDate(profile.license_expiry) },
        { icon: '📞', label: 'Phone', value: profile.phone_primary ?? '—' },
        {
          icon: '🚛',
          label: 'Assigned Vehicle',
          value: profile.current_vehicle?.plate_number ?? 'None (no active trip)',
        },
        { icon: '🗓️', label: 'Member Since', value: formatDate(profile.createdAt) },
      ]
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Hero */}
        <View style={styles.hero}>
          <Avatar initials={initialsOf(name)} size={80} style={styles.avatar} />
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.driverId}>{refId}</Text>
          {!!status && <Badge label={status} variant={statusVariant(status)} />}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: '📄', label: 'Documents', route: '/documents' },
            { icon: '🚛', label: 'Vehicle', route: '/vehicle' },
            { icon: '⚙️', label: 'Settings', route: '/settings' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => router.push(action.route as any)}
            >
              <Text style={styles.quickIcon}>{action.icon}</Text>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Driver Details */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Driver Details</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : error ? (
            <Text style={{ color: Colors.error, fontSize: Typography.sm }}>{error}</Text>
          ) : (
            details.map((row, i) => (
              <View
                key={row.label}
                style={[styles.settingRow, i < details.length - 1 ? styles.settingRowBorder : null]}
              >
                <View style={styles.settingLeft}>
                  {/* TODO: replace icon placeholders with lucide-react-native */}
                  <Text style={styles.settingIcon}>{row.icon}</Text>
                  <Text style={styles.settingLabel}>{row.label}</Text>
                </View>
                <Text style={styles.settingValue}>{row.value}</Text>
              </View>
            ))
          )}
        </View>

        {/* Settings Rows */}
        <View style={styles.settingsCard}>
          {SETTING_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.settingRow, i < SETTING_ROWS.length - 1 ? styles.settingRowBorder : null]}
              activeOpacity={0.8}
              onPress={() => row.route && router.push(row.route as any)}
            >
              <View style={styles.settingLeft}>
                {/* TODO: replace icon placeholders with lucide-react-native */}
                <Text style={styles.settingIcon}>{row.icon}</Text>
                <Text style={styles.settingLabel}>{row.label}</Text>
              </View>
              <View style={styles.settingRight}>
                {row.value && <Text style={styles.settingValue}>{row.value}</Text>}
                {row.arrow && <Text style={styles.chevron}>›</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={() => signOut()}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MERCON Driver App</Text>
      </ScrollView>
      <DriverBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 80,
  },
  hero: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  avatar: {
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: 2,
  },
  driverId: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  quickIcon: {
    fontSize: 28,
  },
  quickLabel: {
    fontSize: Typography.xs,
    color: Colors.gray600,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  settingsCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingLabel: {
    fontSize: Typography.sm,
    color: Colors.gray900,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingValue: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    flexShrink: 1,
    textAlign: 'right',
  },
  chevron: {
    fontSize: 20,
    color: Colors.gray400,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginBottom: Spacing.lg,
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginBottom: Spacing.xl,
  },
});

export default ProfileScreen;
