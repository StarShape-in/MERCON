import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge } from '../../components';
import { OperatorBottomNav } from '../../navigation/OperatorBottomNav';
import { useAuth } from '../../lib/auth-context';
import { useOperatorDashboard, type OperatorTrip } from '../../lib/operator';
import { statusLabel, type TripStatus } from '../../lib/trips';

function money(n: number): string {
  if (n >= 1000) return `SAR ${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `SAR ${Math.round(n)}`;
}

const TripItem = ({ item }: { item: OperatorTrip }) => (
  <View style={styles.tripCard}>
    <View style={styles.tripCardHeader}>
      <Text style={styles.tripId}>#{item.ref_id ?? item.id.slice(0, 8)}</Text>
      <StatusBadge status={statusLabel(item.status as TripStatus)} />
    </View>
    <Text style={styles.tripRoute}>{item.customer?.name ?? 'Customer'}</Text>
    <Text style={styles.tripDriver}>
      {/* TODO: replace icon placeholders with lucide-react-native */}
      👤 {item.driver ? `${item.driver.first_name} ${item.driver.last_name}` : 'Unassigned'}
      {item.vehicle?.plate_number ? ` · ${item.vehicle.plate_number}` : ''}
    </Text>
  </View>
);

const OperatorHomeScreen = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const { profile } = useAuth();
  const { summary, activeTrips, loading, error, refetch } = useOperatorDashboard();

  const kpis = summary?.kpis;
  const firstName = (profile?.name || 'Operator').split(' ')[0];
  const docsExpiring = kpis?.docs_expiring_soon.value ?? 0;

  const KPI_STATS = kpis
    ? [
        { label: 'Active Trips', value: String(activeTrips.length), icon: '🚛' },
        { label: 'Trips (MTD)', value: String(kpis.total_trips.value), icon: '📋' },
        { label: 'Available Drivers', value: String(kpis.active_drivers.value), icon: '👤' },
        { label: 'Fleet On Trip', value: String(kpis.fleet_on_trip.value), icon: '🛣️' },
        { label: 'Revenue (MTD)', value: money(kpis.revenue_this_month.value), icon: '💰' },
        { label: 'Docs Expiring', value: String(docsExpiring), icon: '📄' },
      ]
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading && !!summary} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.operatorName}>{firstName} 👋</Text>
            <Text style={styles.operatorRole}>Operator</Text>
          </View>
        </View>

        {loading && !summary ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : error && !summary ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            {/* KPI Row — horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiRow}>
              {KPI_STATS.map((kpi) => (
                <View key={kpi.label} style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>{kpi.icon}</Text>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Docs expiring alert */}
            {docsExpiring > 0 && (
              <View style={styles.renewalAlert}>
                <View style={styles.renewalAlertLeft}>
                  <Text style={styles.renewalAlertIcon}>⚠️</Text>
                  <View>
                    <Text style={styles.renewalAlertTitle}>{docsExpiring} document(s) expiring soon</Text>
                    <Text style={styles.renewalAlertSub}>Renewals due within the next 30 days</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Active Trips */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Active Trips</Text>
            </View>
            {activeTrips.length === 0 ? (
              <Text style={styles.emptyText}>No active trips right now.</Text>
            ) : (
              activeTrips.map((trip) => <TripItem key={trip.id} item={trip} />)
            )}
          </>
        )}
      </ScrollView>
      <OperatorBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 80,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  operatorName: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.gray900,
  },
  operatorRole: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  kpiRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  kpiCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 100,
    ...Shadows.sm,
    gap: 2,
  },
  kpiIcon: {
    fontSize: 22,
  },
  kpiValue: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.gray900,
  },
  kpiLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    textAlign: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  renewalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: Spacing.md,
  },
  renewalAlertLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  renewalAlertIcon: {
    fontSize: 20,
  },
  renewalAlertTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: '#92400E',
  },
  renewalAlertSub: {
    fontSize: Typography.xs,
    color: '#92400E',
    marginTop: 2,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
    gap: Spacing.sm,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripId: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  tripRoute: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  tripDriver: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
});

export default OperatorHomeScreen;
