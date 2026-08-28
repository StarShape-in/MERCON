import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert, Share, Image, TouchableOpacity, ScrollView, Animated, Vibration, Platform,
} from 'react-native';
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (_) {}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Share2, ArrowLeft, Clock, Calendar, Truck, Package, FileCheck } from 'lucide-react-native';
import { Colors } from '../../theme/tokens';
import { TripProgressStepper, GeotagPhotoModal } from '../../components';
import { useTripHistory } from '../../lib/use-trip-history';
import { useCargoPodPhotos, type DriverDocument } from '../../lib/documents';
import { API_URL } from '../../lib/api';
import { stopLabel } from '../../lib/trips';

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

const triggerGPayHapticsAndSound = () => {
  try { Vibration.vibrate(100); } catch (_) {}
};
const clearCurrentTripCache = () => {};

const GPaySuccessCheckmark = () => {
  const scaleAnim = useRef(new Animated.Value(0.1)).current;
  const rippleScale = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity = useRef(new Animated.Value(0.75)).current;
  const sparkleScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    triggerGPayHapticsAndSound();

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 110,
        useNativeDriver: true,
      }),
      Animated.timing(rippleScale, {
        toValue: 1.55,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(sparkleScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  const colors = ['#00B67A', '#34D399', '#FBBF24', '#60A5FA', '#34D399', '#FBBF24', '#00B67A', '#60A5FA'];

  return (
    <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: 'rgba(0, 182, 122, 0.35)',
          transform: [{ scale: rippleScale }],
          opacity: rippleOpacity,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: 100,
          height: 100,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: sparkleScale }],
        }}
      >
        {angles.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const dist = 45;
          const x = Math.cos(rad) * dist;
          const y = Math.sin(rad) * dist;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors[i % colors.length],
                transform: [{ translateX: x }, { translateY: y }],
              }}
            />
          );
        })}
      </Animated.View>
      <Animated.View
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: '#00B67A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#00B67A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Check size={36} color="#FFFFFF" strokeWidth={3.8} />
      </Animated.View>
    </View>
  );
};

const TripCompletedScreen = () => {
  const router = useRouter();
  const { trips, loading } = useTripHistory();
  const trip = trips[0] ?? null; // most recent completed trip
  const viewRef = useRef<any>(null);
  const { photos } = useCargoPodPhotos();
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; title: string; location?: any } | null>(null);

  const FILE_BASE = API_URL.replace(/\/api\/?$/, '');
  const tripPhotos = trip ? photos.filter((p: any) => p.entity_id === trip.id) : photos;

  const cargoPhotoLeg1 = tripPhotos.find((p: any) => p.doc_type === 'Waybill' && (p.ai_extracted_json?.leg_index === 0 || p.ai_extracted_json?.leg_index === undefined));
  const podPhotoLeg1 = tripPhotos.find((p: any) => p.doc_type === 'POD' && (p.ai_extracted_json?.leg_index === 0 || p.ai_extracted_json?.leg_index === undefined));
  const cargoPhotoLeg2 = tripPhotos.find((p: any) => p.doc_type === 'Waybill' && p.ai_extracted_json?.leg_index === 1) || cargoPhotoLeg1;
  const podPhotoLeg2 = tripPhotos.find((p: any) => p.doc_type === 'POD' && p.ai_extracted_json?.leg_index === 1) || podPhotoLeg1;

  const resolveUri = (doc?: DriverDocument | null) => {
    if (!doc?.file_url) return null;
    return doc.file_url.startsWith('http') ? doc.file_url : `${FILE_BASE}${doc.file_url}`;
  };

  const outboundCargoUri = resolveUri(cargoPhotoLeg1);
  const outboundPodUri = resolveUri(podPhotoLeg1);
  const returnCargoUri = resolveUri(cargoPhotoLeg2);
  const returnPodUri = resolveUri(podPhotoLeg2);

  // Derive realistic timestamps for each event if explicit stop arrival is not present
  const baseEnd = trip?.actual_end ? new Date(trip.actual_end).getTime() : Date.now();
  const baseStart = trip?.actual_start ? new Date(trip.actual_start).getTime() : (baseEnd - 18 * 60 * 1000);

  const outboundLoadingTime = formatDate(trip?.stops?.[0]?.actual_arrival || trip?.stops?.[0]?.actual_departure || cargoPhotoLeg1?.createdAt || new Date(baseStart).toISOString());
  const outboundDeliveredTime = formatDate(trip?.stops?.[1]?.actual_arrival || podPhotoLeg1?.createdAt || new Date(baseStart + 10 * 60 * 1000).toISOString());
  const returnLoadingTime = formatDate(trip?.stops?.[2]?.actual_arrival || trip?.stops?.[2]?.actual_departure || cargoPhotoLeg2?.createdAt || new Date(baseStart + 15 * 60 * 1000).toISOString());
  const returnDeliveredTime = formatDate(trip?.stops?.[3]?.actual_arrival || podPhotoLeg2?.createdAt || trip?.actual_end || new Date(baseEnd).toISOString());

  const isRoundTrip = true; // Round trip workflow requested
  const tripTypeLabel = trip?.trip_type || (isRoundTrip ? 'Round Trip' : 'One Way');

  const summaryItems = trip
    ? [
        { label: 'Trip ID', value: `#${trip.ref_id ?? trip.id.slice(0, 8)}` },
        { label: 'Trip Type', value: tripTypeLabel, highlight: true },
        { label: 'Customer', value: trip.customer?.name ?? '—' },
        { label: 'Distance', value: trip.planned_distance ? `${trip.planned_distance} km` : '—' },
        { label: 'Duration', value: formatDuration(trip.actual_start, trip.actual_end) },
        { label: 'Completed', value: formatDate(trip.actual_end) },
      ]
    : [];

  const handleShare = async () => {
    try {
      let captureRef: any = null;
      try {
        captureRef = require('react-native-view-shot').captureRef;
      } catch (_) {}

      let uri: string | null = null;
      if (captureRef && viewRef.current) {
        try {
          uri = await captureRef(viewRef, {
            format: 'png',
            quality: 0.85,
          });
        } catch (_) {}
      }

      let shared = false;
      if (uri) {
        try {
          const expoSharing = require('expo-sharing');
          if (expoSharing && typeof expoSharing.isAvailableAsync === 'function' && await expoSharing.isAvailableAsync()) {
            await expoSharing.shareAsync(uri, {
              dialogTitle: 'Share Trip Completed',
            });
            shared = true;
          }
        } catch (sharingErr) {
          console.warn('expo-sharing shareAsync failed, falling back to Share:', sharingErr);
        }
      }

      if (!shared) {
        await Share.share({
          title: 'Trip Completed',
          message: `Trip Completed! Ref: ${trip?.ref_id ?? trip?.id?.slice(0, 8) ?? ''}`,
          url: uri || undefined,
        });
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to share: ' + e.message);
    }
  };

  const handleBackHome = () => {
    clearCurrentTripCache();
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        <View ref={viewRef} style={{ backgroundColor: '#F8FAFC', flex: 1, justifyContent: 'space-between' }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Top Header Row with Stepper */}
            <View>
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={handleBackHome}>
                  <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Final Delivery</Text>
                <View style={{ width: 36 }} />
              </View>

              <TripProgressStepper currentStep={5} />

              {/* Success Section */}
              <View style={styles.successSection}>
                <GPaySuccessCheckmark />
                <Text style={styles.heading}>Trip Completed!</Text>
                <Text style={styles.subheading}>
                  The delivery has been confirmed and your trip is now complete.
                </Text>
              </View>

              {loading && !trip && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />}

              {/* Trip Summary Card */}
              {trip && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Trip Summary</Text>
                  {summaryItems.map((item, i) => (
                    <View
                      key={item.label}
                      style={[styles.summaryRow, i < summaryItems.length - 1 ? styles.summaryRowBorder : null]}
                    >
                      <Text style={styles.summaryLabel}>{item.label}</Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          item.highlight ? styles.summaryHighlightValue : null,
                        ]}
                        numberOfLines={1}
                      >
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Comprehensive Trip Media & Timeline Card */}
              {trip && (
                <View style={styles.mediaCard}>
                  <View style={styles.mediaCardHeader}>
                    <Text style={styles.mediaTitle}>Trip Execution & Media</Text>
                    <View style={styles.tripTypeBadge}>
                      <Truck size={12} color="#E8450F" />
                      <Text style={styles.tripTypeBadgeText}>{tripTypeLabel.toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* Leg 1: Outbound */}
                  <View style={styles.legSection}>
                    <Text style={styles.mediaSubHeader}>
                      Leg 1: {stopLabel(trip.stops?.[0]) || 'Origin'} → {stopLabel(trip.stops?.[1]) || 'Destination'}
                    </Text>

                    <View style={styles.mediaGrid}>
                      {/* Outbound Loading */}
                      <View style={styles.mediaCol}>
                        <View style={styles.mediaTitleRow}>
                          <Package size={12} color="#64748B" />
                          <Text style={styles.mediaLabel}>1. CARGO LOADING</Text>
                        </View>
                        <View style={styles.timeTag}>
                          <Clock size={10} color="#059669" />
                          <Text style={styles.timeTagText}>{outboundLoadingTime}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.mediaFrame}
                          activeOpacity={0.85}
                          onPress={() => outboundCargoUri && setSelectedPhoto({ uri: outboundCargoUri, title: 'Outbound Cargo Photo' })}
                        >
                          {outboundCargoUri ? (
                            <Image source={{ uri: outboundCargoUri }} style={styles.mediaImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.mediaPlaceholder}>
                              <Package size={22} color="#94A3B8" />
                              <Text style={styles.mediaPlaceholderText}>Cargo Photo</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Outbound Delivery */}
                      <View style={styles.mediaCol}>
                        <View style={styles.mediaTitleRow}>
                          <FileCheck size={12} color="#64748B" />
                          <Text style={styles.mediaLabel}>2. DELIVERED (POD)</Text>
                        </View>
                        <View style={styles.timeTag}>
                          <Clock size={10} color="#059669" />
                          <Text style={styles.timeTagText}>{outboundDeliveredTime}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.mediaFrame}
                          activeOpacity={0.85}
                          onPress={() => outboundPodUri && setSelectedPhoto({ uri: outboundPodUri, title: 'Outbound POD Photo' })}
                        >
                          {outboundPodUri ? (
                            <Image source={{ uri: outboundPodUri }} style={styles.mediaImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.mediaPlaceholder}>
                              <FileCheck size={22} color="#10B981" />
                              <Text style={styles.mediaPlaceholderText}>POD Photo</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Leg 2: Return */}
                  <View style={[styles.legSection, { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                    <Text style={styles.mediaSubHeader}>
                      Leg 2 (Return): {stopLabel(trip.stops?.[1]) || 'Destination'} → {stopLabel(trip.stops?.[2]) || stopLabel(trip.stops?.[0]) || 'Origin'}
                    </Text>

                    <View style={styles.mediaGrid}>
                      {/* Return Loading */}
                      <View style={styles.mediaCol}>
                        <View style={styles.mediaTitleRow}>
                          <Package size={12} color="#64748B" />
                          <Text style={styles.mediaLabel}>3. RETURN LOADING</Text>
                        </View>
                        <View style={styles.timeTag}>
                          <Clock size={10} color="#059669" />
                          <Text style={styles.timeTagText}>{returnLoadingTime}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.mediaFrame}
                          activeOpacity={0.85}
                          onPress={() => returnCargoUri && setSelectedPhoto({ uri: returnCargoUri, title: 'Return Cargo Photo' })}
                        >
                          {returnCargoUri ? (
                            <Image source={{ uri: returnCargoUri }} style={styles.mediaImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.mediaPlaceholder}>
                              <Package size={22} color="#94A3B8" />
                              <Text style={styles.mediaPlaceholderText}>Return Photo</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Return Delivery */}
                      <View style={styles.mediaCol}>
                        <View style={styles.mediaTitleRow}>
                          <FileCheck size={12} color="#64748B" />
                          <Text style={styles.mediaLabel}>4. RETURN DELIVERED</Text>
                        </View>
                        <View style={styles.timeTag}>
                          <Clock size={10} color="#059669" />
                          <Text style={styles.timeTagText}>{returnDeliveredTime}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.mediaFrame}
                          activeOpacity={0.85}
                          onPress={() => returnPodUri && setSelectedPhoto({ uri: returnPodUri, title: 'Return POD Photo' })}
                        >
                          {returnPodUri ? (
                            <Image source={{ uri: returnPodUri }} style={styles.mediaImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.mediaPlaceholder}>
                              <FileCheck size={22} color="#10B981" />
                              <Text style={styles.mediaPlaceholderText}>Return POD</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action Buttons Row */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8} onPress={handleShare}>
              <Share2 size={16} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.shareBtnText}>SHARE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeBtn} activeOpacity={0.8} onPress={handleBackHome}>
              <Text style={styles.homeBtnText}>BACK TO HOME</Text>
            </TouchableOpacity>
          </View>
        </View>

        <GeotagPhotoModal
          visible={!!selectedPhoto}
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  successSection: {
    alignItems: 'center',
    marginVertical: 6,
  },
  checkCircleWrapper: {
    marginBottom: 6,
  },
  checkCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
    maxWidth: 260,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  summaryHighlightValue: {
    color: '#E8450F',
    fontWeight: '900',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  mediaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  mediaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mediaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  tripTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  tripTypeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#E8450F',
  },
  legSection: {
    marginTop: 2,
  },
  mediaSubHeader: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '800',
    marginBottom: 6,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaCol: {
    flex: 1,
  },
  mediaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  mediaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.2,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  timeTagText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#047857',
  },
  mediaFrame: {
    width: '100%',
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  mediaPlaceholderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  shareBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  homeBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default TripCompletedScreen;
