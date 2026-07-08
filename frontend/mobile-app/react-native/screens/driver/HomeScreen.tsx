import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Badge, Card, DarkCard } from '../../components';
import { DriverBottomNav } from '../../navigation/DriverBottomNav';

const HomeScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.driverName}>Ahmed Al-Rashidi 👋</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8} onPress={() => {}}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>

        {/* Active Job Card */}
        <DarkCard style={styles.jobCard}>
          <View style={styles.jobHeader}>
            <View>
              <Text style={styles.jobLabel}>ACTIVE TRIP</Text>
              <Text style={styles.jobId}>#TRP-2024-0891</Text>
            </View>
            <Badge label="In Transit" variant="warning" />
          </View>

          <View style={styles.routeRow}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.routeIcon}>📍</Text>
            <View style={styles.routeLine} />
            <Text style={styles.routeText}>Riyadh → Jeddah</Text>
          </View>

          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Cargo</Text>
              <Text style={styles.metaValue}>Electronics (2.4T)</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>ETA</Text>
              <Text style={styles.metaValue}>14:30 AST</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Distance</Text>
              <Text style={styles.metaValue}>950 km</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate('LiveNavigation')}
          >
            <Text style={styles.startBtnText}>▶  Continue Trip</Text>
          </TouchableOpacity>
        </DarkCard>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Trips This Month</Text>
            <Text style={styles.statTrend}>↑ +3 vs last month</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>96%</Text>
            <Text style={styles.statLabel}>On-Time Rate</Text>
            <Text style={styles.statTrend}>↑ +2% vs last month</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {[
            { icon: '🗺️', label: 'Navigate' },
            { icon: '📷', label: 'Verify' },
            { icon: '🚨', label: 'Emergency' },
            { icon: '📄', label: 'Documents' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionItem}
              activeOpacity={0.8}
              onPress={() => {}}
            >
              {/* TODO: replace icon placeholders with lucide-react-native */}
              <View style={styles.actionIcon}>
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <DriverBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  driverName: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.gray900,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  bellIcon: {
    fontSize: 20,
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  jobCard: {
    marginBottom: Spacing.lg,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  jobLabel: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    letterSpacing: 1,
    fontWeight: '600',
  },
  jobId: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  routeIcon: {
    fontSize: 16,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray700,
    marginHorizontal: Spacing.xs,
  },
  routeText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.white,
  },
  jobMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '600',
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  startBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.base,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    fontSize: Typography['2xl'],
    fontWeight: '800',
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  statTrend: {
    fontSize: Typography.xs,
    color: Colors.success,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: Typography.xs,
    color: Colors.gray600,
    fontWeight: '600',
  },
});

export default HomeScreen;
