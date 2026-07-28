import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, FlatList, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { Phone, User } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, Avatar, SearchInput } from '../../components';
import { OperatorBottomNav } from '../../navigation/OperatorBottomNav';
import { useOperatorDrivers, type OperatorDriver } from '../../lib/operator';

const FILTERS: { label: string; status: string | null }[] = [
  { label: 'All', status: null },
  { label: 'Available', status: 'Available' },
  { label: 'On Trip', status: 'OnTrip' },
  { label: 'Off Duty', status: 'OffDuty' },
  { label: 'Inactive', status: 'Inactive' },
];

const STATUS_LABELS: Record<string, string> = {
  Available: 'Available',
  OnTrip: 'On Trip',
  OffDuty: 'Off Duty',
  Inactive: 'Inactive',
};

const fullName = (d: OperatorDriver) => `${d.first_name} ${d.last_name}`;

function initials(d: OperatorDriver) {
  return `${d.first_name?.[0] ?? ''}${d.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}

const DriverCard = ({ item }: { item: OperatorDriver }) => (
  <View style={styles.card}>
    <View style={styles.cardMain}>
      <Avatar initials={initials(item)} size={52} />
      <View style={styles.info}>
        <Text style={styles.driverName}>{fullName(item)}</Text>
        <Text style={styles.driverId}>{item.ref_id ?? item.license_number}</Text>
        {item.phone_primary ? (
          <View style={styles.statRow}>
            <Phone size={12} color={Colors.gray500} strokeWidth={2} />
            <Text style={styles.stat}>{item.phone_primary}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.rightCol}>
        <StatusBadge status={STATUS_LABELS[item.status] ?? item.status} />
      </View>
    </View>
    {item.phone_primary ? (
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.footerBtn, { borderRightWidth: 0 }]}
          activeOpacity={0.8}
          onPress={() => Linking.openURL(`tel:${item.phone_primary}`).catch(() => {})}
        >
          <Phone size={14} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.footerBtnText}>Call</Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </View>
);

const DriverListScreen = () => {
  const [activeTab, setActiveTab] = useState('Drivers');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { drivers, loading, error, refetch } = useOperatorDrivers();

  const filtered = useMemo(() => {
    const active = FILTERS.find((f) => f.label === statusFilter) ?? FILTERS[0];
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (active.status && d.status !== active.status) return false;
      if (!q) return true;
      return (
        fullName(d).toLowerCase().includes(q) ||
        (d.ref_id ?? '').toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q)
      );
    });
  }, [drivers, statusFilter, search]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drivers</Text>
        <Text style={styles.headerCount}>{drivers.length} total</Text>
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name or ID..."
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterPill, statusFilter === f.label ? styles.filterPillActive : null]}
            activeOpacity={0.8}
            onPress={() => setStatusFilter(f.label)}
          >
            <Text style={[styles.filterText, statusFilter === f.label ? styles.filterTextActive : null]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading && drivers.length > 0} onRefresh={refetch} />}
        renderItem={({ item }) => <DriverCard item={item} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing['3xl'] }} />
          ) : (
            <View style={styles.empty}>
              <User size={44} color={Colors.gray400} strokeWidth={1.6} />
              <Text style={styles.emptyText}>{error ?? 'No drivers found'}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.gray900,
  },
  headerCount: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  search: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
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
    paddingBottom: 100,
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  driverId: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stat: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.gray100,
  },
  footerBtnText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '600',
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

export default DriverListScreen;
