import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Badge, DarkCard } from '../../components';
import { DriverBottomNav } from '../../navigation/DriverBottomNav';
import { useAuth } from '../../lib/auth-context';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, NEXT_STEP, PHOTO_FOR, statusLabel, type TripStatus } from '../../lib/trips';
import { capturePhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';

/** Badge colour by trip status. */
function statusVariant(s: TripStatus): 'warning' | 'success' | 'info' | 'neutral' {
  if (s === 'InTransit') return 'warning';
  if (s === 'Completed') return 'success';
  if (s === 'AtPickup' || s === 'AtDelivery') return 'info';
  return 'neutral';
}

const HomeScreen = () => {
  const { profile, signOut } = useAuth();
  const { trip, loading, error, refetch, setTrip } = useCurrentTrip();
  const [activeTab, setActiveTab] = useState('Home');
  const [advancing, setAdvancing] = useState(false);
  const router = useRouter();

  // Refresh the trip whenever Home regains focus (e.g. returning from a step screen).
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const firstName = (profile?.name || 'Driver').split(' ')[0];

  const next = trip ? NEXT_STEP[trip.status] : undefined;

  const doAdvance = async () => {
    if (!trip || !next) return;
    const photoKind = PHOTO_FOR[next.to];
    setAdvancing(true);
    try {
      // Some transitions require a photo first (cargo before In Transit, POD before Completed).
      if (photoKind) {
        const photo = await capturePhoto();
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
    // The "arrived at delivery" step has its own screen.
    if (trip.status === 'InTransit') { router.push('/trip/arrived'); return; }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.driverName}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity onPress={signOut} activeOpacity={0.7} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* Active trip */}
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
            <Text style={styles.emptyTitle}>No active trip</Text>
            <Text style={styles.emptySub}>You're all caught up. Waiting for your next assignment.</Text>
          </View>
        ) : (
          <DarkCard style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View>
                <Text style={styles.jobLabel}>ACTIVE TRIP</Text>
                <Text style={styles.jobId}>#{trip.ref_id ?? trip.id.slice(0, 8)}</Text>
              </View>
              <Badge label={statusLabel(trip.status)} variant={statusVariant(trip.status)} />
            </View>

            <View style={styles.routeRow}>
              <Text style={styles.routeIcon}>📍</Text>
              <View style={styles.routeLine} />
              <Text style={styles.routeText}>Pickup → Delivery</Text>
            </View>

            <View style={styles.jobMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Customer</Text>
                <Text style={styles.metaValue}>{trip.customer?.name ?? '—'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Cargo</Text>
                <Text style={styles.metaValue}>{trip.cargo_type}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Distance</Text>
                <Text style={styles.metaValue}>{trip.planned_distance ? `${trip.planned_distance} km` : '—'}</Text>
              </View>
            </View>

            {next ? (
              <TouchableOpacity
                style={[styles.startBtn, advancing && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={advance}
                disabled={advancing}
              >
                <Text style={styles.startBtnText}>{advancing ? 'Updating…' : next.label}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.doneNote}>This trip is {statusLabel(trip.status).toLowerCase()}.</Text>
            )}
          </DarkCard>
        )}
      </ScrollView>
      <DriverBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: Typography.sm, color: Colors.gray500 },
  driverName: { fontSize: Typography.xl, fontWeight: '700', color: Colors.gray900 },
  signOutBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  signOutText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },

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

  jobCard: { marginBottom: Spacing.lg },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  jobLabel: { fontSize: Typography.xs, color: Colors.gray400, letterSpacing: 1, fontWeight: '600' },
  jobId: { fontSize: Typography.lg, fontWeight: '700', color: Colors.white },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.xs },
  routeIcon: { fontSize: 16 },
  routeLine: { flex: 1, height: 1, backgroundColor: Colors.gray700, marginHorizontal: Spacing.xs },
  routeText: { fontSize: Typography.base, fontWeight: '600', color: Colors.white },
  jobMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: Typography.xs, color: Colors.gray400, marginBottom: 2 },
  metaValue: { fontSize: Typography.sm, color: Colors.white, fontWeight: '600' },
  startBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  startBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.base },
  doneNote: { color: Colors.gray400, fontSize: Typography.sm, textAlign: 'center' },
});

export default HomeScreen;
