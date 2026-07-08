import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Badge, StatusBadge, DarkCard, Card } from '../../components';
import { OperatorBottomNav } from '../../navigation/OperatorBottomNav';

const ACTIVE_TRIPS = [
  {
    id: 'TRP-2024-0891',
    route: 'Riyadh → Jeddah',
    driver: 'Ahmed Al-Rashidi',
    status: 'in_transit',
    statusLabel: 'In Transit',
    progress: 51,
    eta: '14:30',
  },
  {
    id: 'TRP-2024-0890',
    route: 'Dammam → Riyadh',
    driver: 'Khalid Al-Zahrani',
    status: 'in_transit',
    statusLabel: 'In Transit',
    progress: 72,
    eta: '12:15',
  },
  {
    id: 'TRP-2024-0889',
    route: 'Riyadh → Makkah',
    driver: 'Faisal Al-Ghamdi',
    status: 'delayed',
    statusLabel: 'Delayed',
    progress: 38,
    eta: '17:45',
  },
];

const TripItem = ({ item, onPress }: any) => (
  <TouchableOpacity style={styles.tripCard} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.tripCardHeader}>
      <Text style={styles.tripId}>#{item.id}</Text>
      <StatusBadge status={item.status} label={item.statusLabel} />
    </View>
    <Text style={styles.tripRoute}>{item.route}</Text>
    <Text style={styles.tripDriver}>
      {/* TODO: replace icon placeholders with lucide-react-native */}
      👤 {item.driver}
    </Text>
    <View style={styles.progressRow}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
      </View>
      <Text style={styles.progressEta}>ETA {item.eta}</Text>
    </View>
  </TouchableOpacity>
);

const OperatorHomeScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Home');

  const KPI_STATS = [
    { label: 'Active Trips', value: '12', icon: '🚛', change: '+2' },
    { label: 'Drivers On Duty', value: '18', icon: '👤', change: '+3' },
    { label: 'On-Time Rate', value: '94%', icon: '⏰', change: '+1%' },
    { label: "Today's Revenue", value: 'SAR 42K', icon: '💰', change: '+8%' },
    { label: 'Pending Tasks', value: '5', icon: '📋', change: '-2' },
  ];

  const QUICK_ACTIONS = [
    { icon: '➕', label: 'New Trip', screen: 'CreateTrip' },
    { icon: '👤', label: 'Drivers', screen: 'DriverList' },
    { icon: '🚛', label: 'Vehicles', screen: 'VehicleList' },
    { icon: '📄', label: 'Invoices', screen: 'InvoiceList' },
    { icon: '🔄', label: 'Renewals', screen: 'VehicleRenewal' },
    { icon: '📊', label: 'Reports', screen: 'Reports' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.operatorName}>Mohammed Al-Otaibi 👋</Text>
            <Text style={styles.operatorRole}>Fleet Operator · Riyadh Hub</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8} onPress={() => {}}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>

        {/* KPI Row — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
        >
          {KPI_STATS.map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <Text style={styles.kpiIcon}>{kpi.icon}</Text>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={[styles.kpiChange, kpi.change.startsWith('-') ? styles.kpiChangeNeg : null]}>
                {kpi.change}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate(action.screen)}
            >
              {/* TODO: replace icon placeholders with lucide-react-native */}
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Renewal Alert */}
        <View style={styles.renewalAlert}>
          <View style={styles.renewalAlertLeft}>
            <Text style={styles.renewalAlertIcon}>⚠️</Text>
            <View>
              <Text style={styles.renewalAlertTitle}>3 Documents Due This Week</Text>
              <Text style={styles.renewalAlertSub}>TRK-2041, TRK-2038, TRK-2035 need attention</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.renewalAlertBtn}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate('VehicleRenewal')}
          >
            <Text style={styles.renewalAlertBtnText}>Review</Text>
          </TouchableOpacity>
        </View>

        {/* Active Trips */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Active Trips</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation?.navigate('TripList')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {ACTIVE_TRIPS.map((trip) => (
          <TripItem
            key={trip.id}
            item={trip}
            onPress={() => navigation?.navigate('TripDetails', { tripId: trip.id })}
          />
        ))}
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
  kpiChange: {
    fontSize: Typography.xs,
    color: Colors.success,
    fontWeight: '700',
  },
  kpiChangeNeg: {
    color: Colors.error,
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
  seeAll: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionCard: {
    width: '30.5%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  actionIcon: {
    fontSize: 26,
  },
  actionLabel: {
    fontSize: Typography.xs,
    color: Colors.gray700,
    fontWeight: '600',
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
  renewalAlertBtn: {
    backgroundColor: '#92400E',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  renewalAlertBtnText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '700',
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: Radius.full,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  progressEta: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '600',
    flexShrink: 0,
  },
});

export default OperatorHomeScreen;
