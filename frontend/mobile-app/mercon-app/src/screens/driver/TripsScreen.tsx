import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Building2, Calendar, ClipboardList, TriangleAlert, MapPin,
  ChevronRight, Banknote, CalendarClock, CheckCircle2,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, SearchInput } from '../../components';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { useScheduledTrips } from '../../lib/use-scheduled-trips';
import { useTripHistory } from '../../lib/use-trip-history';
import { statusLabel, stopLabel, tripService, type MobileTrip, type TripStatus } from '../../lib/trips';
import { matchesSearch } from '../../lib/search';
import { useLanguage } from '../../lib/language-context';

const TABS = ['Scheduled', 'Completed'] as const;
type Tab = typeof TABS[number];

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCharge(val?: number | string | null): string | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (Number.isNaN(n) || n <= 0) return null;
  return `SAR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface CardData {
  key: string;
  tripId: string;
  displayId: string;
  title: string;
  route: string | null;
  statusText: string;
  rawStatus: TripStatus;
  date: string;
  chargeText: string | null;
}

function toCard(t: MobileTrip): CardData {
  const dateSource = t.actual_end ?? t.planned_end ?? t.actual_start ?? t.planned_start ?? null;
  const from = stopLabel(t.stops?.find((s) => s.stop_type === 'Pickup'));
  const to = stopLabel(t.stops?.find((s) => s.stop_type === 'Dropoff'));
  return {
    key: t.id,
    tripId: t.id,
    displayId: t.ref_id ?? t.id.slice(0, 8),
    title: t.customer?.name ?? 'Unassigned customer',
    route: from && to ? `${from} → ${to}` : from || to || null,
    statusText: statusLabel(t.status),
    rawStatus: t.status,
    date: formatDate(dateSource),
    chargeText: formatCharge(t.trip_charges ?? t.billing_amount),
  };
}

const TripCard = ({ item, onPress }: { item: CardData; onPress: () => void }) => {
  const isCurrentOrActive = ['AtPickup', 'InTransit', 'AtDelivery', 'Loading'].includes(item.rawStatus);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIdRow}>
          <Text style={styles.cardId}>#{item.displayId}</Text>
          {isCurrentOrActive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>IN PROGRESS</Text>
            </View>
          )}
        </View>
        <StatusBadge status={item.statusText} />
      </View>
      <View style={styles.cardRoute}>
        <Building2 size={16} color={Colors.gray500} strokeWidth={2} />
        <Text style={styles.routeText} numberOfLines={1}>{item.title}</Text>
      </View>

      {item.route && (
        <View style={styles.cardRoute}>
          <MapPin size={16} color={Colors.primary} strokeWidth={2.2} />
          <Text style={styles.routeSubtext} numberOfLines={1}>{item.route}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={Colors.gray500} strokeWidth={2} />
            <Text style={styles.metaText}>{item.date}</Text>
          </View>
          {item.chargeText && (
            <View style={styles.chargePill}>
              <Banknote size={12} color="#065F46" strokeWidth={2.2} />
              <Text style={styles.chargeText}>{item.chargeText}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionArrow}>
          <Text style={styles.actionArrowText}>Details</Text>
          <ChevronRight size={14} color={Colors.primary} strokeWidth={2.5} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TripsScreen = ({ navigation }: any) => {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<Tab>('Scheduled');
  const [search, setSearch] = useState('');
  const { t, language } = useLanguage();

  const { trip: currentTrip, loading: loadingCurrent, refetch: refetchCurrent } = useCurrentTrip();
  const { trips: scheduledList, loading: loadingScheduled, error: errorScheduled, refetch: refetchScheduled } = useScheduledTrips();
  const { trips: historyList, loading: loadingHistory, error: errorHistory, refetch: refetchHistory } = useTripHistory();

  useFocusEffect(
    useCallback(() => {
      refetchCurrent();
      refetchScheduled();
      refetchHistory();
    }, [refetchCurrent, refetchScheduled, refetchHistory])
  );

  const loading = loadingCurrent || loadingScheduled || loadingHistory;
  const error = selectedTab === 'Scheduled' ? errorScheduled : errorHistory;

  // Merge scheduled list with current trip (if not already present and not completed)
  const scheduledTripsCombined = useMemo(() => {
    const map = new Map<string, MobileTrip>();
    scheduledList.forEach((t) => {
      if (t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Invoiced') {
        map.set(t.id, t);
      }
    });
    if (currentTrip && currentTrip.status !== 'Completed' && currentTrip.status !== 'Cancelled' && currentTrip.status !== 'Invoiced') {
      map.set(currentTrip.id, currentTrip);
    }
    return Array.from(map.values());
  }, [scheduledList, currentTrip]);

  const cards = useMemo(() => {
    const source = selectedTab === 'Scheduled' ? scheduledTripsCombined : historyList;
    return source
      .map(toCard)
      .filter((c) => matchesSearch(search, [c.displayId, c.title, c.route ?? '']));
  }, [selectedTab, scheduledTripsCombined, historyList, search]);

  const onRefresh = () => {
    refetchCurrent();
    refetchScheduled();
    refetchHistory();
  };

  const handleCardPress = (tripId: string) => {
    if (navigation?.navigate) {
      navigation.navigate('TripDetails', { tripId });
    } else {
      router.push({ pathname: '/operator/trip-details', params: { tripId } } as any);
    }
  };

  const isUrdu = language === 'ur' || language === 'ur-en';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.screenTitle}>{t('nav_trips', 'My Trips')}</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>
              {scheduledTripsCombined.length} Scheduled · {historyList.length} Completed
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by trip ID, customer, route..."
        style={styles.search}
      />

      {/* 2 Tabs: Scheduled & Completed */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'Scheduled' ? styles.tabActive : null]}
          activeOpacity={0.8}
          onPress={() => setSelectedTab('Scheduled')}
        >
          <CalendarClock size={16} color={selectedTab === 'Scheduled' ? Colors.primary : Colors.gray500} strokeWidth={2.2} />
          <Text
            style={[
              styles.tabText,
              selectedTab === 'Scheduled' ? styles.tabTextActive : null,
              isUrdu && styles.tabTextUrdu,
            ]}
            numberOfLines={1}
          >
            {t('status_scheduled', 'Scheduled')} ({scheduledTripsCombined.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'Completed' ? styles.tabActive : null]}
          activeOpacity={0.8}
          onPress={() => setSelectedTab('Completed')}
        >
          <CheckCircle2 size={16} color={selectedTab === 'Completed' ? Colors.success : Colors.gray500} strokeWidth={2.2} />
          <Text
            style={[
              styles.tabText,
              selectedTab === 'Completed' ? styles.tabTextActive : null,
              isUrdu && styles.tabTextUrdu,
            ]}
            numberOfLines={1}
          >
            {t('status_completed', 'Completed')} ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={cards}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading && cards.length > 0} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => (
          <TripCard item={item} onPress={() => handleCardPress(item.tripId)} />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading trips...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <TriangleAlert size={32} color={Colors.warning} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>Couldn't load trips</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                {selectedTab === 'Scheduled' ? (
                  <CalendarClock size={32} color={Colors.primary} strokeWidth={2} />
                ) : (
                  <CheckCircle2 size={32} color={Colors.success} strokeWidth={2} />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {selectedTab === 'Scheduled' ? 'No Scheduled Trips' : 'No Completed Trips'}
              </Text>
              <Text style={styles.emptyText}>
                {selectedTab === 'Scheduled'
                  ? 'You have no upcoming or assigned trips at this time.'
                  : 'Your trip history will appear here once you finish your assigned trips.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.gray900,
  },
  summaryBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  summaryBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.gray600,
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
    borderRadius: Radius.xl,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: Typography.sm,
    color: Colors.gray600,
    fontWeight: '700',
  },
  tabTextActive: {
    color: Colors.gray900,
  },
  tabTextUrdu: {
    fontSize: 12,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadows.sm,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardId: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  cardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  routeText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    flex: 1,
  },
  routeSubtext: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    marginTop: Spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray500,
  },
  chargePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chargeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  actionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionArrowText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  loadingText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.gray800,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TripsScreen;
