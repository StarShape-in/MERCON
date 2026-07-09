import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, SearchInput } from '../../components';
import { OperatorBottomNav } from '../../navigation/OperatorBottomNav';

const INVOICES = [
  {
    id: 'INV-2024-0445',
    customer: 'Saudi Electronics Co.',
    tripId: 'TRP-2024-0891',
    amount: 'SAR 4,200',
    status: 'pending',
    statusLabel: 'Pending',
    date: '6 Jul 2024',
    due: '13 Jul 2024',
  },
  {
    id: 'INV-2024-0444',
    customer: 'Al-Jazeera Trading',
    tripId: 'TRP-2024-0890',
    amount: 'SAR 3,600',
    status: 'paid',
    statusLabel: 'Paid',
    date: '5 Jul 2024',
    due: '12 Jul 2024',
  },
  {
    id: 'INV-2024-0443',
    customer: 'Gulf Auto Parts',
    tripId: 'TRP-2024-0889',
    amount: 'SAR 5,850',
    status: 'overdue',
    statusLabel: 'Overdue',
    date: '28 Jun 2024',
    due: '5 Jul 2024',
  },
  {
    id: 'INV-2024-0442',
    customer: 'Aramco Supply Chain',
    tripId: 'TRP-2024-0888',
    amount: 'SAR 12,400',
    status: 'paid',
    statusLabel: 'Paid',
    date: '25 Jun 2024',
    due: '2 Jul 2024',
  },
  {
    id: 'INV-2024-0441',
    customer: 'Saudi Pharma Group',
    tripId: 'TRP-2024-0887',
    amount: 'SAR 2,100',
    status: 'pending',
    statusLabel: 'Pending',
    date: '20 Jun 2024',
    due: '27 Jun 2024',
  },
  {
    id: 'INV-2024-0440',
    customer: 'Riyadh Steel Co.',
    tripId: 'TRP-2024-0886',
    amount: 'SAR 8,750',
    status: 'draft',
    statusLabel: 'Draft',
    date: '18 Jun 2024',
    due: '25 Jun 2024',
  },
];

const InvoiceCard = ({ item, onPress }: any) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
    <View style={styles.cardTop}>
      <View>
        <Text style={styles.invoiceId}>{item.id}</Text>
        <Text style={styles.customer}>{item.customer}</Text>
      </View>
      <View style={styles.amountCol}>
        <Text style={styles.amount}>{item.amount}</Text>
        <StatusBadge status={item.status} label={item.statusLabel} />
      </View>
    </View>
    <View style={styles.cardMeta}>
      {/* TODO: replace icon placeholders with lucide-react-native */}
      <Text style={styles.metaText}>🚛 {item.tripId}</Text>
      <Text style={styles.metaText}>📅 Issued: {item.date}</Text>
      <Text style={[styles.metaText, item.status === 'overdue' ? styles.overdueText : null]}>
        ⏰ Due: {item.due}
      </Text>
    </View>
    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.actionBtnText}>👁 View</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.actionBtnText}>↓ Download</Text>
      </TouchableOpacity>
      {item.status === 'pending' || item.status === 'overdue' ? (
        <TouchableOpacity style={styles.sendBtn} activeOpacity={0.8} onPress={() => {}}>
          <Text style={styles.sendBtnText}>📨 Send</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  </TouchableOpacity>
);

const InvoiceListScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('More');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const STATUS_FILTERS = ['All', 'Pending', 'Paid', 'Overdue', 'Draft'];

  const filtered = INVOICES.filter((inv) => {
    const matchSearch =
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.toLowerCase().includes(search.toLowerCase()) ||
      inv.tripId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || inv.statusLabel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = INVOICES.reduce((sum, inv) => {
    const num = parseFloat(inv.amount.replace('SAR ', '').replace(',', ''));
    return sum + num;
  }, 0);

  const STAT_CARDS = [
    { label: 'Total Invoices', value: INVOICES.length.toString(), icon: '📄', color: Colors.gray900 },
    { label: 'Pending', value: INVOICES.filter((i) => i.status === 'pending').length.toString(), icon: '⏳', color: '#D97706' },
    { label: 'Overdue', value: INVOICES.filter((i) => i.status === 'overdue').length.toString(), icon: '🚨', color: Colors.error },
    { label: 'Total Value', value: `SAR ${(totalAmount / 1000).toFixed(0)}K`, icon: '💰', color: Colors.success },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invoices</Text>
        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Stat Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
        {STAT_CARDS.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search invoices, customers..."
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
          <InvoiceCard item={item} onPress={() => {}} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No invoices found</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <OperatorBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
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
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  createBtnText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '700',
  },
  statsRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 90,
    ...Shadows.sm,
    gap: 2,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: Typography.lg,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    textAlign: 'center',
  },
  search: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
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
    padding: Spacing.lg,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceId: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: Colors.gray900,
  },
  customer: {
    fontSize: Typography.xs,
    color: Colors.gray600,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amount: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  overdueText: {
    color: Colors.error,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: Typography.xs,
    color: Colors.gray600,
    fontWeight: '600',
  },
  sendBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  sendBtnText: {
    fontSize: Typography.xs,
    color: Colors.white,
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

export default InvoiceListScreen;
