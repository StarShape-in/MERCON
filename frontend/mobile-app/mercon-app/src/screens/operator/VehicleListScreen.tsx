import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, SearchInput, Badge } from '../../components';
import { OperatorBottomNav } from '../../navigation/OperatorBottomNav';

const VEHICLES = [
  { id: 'TRK-2041', model: 'Mercedes-Benz Actros', capacity: '25,000 kg', status: 'on_trip', statusLabel: 'On Trip', docs: 4, year: 2022 },
  { id: 'TRK-2038', model: 'Volvo FH 540', capacity: '24,000 kg', status: 'available', statusLabel: 'Available', docs: 4, year: 2021 },
  { id: 'TRK-2035', model: 'MAN TGX 480', capacity: '26,000 kg', status: 'on_trip', statusLabel: 'On Trip', docs: 3, year: 2020 },
  { id: 'TRK-2030', model: 'Scania R 500', capacity: '23,000 kg', status: 'maintenance', statusLabel: 'In Service', docs: 4, year: 2019 },
  { id: 'TRK-2028', model: 'DAF XF 530', capacity: '25,000 kg', status: 'available', statusLabel: 'Available', docs: 2, year: 2021 },
  { id: 'TRK-2025', model: 'Iveco S-Way', capacity: '22,000 kg', status: 'available', statusLabel: 'Available', docs: 4, year: 2022 },
];

const VehicleCard = ({ item, onEdit }: any) => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={styles.vehicleIconBox}>
        {/* TODO: replace icon placeholders with lucide-react-native */}
        <Text style={styles.vehicleEmoji}>🚛</Text>
      </View>
      <View style={styles.vehicleInfo}>
        <View style={styles.vehicleIdRow}>
          <Text style={styles.vehicleId}>{item.id}</Text>
          <StatusBadge status={item.status} label={item.statusLabel} />
        </View>
        <Text style={styles.vehicleModel}>{item.model} · {item.year}</Text>
        <View style={styles.vehicleMeta}>
          <Text style={styles.metaText}>⚖️ {item.capacity}</Text>
          <Text style={styles.metaText}>
            📋 {item.docs}/4 docs{item.docs < 4 ? ' ⚠️' : ''}
          </Text>
        </View>
      </View>
    </View>
    <View style={styles.cardFooter}>
      <TouchableOpacity style={styles.footerBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.footerBtnText}>📋 Documents</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.footerBtnText}>📜 History</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.footerBtn, styles.footerBtnLast]} activeOpacity={0.8} onPress={onEdit}>
        <Text style={styles.editBtnText}>✏️ Edit</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const VehicleListScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('More');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const STATUS_FILTERS = ['All', 'Available', 'On Trip', 'In Service'];

  const filtered = VEHICLES.filter((v) => {
    const matchSearch =
      v.id.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || v.statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: VEHICLES.length,
    available: VEHICLES.filter((v) => v.status === 'available').length,
    onTrip: VEHICLES.filter((v) => v.status === 'on_trip').length,
    service: VEHICLES.filter((v) => v.status === 'maintenance').length,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fleet</Text>
        <Text style={styles.headerCount}>{VEHICLES.length} vehicles</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: Colors.gray900 },
          { label: 'Available', value: stats.available, color: Colors.success },
          { label: 'On Trip', value: stats.onTrip, color: Colors.primary },
          { label: 'In Service', value: stats.service, color: '#D97706' },
        ].map((s) => (
          <View key={s.label} style={styles.statBox}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by ID or model..."
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, statusFilter === f ? styles.filterPillActive : null]}
            activeOpacity={0.8}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f ? styles.filterTextActive : null]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <VehicleCard item={item} onEdit={() => {}} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyText}>No vehicles match your search</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => {}}>
        {/* TODO: replace icon placeholders with lucide-react-native */}
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <OperatorBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
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
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.gray100,
  },
  statValue: {
    fontSize: Typography.xl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 1,
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
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  vehicleIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleEmoji: {
    fontSize: 26,
  },
  vehicleInfo: {
    flex: 1,
    gap: 3,
  },
  vehicleIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleId: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
    letterSpacing: 1,
  },
  vehicleModel: {
    fontSize: Typography.sm,
    color: Colors.gray600,
  },
  vehicleMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 2,
  },
  metaText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.gray100,
  },
  footerBtnLast: {
    borderRightWidth: 0,
  },
  footerBtnText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  editBtnText: {
    fontSize: Typography.xs,
    color: Colors.gray600,
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
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.white,
    fontWeight: '300',
    lineHeight: 32,
  },
});

export default VehicleListScreen;
