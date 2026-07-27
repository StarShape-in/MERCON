import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions, Switch,
} from 'react-native';
import { ArrowLeft, Calendar, ArrowRight, Check, Bell, CircleCheck } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge } from '../../components';

const RENEWAL_ITEMS = [
  {
    id: '1',
    vehicleId: 'TRK-2041',
    docType: 'Annual Inspection',
    expiry: '25 Jul 2024',
    daysLeft: 19,
    status: 'due',
    statusLabel: 'Due Soon',
    cost: 'SAR 350',
  },
  {
    id: '2',
    vehicleId: 'TRK-2038',
    docType: 'Istimara (Registration)',
    expiry: '28 Jul 2024',
    daysLeft: 22,
    status: 'due',
    statusLabel: 'Due Soon',
    cost: 'SAR 500',
  },
  {
    id: '3',
    vehicleId: 'TRK-2035',
    docType: 'Insurance Certificate',
    expiry: '01 Jul 2024',
    daysLeft: -5,
    status: 'overdue',
    statusLabel: 'Overdue',
    cost: 'SAR 2,200',
  },
  {
    id: '4',
    vehicleId: 'TRK-2030',
    docType: 'Driving Permit',
    expiry: '10 Jul 2024',
    daysLeft: 4,
    status: 'critical',
    statusLabel: 'Critical',
    cost: 'SAR 120',
  },
  {
    id: '5',
    vehicleId: 'TRK-2025',
    docType: 'Insurance Certificate',
    expiry: '30 Jun 2025',
    daysLeft: 359,
    status: 'renewed',
    statusLabel: 'Renewed',
    cost: 'SAR 2,100',
  },
];

const FILTER_TABS = ['All', 'Due', 'Critical', 'Overdue', 'Renewed'];

const RenewalCard = ({ item }: any) => {
  const isUrgent = item.daysLeft <= 0 || item.status === 'critical';

  return (
    <View style={[styles.card, isUrgent ? styles.cardUrgent : null]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.vehicleId}>{item.vehicleId}</Text>
          <Text style={styles.docType}>{item.docType}</Text>
        </View>
        <StatusBadge status={item.status} label={item.statusLabel} />
      </View>

      <View style={styles.expiryRow}>
        <View style={styles.expiryItem}>
          <Calendar size={18} color={Colors.gray500} strokeWidth={2} />
          <View>
            <Text style={styles.expiryLabel}>Expiry Date</Text>
            <Text style={[styles.expiryDate, item.daysLeft <= 0 ? styles.overdueDate : null]}>
              {item.expiry}
            </Text>
          </View>
        </View>
        <View style={styles.daysLeftBox}>
          <Text style={[styles.daysLeftValue, item.daysLeft <= 0 ? styles.overdueDays : item.daysLeft <= 7 ? styles.criticalDays : null]}>
            {item.daysLeft <= 0 ? `${Math.abs(item.daysLeft)}d overdue` : `${item.daysLeft}d left`}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.costText}>Est. cost: {item.cost}</Text>
        {item.status !== 'renewed' && (
          <TouchableOpacity style={styles.renewBtn} activeOpacity={0.8} onPress={() => {}}>
            <Text style={styles.renewBtnText}>Renew Now</Text>
            <ArrowRight size={16} color={Colors.white} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
        {item.status === 'renewed' && (
          <View style={styles.renewedBadge}>
            <Check size={14} color={Colors.success} strokeWidth={3} />
            <Text style={styles.renewedBadgeText}>Renewed</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const VehicleRenewalScreen = ({ navigation }: any) => {
  const [filter, setFilter] = useState('All');
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const stats = {
    due: RENEWAL_ITEMS.filter((r) => r.status === 'due').length,
    critical: RENEWAL_ITEMS.filter((r) => r.status === 'critical').length,
    overdue: RENEWAL_ITEMS.filter((r) => r.status === 'overdue').length,
    renewed: RENEWAL_ITEMS.filter((r) => r.status === 'renewed').length,
  };

  const filtered = RENEWAL_ITEMS.filter(
    (r) => filter === 'All' || r.statusLabel === filter
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
          <ArrowLeft size={22} color={Colors.gray900} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Renewals</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stat Chips */}
      <View style={styles.statsRow}>
        {[
          { label: 'Due Soon', value: stats.due, color: '#D97706', bg: '#FFF7ED' },
          { label: 'Critical', value: stats.critical, color: Colors.error, bg: '#FFF5F5' },
          { label: 'Overdue', value: stats.overdue, color: Colors.error, bg: '#FFF5F5' },
          { label: 'Renewed', value: stats.renewed, color: Colors.success, bg: '#F0FDF4' },
        ].map((s) => (
          <View key={s.label} style={[styles.statChip, { backgroundColor: s.bg }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Alerts Banner */}
      <View style={styles.alertBanner}>
        <View style={styles.alertLeft}>
          <Bell size={20} color={Colors.primary} strokeWidth={2} />
          <View>
            <Text style={styles.alertTitle}>Renewal Alerts</Text>
            <Text style={styles.alertSub}>Get notified 30 days before expiry</Text>
          </View>
        </View>
        <Switch
          value={alertsEnabled}
          onValueChange={setAlertsEnabled}
          trackColor={{ false: Colors.gray300, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterPill, filter === tab ? styles.filterPillActive : null]}
            activeOpacity={0.8}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab ? styles.filterTextActive : null]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <RenewalCard item={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <CircleCheck size={44} color={Colors.success} strokeWidth={1.8} />
            <Text style={styles.emptyText}>No items in this category</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.gray900,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
  },
  placeholder: {
    width: 40,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statChip: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: Typography.xl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  alertIcon: {
    fontSize: 22,
  },
  alertTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  alertSub: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 1,
  },
  filtersRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.sm,
    color: Colors.gray600,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  cardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleId: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
    letterSpacing: 1,
  },
  docType: {
    fontSize: Typography.sm,
    color: Colors.gray600,
    marginTop: 2,
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  expiryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expiryIcon: {
    fontSize: 18,
  },
  expiryLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  expiryDate: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  overdueDate: {
    color: Colors.error,
  },
  daysLeftBox: {},
  daysLeftValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: '#D97706',
  },
  overdueDays: {
    color: Colors.error,
  },
  criticalDays: {
    color: Colors.error,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  renewBtnText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '700',
  },
  renewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  renewedBadgeText: {
    fontSize: Typography.sm,
    color: Colors.success,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.gray500,
  },
});

export default VehicleRenewalScreen;
