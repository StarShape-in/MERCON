import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Avatar, Card } from '../../components';
import { DriverBottomNav } from '../../navigation/DriverBottomNav';

const SETTING_ROWS = [
  { icon: '🔔', label: 'Notifications', arrow: true },
  { icon: '🌐', label: 'Language', value: 'English', arrow: true },
  { icon: '🔒', label: 'Privacy Policy', arrow: true },
  { icon: '📖', label: 'About MERCON', arrow: true },
  { icon: '❓', label: 'Help & Support', arrow: true },
];

const ProfileScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Profile');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Hero */}
        <View style={styles.hero}>
          <Avatar initials="AK" size={80} style={styles.avatar} />
          <Text style={styles.name}>Ahmed Al-Rashidi</Text>
          <Text style={styles.driverId}>DRV-2024-0112</Text>
          <View style={styles.ratingRow}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>4.9</Text>
            <Text style={styles.ratingCount}>· 243 trips</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={() => {}}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: '📄', label: 'Documents', screen: 'Documents' },
            { icon: '🚛', label: 'Vehicle', screen: 'AssignedVehicle' },
            { icon: '⚙️', label: 'Settings', screen: 'Settings' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate(action.screen)}
            >
              <Text style={styles.quickIcon}>{action.icon}</Text>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Performance This Month</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Trips', value: '24' },
              { label: 'On-Time', value: '96%' },
              { label: 'Distance', value: '12,450 km' },
              { label: 'Earnings', value: 'SAR 9,840' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings Rows */}
        <View style={styles.settingsCard}>
          {SETTING_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.settingRow, i < SETTING_ROWS.length - 1 ? styles.settingRowBorder : null]}
              activeOpacity={0.8}
              onPress={() => {}}
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
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={() => {}}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MERCON Driver App v2.1.0</Text>
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  star: {
    fontSize: 16,
    color: '#F59E0B',
  },
  rating: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  ratingCount: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  editBtnText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '700',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statBox: {
    width: '47%',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  statValue: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
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
