import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService } from '../../lib/trips';
import { getApiErrorMessage } from '../../lib/api';

const { width, height } = Dimensions.get('window');

const DestinationReachedScreen = () => {
  const router = useRouter();
  const { trip, loading } = useCurrentTrip();
  const [submitting, setSubmitting] = useState(false);

  const canConfirm = !!trip && trip.status === 'InTransit' && !submitting && !loading;

  const confirmArrival = async () => {
    if (!trip || !canConfirm) return;
    setSubmitting(true);
    try {
      await tripService.updateStatus(trip.id, 'AtDelivery');
      router.back(); // back to Home, which refetches on focus
    } catch (e) {
      Alert.alert('Could not update', getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B1A" />

      {/* Map Placeholder with Overlay */}
      <View style={styles.mapBg}>
        <View style={styles.map}>
          <View style={styles.roadV} />
          <View style={styles.roadH} />
          <Text style={styles.destinationFlag}>🏁</Text>
          <Text style={styles.mapLabel}>{trip?.customer?.name ?? 'DESTINATION'}</Text>
        </View>
        <View style={styles.darkOverlay} />
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Arrived Icon */}
        <View style={styles.arrivedIconWrap}>
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.arrivedEmoji}>📍</Text>
        </View>

        <Text style={styles.arrivedTitle}>You Have Arrived!</Text>
        <Text style={styles.arrivedSub}>
          {trip
            ? 'Confirm you have arrived at the delivery location to proceed.'
            : 'No active trip to update.'}
        </Text>

        {/* Trip Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🧾</Text>
            <Text style={styles.summaryValue}>{trip?.ref_id ?? '—'}</Text>
            <Text style={styles.summaryLabel}>Trip</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>📦</Text>
            <Text style={styles.summaryValue}>{trip?.cargo_type ?? '—'}</Text>
            <Text style={styles.summaryLabel}>Cargo</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>📏</Text>
            <Text style={styles.summaryValue}>
              {trip?.planned_distance ? `${trip.planned_distance} km` : '—'}
            </Text>
            <Text style={styles.summaryLabel}>Distance</Text>
          </View>
        </View>

        {/* Location Confirmation */}
        <View style={styles.locationRow}>
          <View style={styles.locationDot} />
          <Text style={styles.locationText}>{trip?.customer?.name ?? 'Delivery location'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.endTripBtn, !canConfirm && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={confirmArrival}
          disabled={!canConfirm}
        >
          <Text style={styles.endTripText}>
            {submitting ? 'Updating…' : 'Confirm Arrival at Delivery'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Not Yet — Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2B1A',
  },
  mapBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    flex: 1,
    backgroundColor: '#2D4A2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadV: {
    position: 'absolute',
    width: 12,
    top: 0,
    bottom: 0,
    backgroundColor: '#4A6A4A',
    left: '45%',
  },
  roadH: {
    position: 'absolute',
    height: 10,
    left: 0,
    right: 0,
    backgroundColor: '#4A6A4A',
    top: '40%',
  },
  destinationFlag: {
    fontSize: 40,
  },
  mapLabel: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginTop: Spacing.md,
  },
  mapCoords: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
    ...Shadows.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  arrivedIconWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  arrivedEmoji: {
    fontSize: 48,
  },
  arrivedTitle: {
    fontSize: Typography['2xl'],
    fontWeight: '800',
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  arrivedSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryIcon: {
    fontSize: 20,
  },
  summaryValue: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  summaryLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  locationText: {
    fontSize: Typography.sm,
    color: Colors.gray700,
    fontWeight: '600',
  },
  endTripBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  endTripText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.white,
  },
  cancelBtn: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    fontWeight: '600',
  },
});

export default DestinationReachedScreen;
