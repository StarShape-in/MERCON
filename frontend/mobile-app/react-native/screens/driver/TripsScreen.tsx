import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Badge, StatusBadge, SearchInput } from '../../components';
import { DriverBottomNav } from '../../navigation/DriverBottomNav';

const TABS = ['Active', 'Upcoming', 'Completed'];

const TRIPS = [
  {
    id: 'TRP-2024-0891',
    route: 'Riyadh → Jeddah',
    driver: 'Ahmed Al-Rashidi',
    status: 'in_transit',
    statusLabel: 'In Transit',
    date: 'Today, 06:00',
    cargo: 'Electronics (2.4T)',
    tab: 'Active',
  },
  {
    id: 'TRP-2024-0890',
    route: 'Dammam → Riyadh',
    driver: 'Ahmed Al-Rashidi',
    status: 'scheduled',
    statusLabel: 'Scheduled',
    date: 'Tomorrow, 08:00',
    cargo: 'Auto Parts (1.8T)',
    tab: 'Upcoming',
  },
  {
    id: 'TRP-2024-0889',
    route: 'Riyadh → Makkah',
    driver: 'Ahmed Al-Rashidi',
    status: 'completed',
    statusLabel: 'Completed',
    date: '05 Jul 2024',
    cargo: 'FMCG (3.0T)',
    tab: 'Upcoming',
  },
  {
    id: 'TRP-2024-0885',
    route: 'Jeddah → Madinah',
    driver: 'Ahmed Al-Rashidi',
    status: 'completed',
    statusLabel: 'Completed',
    date: '02 Jul 2024',
    cargo: 'Pharmaceuticals (0.5T)',
    tab: 'Completed',
  },
  {
    id: 'TRP-2024-0880',
    route: 'Riyadh → Dammam',
    driver: 'Ahmed Al-Rashidi',
    status: 'completed',
    statusLabel: 'Completed',
    date: '28 Jun 2024',
    cargo: 'Steel Pipes (5.2T)',
    tab: 'Completed',
  },
];

const TripCard = ({ item, onPress }: any) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardId}>#{item.id}</Text>
      <StatusBadge status={item.status} label={item.statusLabel} />
    </View>
    <View style={styles.cardRoute}>
      {/* TODO: replace icon placeholders with lucide-react-native */}
      <Text style={styles.routeIcon}>🗺️</Text>
      <Text style={styles.routeText}>{item.route}</Text>
    </View>
    <View style={styles.cardMeta}>
      <View style={styles.metaItem}>
        <Text style={styles.metaIcon}>📦</Text>
        <Text style={styles.metaText}>{item.cargo}</Text>
      </View>
      <View style={styles.metaItem}>
        <Text style={styles.metaIcon}>📅</Text>
        <Text style={styles.metaText}>{item.date}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const TripsScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Trips');
  const [selectedTab, setSelectedTab] = useState('Active');
  const [search, setSearch] = useState('');

  const filtered = TRIPS.filter(
    (t) =>
      t.tab === selectedTab &&
      (t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.route.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.headerWrapper}>
        <Text style={styles.screenTitle}>My Trips</Text>
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by trip ID or route..."
        style={styles.search}
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab ? styles.tabActive : null]}
            activeOpacity={0.8}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab ? styles.tabTextActive : null]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No {selectedTab} Trips</Text>
            <Text style={styles.emptyText}>You have no {selectedTab.toLowerCase()} trips at this time.</Text>
          </View>
        }
      />
      <DriverBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  screenTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.gray900,
  },
  search: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: Colors.gray200,
    borderRadius: Radius.lg,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.gray900,
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
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardId: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  cardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  routeIcon: {
    fontSize: 16,
  },
  routeText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray700,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
  },
});

export default TripsScreen;
