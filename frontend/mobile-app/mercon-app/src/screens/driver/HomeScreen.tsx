import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ImageBackground,
  StyleSheet, StatusBar, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, Hand, Siren, Globe, Clock } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Badge, DarkCard, DelayReportModal } from '../../components';
import { useAuth } from '../../lib/auth-context';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, NEXT_STEP, PHOTO_FOR, statusLabel, stopAddress, stopLabel, type TripStatus } from '../../lib/trips';
import { choosePhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';
import { useLanguage } from '../../lib/language-context';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const homeBg = require('../../../assets/images/home-bg.png');

/** Badge colour by trip status. */
function statusVariant(s: TripStatus): 'warning' | 'success' | 'info' | 'neutral' {
  if (s === 'InTransit') return 'warning';
  if (s === 'Completed') return 'success';
  if (s === 'AtPickup' || s === 'AtDelivery') return 'info';
  return 'neutral';
}

/** Short "27 Jul, 14:30" label, or a fallback when there's no timestamp. */
function shortWhen(iso?: string | null, fallback = 'Scheduled'): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const HomeScreen = () => {
  const { profile, signOut } = useAuth();
  const { trip, loading, error, refetch, setTrip } = useCurrentTrip();
  const { language, openLanguageModal, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('Home');
  const [advancing, setAdvancing] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const router = useRouter();

  // Refresh the trip whenever Home regains focus (e.g. returning from a step screen).
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const firstName = (profile?.name || 'Driver').split(' ')[0];

  const next = trip ? NEXT_STEP[trip.status] : undefined;
  const pickupStop = trip?.stops?.find((s) => s.stop_type === 'Pickup') ?? null;
  const dropoffStop = trip?.stops?.find((s) => s.stop_type === 'Dropoff') ?? null;

  const langTag = language === 'en' ? 'EN' : language === 'ur' ? 'اردو' : 'اردو / EN';

  const doAdvance = async () => {
    if (!trip || !next) return;
    const photoKind = PHOTO_FOR[next.to];
    setAdvancing(true);
    try {
      // Some transitions require a photo first (cargo before In Transit, POD before Completed).
      if (photoKind) {
        const photo = await choosePhoto();
        if (!photo) { setAdvancing(false); return; } // user cancelled the camera
        await tripService.uploadPhoto(trip.id, photoKind, photo);
      }
      const updated = await tripService.updateStatus(trip.id, next.to);
      // Completed trips drop out of "current", so clear the card.
      setTrip(updated.status === 'Completed' ? null : updated);
    } catch (e) {
      Alert.alert('Could not update', getApiErrorMessage(e));
    } finally {
      setAdvancing(false);
    }
  };

  const advance = () => {
    if (!trip || !next) return;
    // The pickup and arrival steps have their own screens.
    if (trip.status === 'Scheduled' || trip.status === 'Draft') { router.push('/trip/navigate'); return; }
    if (trip.status === 'Loading' || trip.status === 'AtPickup') { router.push('/trip/pickup'); return; }
    if (trip.status === 'InTransit' || trip.status === 'AtDelivery' || trip.status === 'Delayed' || trip.status === 'Emergency') { router.push('/trip/delivery'); return; }
    const photoKind = PHOTO_FOR[next.to];
    const msg = photoKind
      ? `You'll take a ${photoKind === 'pod' ? 'delivery (POD)' : 'cargo'} photo, then mark the trip as "${statusLabel(next.to)}".`
      : `Mark this trip as "${statusLabel(next.to)}"?`;
    Alert.alert('Confirm', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: doAdvance },
    ]);
  };

  return (
    <ImageBackground source={homeBg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('title_welcome_back', 'Welcome back,')}</Text>
            <View style={styles.nameRow}>
              <Text style={styles.driverName}>{firstName}</Text>
              <Hand size={20} color="#F5A623" strokeWidth={2.2} />
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openLanguageModal} activeOpacity={0.8} style={styles.langPill}>
              <Globe size={15} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.langPillText}>{langTag}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/trip/emergency')}
              activeOpacity={0.7}
              style={styles.sosBtn}
            >
              <Siren size={16} color={Colors.white} strokeWidth={2.4} />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} activeOpacity={0.7} style={styles.signOutBtn}>
              <Text style={styles.signOutText}>{t('action_logout', 'Sign out')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active trip — centered in the remaining page space, whichever state renders */}
        <View style={styles.tripSection}>
          {loading && !trip ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={refetch}><Text style={styles.retryText}>Tap to retry</Text></TouchableOpacity>
            </View>
          ) : !trip ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('msg_no_active_trips', 'No active trip')}</Text>
              <Text style={styles.emptySub}>{t('msg_all_caught_up', "You're all caught up. Waiting for your next assignment.")}</Text>
            </View>
          ) : (
            <DarkCard style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobHeaderLeft}>
                  <Text style={styles.jobLabel}>{t('title_current_trip', 'ACTIVE TRIP')}</Text>
                  <Text style={styles.jobId} numberOfLines={1}>#{trip.ref_id ?? trip.id.slice(0, 8)}</Text>
                </View>
                <Badge label={statusLabel(trip.status)} variant={statusVariant(trip.status)} />
              </View>

              {((pickupStop && (!pickupStop.location_lat || !pickupStop.location_lng)) || (dropoffStop && (!dropoffStop.location_lat || !dropoffStop.location_lng))) && (
                <Text style={styles.noCoordsNote}>📍 Specific coordinates not entered for this location</Text>
              )}

              {/* Route timeline */}
              <View style={styles.route}>
                <View style={styles.routeRail}>
                  <View style={styles.dotPickup} />
                  <View style={styles.railLine} />
                  <MapPin size={18} color={Colors.primary} strokeWidth={2.4} />
                </View>
                <View style={styles.routeCol}>
                  <View style={styles.routeStop}>
                    <View style={styles.routeStopHead}>
                      <Text style={styles.routeStage}>PICKUP</Text>
                      <Text style={styles.routeWhen} numberOfLines={1}>{shortWhen(trip.planned_start)}</Text>
                    </View>
                    <Text style={styles.routePlace} numberOfLines={1}>
                      {stopLabel(pickupStop) ?? 'Location not set'}
                    </Text>
                    {stopAddress(pickupStop) && (
                      <Text style={styles.routeAddress} numberOfLines={2}>{stopAddress(pickupStop)}</Text>
                    )}
                  </View>
                  <View style={[styles.routeStop, styles.routeStopLast]}>
                    <View style={styles.routeStopHead}>
                      <Text style={styles.routeStage}>DELIVERY</Text>
                      <Text style={styles.routeWhen} numberOfLines={1}>{shortWhen(trip.planned_end)}</Text>
                    </View>
                    <Text style={styles.routePlace} numberOfLines={1}>
                      {stopLabel(dropoffStop) ?? 'Location not set'}
                    </Text>
                    {stopAddress(dropoffStop) && (
                      <Text style={styles.routeAddress} numberOfLines={2}>{stopAddress(dropoffStop)}</Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.jobMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Customer</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>{trip.customer?.name ?? '—'}</Text>
                </View>
                <View style={[styles.metaItem, styles.metaItemLast]}>
                  <Text style={styles.metaLabel}>Distance</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>{trip.planned_distance ? `${trip.planned_distance} km` : '—'}</Text>
                </View>
              </View>

              <View style={styles.cardActionRow}>
                {next ? (
                  <TouchableOpacity
                    style={[styles.startBtn, { flex: 1 }, advancing && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                    onPress={advance}
                    disabled={advancing}
                  >
                    <Text style={styles.startBtnText}>{advancing ? 'Updating…' : next.label}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.doneNote, { flex: 1 }]}>This trip is {statusLabel(trip.status).toLowerCase()}.</Text>
                )}

                <TouchableOpacity
                  style={styles.delayReportBtn}
                  activeOpacity={0.8}
                  onPress={() => setDelayModalVisible(true)}
                >
                  <Clock size={16} color="#D97706" strokeWidth={2.2} />
                  <Text style={styles.delayReportBtnText}>Report Delay</Text>
                </TouchableOpacity>
              </View>
            </DarkCard>
          )}
        </View>
      </ScrollView>

      <DelayReportModal
        visible={delayModalVisible}
        tripId={trip?.id ?? null}
        onClose={() => setDelayModalVisible(false)}
        onSuccess={() => refetch()}
      />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },
  // Fills the space below the header; centers whichever trip state renders
  // (empty banner or the trip card) at the same vertical spot on the page.
  tripSection: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: Typography.sm, color: Colors.gray500 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName: { fontSize: Typography.xl, fontWeight: '700', color: Colors.gray900 },
  signOutBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  signOutText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    ...Shadows.sm,
  },
  sosText: { fontSize: Typography.xs, fontWeight: '800', color: Colors.white },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  langPillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.primary,
  },

  centerBox: { paddingVertical: Spacing['3xl'], alignItems: 'center', gap: Spacing.sm },
  errorText: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center' },
  retryText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },

  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.gray900, marginBottom: Spacing.xs },
  emptySub: { fontSize: Typography.sm, color: Colors.gray500, textAlign: 'center' },

  jobCard: { marginBottom: Spacing.lg, padding: Spacing.lg },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  jobHeaderLeft: { flex: 1 },
  jobLabel: { fontSize: Typography.xs, color: Colors.gray400, letterSpacing: 1.5, fontWeight: '700', marginBottom: 2 },
  jobId: { fontSize: Typography.xl, fontWeight: '800', color: Colors.white },

  // Route timeline
  route: { flexDirection: 'row', gap: Spacing.md },
  routeRail: { alignItems: 'center', paddingTop: 4 },
  dotPickup: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 3, borderColor: Colors.success ?? '#22C55E', backgroundColor: 'transparent',
  },
  railLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: Colors.gray700, marginVertical: 4 },
  routeCol: { flex: 1 },
  routeStop: { marginBottom: Spacing.lg },
  routeStopLast: { marginBottom: 0 },
  routeStopHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  routeStage: { fontSize: Typography.xs, color: Colors.gray400, letterSpacing: 1, fontWeight: '700' },
  routeWhen: { fontSize: Typography.xs, fontWeight: '600', color: Colors.gray400, flexShrink: 1, textAlign: 'right' },
  // The place is the headline now — the driver reads this first. The time was
  // the only thing here before, which told them when but never where.
  routePlace: { fontSize: Typography.base, fontWeight: '700', color: Colors.white, marginTop: 2 },
  routeAddress: { fontSize: Typography.xs, color: Colors.gray400, marginTop: 2, lineHeight: 16 },

  divider: { height: 1, backgroundColor: Colors.gray700, marginVertical: Spacing.lg },

  jobMeta: { flexDirection: 'row', marginBottom: Spacing.lg },
  metaItem: { flex: 1, paddingRight: Spacing.sm },
  metaItemLast: { paddingRight: 0 },
  metaLabel: { fontSize: Typography.xs, color: Colors.gray400, marginBottom: 3 },
  metaValue: { fontSize: Typography.sm, color: Colors.white, fontWeight: '700' },
  startBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  startBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.base },
  doneNote: { color: Colors.gray400, fontSize: Typography.sm, textAlign: 'center' },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  delayReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  delayReportBtnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: '#92400E',
  },
  noCoordsNote: {
    fontSize: Typography.xs,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
});

export default HomeScreen;
