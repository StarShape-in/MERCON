import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, Avatar, SearchInput } from '../../components';
import { OperatorBottomNav } from '../../navigation/OperatorBottomNav';

const DRIVERS = [
  { id: 'DRV-0112', name: 'Ahmed Al-Rashidi', trips: 243, rating: 4.9, status: 'on_trip', statusLabel: 'On Trip', phone: '+966 50 123 4567' },
  { id: 'DRV-0147', name: 'Khalid Al-Zahrani', trips: 312, rating: 4.9, status: 'available', statusLabel: 'Available', phone: '+966 55 234 5678' },
  { id: 'DRV-0089', name: 'Faisal Al-Ghamdi', trips: 178, rating: 4.7, status: 'on_trip', statusLabel: 'On Trip', phone: '+966 56 345 6789' },
  { id: 'DRV-0201', name: 'Omar Al-Shehri', trips: 95, rating: 4.8, status: 'off_duty', statusLabel: 'Off Duty', phone: '+966 50 456 7890' },
  { id: 'DRV-0167', name: 'Nawaf Al-Harbi', trips: 134, rating: 4.6, status: 'available', statusLabel: 'Available', phone: '+966 55 567 8901' },
  { id: 'DRV-0223', name: 'Tariq Al-Qahtani', trips: 67, rating: 4.5, status: 'available', statusLabel: 'Available', phone: '+966 56 678 9012' },
  { id: 'DRV-0189', name: 'Saleh Al-Dosari', trips: 201, rating: 4.8, status: 'on_trip', statusLabel: 'On Trip', phone: '+966 50 789 0123' },
];

const DriverCard = ({ item, onEdit }: any) => (
  <View style={styles.card}>
    <View style={styles.cardMain}>
      <Avatar initials={item.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)} size={52} />
      <View style={styles.info}>
        <Text style={styles.driverName}>{item.name}</Text>
        <Text style={styles.driverId}>{item.id}</Text>
        <View style={styles.statsRow}>
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.stat}>🚛 {item.trips} trips</Text>
          <Text style={styles.stat}>★ {item.rating}</Text>
        </View>
      </View>
      <View style={styles.rightCol}>
        <StatusBadge status={item.status} label={item.statusLabel} />
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={onEdit}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
    <View style={styles.cardFooter}>
      <TouchableOpacity style={styles.footerBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.footerBtnText}>📞 Call</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.footerBtnText}>💬 Message</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.footerBtnText}>📋 View Trips</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const DriverListScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Drivers');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const STATUS_FILTERS = ['All', 'Available', 'On Trip', 'Off Duty'];

  const filtered = DRIVERS.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || d.statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drivers</Text>
        <Text style={styles.headerCount}>{DRIVERS.length} total</Text>
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name or ID..."
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
          <DriverCard item={item} onEdit={() => {}} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No drivers found</Text>
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  editBtn: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  editBtnText: {
    fontSize: Typography.xs,
    color: Colors.gray600,
    fontWeight: '600',
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

export default DriverListScreen;
