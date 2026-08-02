import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Phone, Wallet, ArrowLeft, Plus } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Badge, SearchInput, FilterChip } from '../../components';
import { useOperatorCustomers, type OperatorCustomer } from '../../lib/operator';

const FILTERS: { label: string; active: boolean | null }[] = [
  { label: 'All', active: null },
  { label: 'Active', active: true },
  { label: 'Inactive', active: false },
];

function money(n?: number): string {
  return `SAR ${Math.round(n ?? 0).toLocaleString()}`;
}

const CustomerCard = ({ item, onPress }: { item: OperatorCustomer; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.cardTop}>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Badge
        label={item.isActive === false ? 'Inactive' : 'Active'}
        variant={item.isActive === false ? 'neutral' : 'success'}
      />
    </View>
    <View style={styles.metaRow}>
      {item.contact_phone ? (
        <View style={styles.metaItem}>
          <Phone size={13} color={Colors.gray500} strokeWidth={2} />
          <Text style={styles.metaText}>{item.contact_phone}</Text>
        </View>
      ) : null}
      <View style={styles.metaItem}>
        <Wallet size={13} color={Colors.gray500} strokeWidth={2} />
        <Text style={styles.metaText}>Credit Limit: {money(item.credit_limit)}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const CustomerListScreen = () => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const { customers, loading, error, refetch } = useOperatorCustomers();

  const filtered = useMemo(() => {
    const active = FILTERS.find((f) => f.label === activeFilter) ?? FILTERS[0];
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (active.active !== null && (c.isActive ?? true) !== active.active) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.contact_phone ?? '').toLowerCase().includes(q);
    });
  }, [customers, activeFilter, search]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.gray900} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/operator/customer-edit')}
        >
          <Plus size={22} color={Colors.white} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search customers..."
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTERS.map((f) => (
          <FilterChip
            key={f.label}
            label={f.label}
            active={activeFilter === f.label}
            onPress={() => setActiveFilter(f.label)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading && customers.length > 0} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <CustomerCard
            item={item}
            onPress={() => router.push({ pathname: '/operator/customer-edit', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing['3xl'] }} />
          ) : (
            <View style={styles.empty}>
              <Users size={44} color={Colors.gray400} strokeWidth={1.6} />
              <Text style={styles.emptyText}>{error ?? 'No customers found'}</Text>
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
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
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.base,
    color: Colors.gray500,
  },
});

export default CustomerListScreen;
