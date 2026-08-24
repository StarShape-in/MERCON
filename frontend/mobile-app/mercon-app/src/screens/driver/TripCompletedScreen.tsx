import React, { useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, ActivityIndicator, Alert, Share, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Share2 } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Badge, TripProgressStepper } from '../../components';
import { useTripHistory } from '../../lib/use-trip-history';
import { useCargoPodPhotos } from '../../lib/documents';
import { API_URL } from '../../lib/api';
import { stopLabel } from '../../lib/trips';

let captureRef: any = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch (_) {}

let Sharing: any = null;
try {
  Sharing = require('expo-sharing');
} catch (_) {}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDuration(startIso?: string | null, endIso?: string | null): string {
  if (!startIso || !endIso) return '—';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '—';
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const TripCompletedScreen = () => {
  const router = useRouter();
  const { trips, loading } = useTripHistory();
  const trip = trips[0] ?? null; // most recent completed trip
  const viewRef = useRef<any>(null);
  const { photos } = useCargoPodPhotos();

  const FILE_BASE = API_URL.replace(/\/api\/?$/, '');
  const tripPhotos = trip ? photos.filter((p) => p.entity_id === trip.id) : [];
  const cargoPhotoLeg1 = tripPhotos.find((p) => p.doc_type === 'Waybill' && (p.ai_extracted_json?.leg_index === 0 || p.ai_extracted_json?.leg_index === undefined));
  const podPhotoLeg1 = tripPhotos.find((p) => p.doc_type === 'POD' && (p.ai_extracted_json?.leg_index === 0 || p.ai_extracted_json?.leg_index === undefined));
  const cargoPhotoLeg2 = tripPhotos.find((p) => p.doc_type === 'Waybill' && p.ai_extracted_json?.leg_index === 1);
  const podPhotoLeg2 = tripPhotos.find((p) => p.doc_type === 'POD' && p.ai_extracted_json?.leg_index === 1);

  const onTime =
    trip?.planned_end && trip?.actual_end
      ? new Date(trip.actual_end).getTime() <= new Date(trip.planned_end).getTime()
      : null;

  const summaryItems = trip
    ? [
        { label: 'Trip ID', value: `#${trip.ref_id ?? trip.id.slice(0, 8)}` },
        { label: 'Customer', value: trip.customer?.name ?? '—' },
        { label: 'Distance', value: trip.planned_distance ? `${trip.planned_distance} km` : '—' },
        { label: 'Duration', value: formatDuration(trip.actual_start, trip.actual_end) },
        { label: 'Completed', value: formatDate(trip.actual_end) },
      ]
    : [];

  const handleShare = async () => {
    try {
      if (!captureRef) {
        Alert.alert('Sharing', 'Screenshot capture is not supported in this environment.');
        return;
      }
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 0.85,
      });

      let shared = false;
      if (Sharing && typeof Sharing.isAvailableAsync === 'function' && await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(uri, {
            dialogTitle: 'Share Trip Completed',
          });
          shared = true;
        } catch (sharingErr) {
          console.warn('expo-sharing shareAsync failed, falling back to Share:', sharingErr);
        }
      }

      if (!shared) {
        await Share.share({
          title: 'Trip Completed',
          message: `Trip Completed! Ref: ${trip?.ref_id ?? trip?.id?.slice(0, 8) ?? ''}`,
          url: uri,
        });
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to share: ' + e.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.gray100} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View ref={viewRef} style={{ backgroundColor: Colors.gray100, paddingVertical: Spacing.sm }}>
          <TripProgressStepper currentStep={5} />
          {/* Success Header */}
          <View style={styles.successSection}>
            <View style={styles.checkCircle}>
              <Check size={44} color={Colors.white} strokeWidth={3} />
            </View>
            {onTime !== null && (
              <Badge
                label={onTime ? 'On Time' : 'Late'}
                variant={onTime ? 'success' : 'warning'}
                style={styles.onTimeBadge}
              />
            )}
            <Text style={styles.heading}>Trip Completed!</Text>
            <Text style={styles.subheading}>
              The delivery has been confirmed and your trip is now complete.
            </Text>
          </View>

          {loading && !trip && <ActivityIndicator color={Colors.primary} />}

          {/* Trip Summary */}
          {trip && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Trip Summary</Text>
              {summaryItems.map((item, i) => (
                <View
                  key={item.label}
                  style={[styles.summaryRow, i < summaryItems.length - 1 ? styles.summaryRowBorder : null]}
                >
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Trip Media */}
          {trip && (cargoPhotoLeg1 || podPhotoLeg1 || cargoPhotoLeg2 || podPhotoLeg2) && (
            <View style={styles.mediaCard}>
              <Text style={styles.mediaTitle}>Trip Media</Text>
              
              {/* Leg 1 Media */}
              {(cargoPhotoLeg1 || podPhotoLeg1) && (
                <View style={{ marginBottom: Spacing.md }}>
                  {trip.stops && trip.stops.length >= 2 && (
                    <Text style={{ fontSize: Typography.xs, color: Colors.gray500, fontWeight: '700', marginBottom: Spacing.xs }}>
                      Leg 1: {stopLabel(trip.stops[0]) || 'Origin'} → {stopLabel(trip.stops[1]) || 'Destination'}
                    </Text>
                  )}
                  <View style={styles.mediaContainer}>
                    {cargoPhotoLeg1 && (
                      <View style={styles.mediaItem}>
                        <Text style={styles.mediaLabel}>Cargo Pickup (Loading)</Text>
                        <Image
                          source={{ uri: cargoPhotoLeg1.file_url.startsWith('http') ? cargoPhotoLeg1.file_url : `${FILE_BASE}${cargoPhotoLeg1.file_url}` }}
                          style={styles.mediaImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                    {podPhotoLeg1 && (
                      <View style={styles.mediaItem}>
                        <Text style={styles.mediaLabel}>Proof of Delivery (POD)</Text>
                        <Image
                          source={{ uri: podPhotoLeg1.file_url.startsWith('http') ? podPhotoLeg1.file_url : `${FILE_BASE}${podPhotoLeg1.file_url}` }}
                          style={styles.mediaImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Leg 2 Media */}
              {(cargoPhotoLeg2 || podPhotoLeg2) && (
                <View>
                  {trip.stops && trip.stops.length >= 3 && (
                    <Text style={{ fontSize: Typography.xs, color: Colors.gray500, fontWeight: '700', marginBottom: Spacing.xs }}>
                      Leg 2: {stopLabel(trip.stops[1]) || 'Origin'} → {stopLabel(trip.stops[2]) || 'Destination'}
                    </Text>
                  )}
                  <View style={styles.mediaContainer}>
                    {cargoPhotoLeg2 && (
                      <View style={styles.mediaItem}>
                        <Text style={styles.mediaLabel}>Return Pickup (Loading)</Text>
                        <Image
                          source={{ uri: cargoPhotoLeg2.file_url.startsWith('http') ? cargoPhotoLeg2.file_url : `${FILE_BASE}${cargoPhotoLeg2.file_url}` }}
                          style={styles.mediaImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                    {podPhotoLeg2 && (
                      <View style={styles.mediaItem}>
                        <Text style={styles.mediaLabel}>Proof of Delivery (POD)</Text>
                        <Image
                          source={{ uri: podPhotoLeg2.file_url.startsWith('http') ? podPhotoLeg2.file_url : `${FILE_BASE}${podPhotoLeg2.file_url}` }}
                          style={styles.mediaImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <Button
          title="SHARE SCREENSHOT"
          onPress={handleShare}
          variant="outline"
          iconLeft={<Share2 size={18} color={Colors.primary} />}
        />

        <Button title="BACK TO HOME" onPress={() => router.replace('/')} style={{ backgroundColor: '#10B981' }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.lg,
  },
  onTimeBadge: {
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  ratingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  ratingTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 2,
  },
  ratingSubtitle: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  star: {
    fontSize: 36,
    color: '#F59E0B',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  summaryTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  summaryLabel: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  summaryValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  earningsValue: {
    color: Colors.success,
    fontSize: Typography.base,
  },
  performanceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  perfCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadows.sm,
  },
  perfIcon: {
    fontSize: 24,
  },
  perfValue: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.gray900,
  },
  perfLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  viewTripsBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  viewTripsBtnText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  mediaCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  mediaTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  mediaContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  mediaItem: {
    flex: 1,
  },
  mediaLabel: {
    fontSize: Typography.xs - 1,
    fontWeight: '600',
    color: Colors.gray500,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediaImage: {
    width: '100%',
    height: 120,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
  },
});

export default TripCompletedScreen;
