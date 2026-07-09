import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, SearchInput } from '../../components';
import { OperatorBottomNav } from '../../navigation/OperatorBottomNav';

const ALL_TRIPS = [
  { id: 'TRP-2024-0891', route: 'Riyadh → Jeddah', driver: 'Ahmed Al-Rashidi', status: 'in_transit', statusLabel: 'In Transit', date: 'Today 06:00', cargo: 'Electronics (2.4T)' },
  { id: 'TRP-2024-0890', route: 'Dammam → Riyadh', driver: 'Khalid Al-Zahrani', status: 'in_transit', statusLabel: 'In Transit', date: 'Today 04:30', cargo: 'Auto Parts (1.8T)' },
  { id: 'TRP-2024-0889', route: 'Riyadh → Makkah', driver: 'Faisal Al-Ghamdi', status: 'delayed', statusLabel: 'Delayed', date: 'Today 03:00', cargo: 'FMCG (3.0T)' },
  { id: 'TRP-2024-0888', route: 'Jeddah → Madinah', driver: 'Omar Al-Shehri', status: 'scheduled', statusLabel: 'Scheduled', date: 'Tomorrow 08:00', cargo: 'Pharma (0.5T)' },
  { id: 'TRP-2024-0887', route: 'Riyadh → Dammam', driver: 'Nawaf Al-Harbi', status: 'scheduled', statusLabel: 'Scheduled', date: 'Tomorrow 10:00', cargo: 'Steel (5.2T)' },
  { id: 'TRP-2024-0886', route: 'Abha → Riyadh', driver: 'Tariq Al-Qahtani', status: 'completed', statusLabel: 'Completed', date: 'Yesterday', cargo: 'Furniture (2.1T)' },
  { id: 'TRP-2024-0885', route: 'Riyadh → Taif', driver: 'Saleh Al-Dosari', status: 'completed', statusLabel: 'Completed', date: '5 Jul 2024', cargo: 'Clothing (0.8T)' },
];

const STATUS_FILTERS = ['All', 'In Transit', 'Scheduled', 'Delayed', 'Completed'];

const TripCard = ({ item, onPress }: any) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.cardTop}>
      <Text style={styles.tripId}>#{item.id}</Text>
      <StatusBadge status={item.status} label={item.statusLabel} />
    </View>
    <Text style={styles.tripRoute}>{item.route}</Text>
    <View style={styles.cardMeta}>
      {/* TODO: replace icon placeholders with lucide-react-native */}
      <Text style={styles.metaText}>👤 {item.driver}</Text>
      <Text style={styles.metaText}>📦 {item.cargo}</Text>
    </View>
    <Text style={styles.tripDate}>📅 {item.date}</Text>
  </TouchableOpacity>
);

const TripListScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Trips');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = ALL_TRIPS.filter((t) => {
    const matchFilter =
      filter === 'All' ||
      t.statusLabel === filter;
    const matchSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.route.toLowerCase().includes(search.toLowerCase()) ||
      t.driver.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const KPI_CHIPS = [
    { label: 'Total', value: ALL_TRIPS.length.toString() },
    { label: 'In Transit', value: ALL_TRIPS.filter((t) => t.status === 'in_transit').length.toString() },
    { label: 'Scheduled', value: ALL_TRIPS.filter((t) => t.status === 'scheduled').length.toString() },
    { label: 'Delayed', value: ALL_TRIPS.filter((t) => t.status === 'delayed').length.toString() },
    { label: 'Completed', value: ALL_TRIPS.filter((t) => t.status === 'completed').length.toString() },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Trips</Text>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate('CreateTrip')}
        >
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.addBtnText}>+ New Trip</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiRow}
      >
        {KPI_CHIPS.map((chip) => (
          <View key={chip.label} style={styles.kpiChip}>
            <Text style={styles.kpiValue}>{chip.value}</Text>
            <Text style={styles.kpiLabel}>{chip.label}</Text>
          </View>
        ))}
      </ScrollView>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search trips, drivers, routes..."
        style={styles.search}
      />

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f ? styles.filterPillActive : null]}
            activeOpacity={0.8}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f ? styles.filterTextActive : null]}>
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
          <TripCard
            item={item}
            onPress={() => navigation?.navigate('TripDetails', { tripId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyText}>No trips match your filters</Text>
          </View>
        }
      />
      <OperatorBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.gray900,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtnText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '700',
  },
  kpiRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  kpiChip: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    minWidth: 70,
    ...Shadows.sm,
  },
  kpiValue: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.gray900,
  },
  kpiLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  search: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  filtersRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
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
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
    gap: Spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
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
  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  tripDate: {
    fontSize: Typography.xs,
    color: Colors.gray400,
  },
  emptyState: {
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

export default TripListScreen;
