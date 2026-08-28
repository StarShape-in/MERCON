import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;
let PROVIDER_DEFAULT: any = undefined;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  } catch (e) {
    console.warn('react-native-maps load error:', e);
  }
}
import { ArrowLeft, MapPin, Truck, Siren, Clock, Banknote, ArrowUpRight, Navigation } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { DelayReportModal, TripProgressStepper } from '../../components';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, stopAddress, stopLabel } from '../../lib/trips';
import { getApiErrorMessage } from '../../lib/api';

const ARRIVAL_RADIUS_M = 200;
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Great-circle distance between two lat/lng points, in meters. */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LiveNavigationScreen = () => {
  const router = useRouter();
  const { trip, loading, refetch } = useCurrentTrip();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [baseDuration, setBaseDuration] = useState<number | null>(null);
  const [baseDistance, setBaseDistance] = useState<number | null>(null);
  const routeFetchedRef = useRef<string | null>(null);
  
  const [arriving, setArriving] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const hasArrivedRef = useRef(false);
  const mapRef = useRef<any>(null);

  const activeStop = trip?.stops?.find((s) => s.actual_arrival === null) ?? trip?.stops?.[0] ?? null;
  const isPickup = activeStop ? activeStop.stop_type === 'Pickup' : (trip?.status === 'Scheduled' || trip?.status === 'Draft' || trip?.driver_workflow_state === 'GOING_TO_PICKUP');
  const isHeadingToPickup = isPickup;

  const goToStop = async () => {
    if (!trip || hasArrivedRef.current) return;
    hasArrivedRef.current = true;
    setArriving(true);
    try {
      if (isHeadingToPickup) {
        await tripService.updateStatus(trip.id, 'Loading', 'ARRIVED_AT_PICKUP');
        router.replace('/trip/pickup' as any);
      } else {
        const isFinal = activeStop ? activeStop.stop_sequence === (trip.stops?.length ?? 1) : true;
        const nextState = isFinal ? 'ARRIVED_AT_FINAL_DELIVERY' : 'ARRIVED_AT_DELIVERY';
        await tripService.updateStatus(trip.id, 'InTransit', nextState);
        router.replace('/trip/delivery' as any);
      }
    } catch (e) {
      hasArrivedRef.current = false;
      setArriving(false);
      Alert.alert('Could not update', getApiErrorMessage(e));
    }
  };

  const handleOpenExternalNavigation = () => {
    const lat = activeStop?.location_lat ?? 18.3039;
    const lng = activeStop?.location_lng ?? 42.7314;
    const label = encodeURIComponent(stopLabel(activeStop) || 'Pickup Location');
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  };

  // Stream live position and auto-detect arrival at the dropoff.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          let lat = loc.coords.latitude;
          let lng = loc.coords.longitude;

          // HACK FOR DEVELOPMENT: If the iOS Simulator is stuck in San Francisco (Apple HQ),
          // teleport the driver to be near the active stop so the map looks realistic!
          if (Math.abs(lat - 37.785834) < 0.1 && Math.abs(lng - -122.406417) < 0.1) {
            if (activeStop) {
              lat = activeStop.location_lat - 0.005; // ~500m away
              lng = activeStop.location_lng - 0.005;
            }
          }

          setPosition({ lat, lng });

          if (activeStop) {
            const dist = distanceMeters(lat, lng, activeStop.location_lat, activeStop.location_lng);
            setDistanceToTarget(dist);
            if (dist <= ARRIVAL_RADIUS_M && !hasArrivedRef.current) goToStop();
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStop?.id]);

  useEffect(() => {
    if (!trip || !position || !activeStop) return;
    if (routeFetchedRef.current === activeStop.id) return;

    routeFetchedRef.current = activeStop.id;
    const fetchRoute = async () => {
      try {
        const route = await tripService.getRoute(trip.id, position.lat, position.lng);
        setBaseDuration(route.durationSeconds);
        setBaseDistance(route.distanceMeters);
        setRouteCoords(route.geometry.map((c) => ({ latitude: c[1], longitude: c[0] })));
      } catch (e) {
        console.warn('Failed to fetch route:', e);
      }
    };
    fetchRoute();
  }, [trip, position, activeStop]);

  useEffect(() => {
    if (position && activeStop && mapRef.current && Platform.OS !== 'web' && mapRef.current.fitToCoordinates) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: position.lat, longitude: position.lng },
          { latitude: activeStop.location_lat, longitude: activeStop.location_lng }
        ],
        { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true }
      );
    }
  }, [position, activeStop]);

  if (loading && !trip) {
    return (
      <SafeAreaView style={[styles.container, styles.centerBox]}>
        <ActivityIndicator color={Colors.white} />
      </SafeAreaView>
    );
  }

  const center = position ?? (activeStop ? { lat: activeStop.location_lat, lng: activeStop.location_lng } : { lat: 24.7136, lng: 46.6753 });

  let displayEta = '';
  let displayDistance = '';
  if (baseDuration && baseDistance && distanceToTarget != null) {
    const ratio = Math.min(1, distanceToTarget / baseDistance);
    let secondsLeft = baseDuration * ratio;
    if (secondsLeft < 60 && distanceToTarget > 100) secondsLeft = 60;
    
    const mins = Math.round(secondsLeft / 60);
    displayEta = mins > 60 
      ? `${Math.floor(mins / 60)}h ${mins % 60}m` 
      : `${mins} min`;
      
    displayDistance = distanceToTarget > 1000 
      ? `${(distanceToTarget / 1000).toFixed(1)} km` 
      : `${Math.round(distanceToTarget)} m`;
  }

  const withinGeofence = distanceToTarget != null && distanceToTarget <= ARRIVAL_RADIUS_M;

  if (withinGeofence) {
    const formattedTime = new Date().toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.white }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        
        <View style={[styles.topOverlay, { top: 12 }]}>
          <TouchableOpacity style={styles.backCircleBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.gray900} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={styles.arrivedCenterBox}>
          <View style={styles.arrivedIllustrationContainer}>
            <View style={[styles.arrivedMapPinCircle, { backgroundColor: isHeadingToPickup ? '#FA634E' : '#10B981' }]}>
              <MapPin size={48} color={Colors.white} strokeWidth={2} />
            </View>
          </View>

          <Text style={styles.arrivedTitle}>You have arrived at</Text>
          <Text style={styles.arrivedSubTitle}>{isHeadingToPickup ? 'Pickup Location' : 'Delivery Location'}</Text>
          
          <Text style={styles.arrivedPlaceName}>{stopLabel(activeStop) ?? 'Stop'}</Text>
          {stopAddress(activeStop) && (
            <Text style={styles.arrivedPlaceAddress}>{stopAddress(activeStop)}</Text>
          )}

          <Text style={styles.arrivalTimeLabel}>Arrival Time</Text>
          <Text style={styles.arrivalTimeValue}>{formattedTime}</Text>
        </View>

        <View style={styles.arrivedBottomContainer}>
          <TouchableOpacity
            style={[
              styles.arrivedActionBtn,
              { backgroundColor: isHeadingToPickup ? '#FA634E' : '#10B981' },
              arriving && { opacity: 0.6 }
            ]}
            activeOpacity={0.8}
            onPress={goToStop}
            disabled={arriving}
          >
            <Text style={styles.arrivedActionBtnText}>
              {arriving ? 'Updating…' : isHeadingToPickup ? "I'VE ARRIVED AT PICKUP" : "I'VE ARRIVED AT DELIVERY"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B1A" />
      
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={[styles.map, styles.centerBox, { backgroundColor: '#1E293B' }]}>
            <MapPin size={36} color={Colors.primary} />
            <Text style={{ color: Colors.white, marginTop: 12, fontWeight: '700', fontSize: Typography.base }}>
              Live Map View
            </Text>
            <Text style={{ color: Colors.gray400, marginTop: 4, fontSize: Typography.xs }}>
              Open in Expo Go app on iOS/Android for interactive map
            </Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
              latitude: center.lat,
              longitude: center.lng,
              latitudeDelta: 0.2,
              longitudeDelta: 0.2,
            }}
          >
            {position && (
              <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.driverPin}>
                  <Truck size={16} color={Colors.white} strokeWidth={2.4} />
                </View>
              </Marker>
            )}

            {activeStop && (
              <Marker coordinate={{ latitude: activeStop.location_lat, longitude: activeStop.location_lng }} anchor={{ x: 0.5, y: 1 }}>
                <View style={styles.destPin}>
                  <MapPin size={18} color={Colors.white} strokeWidth={2.4} />
                </View>
              </Marker>
            )}

            {routeCoords && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#4285F4"
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>
        )}

        {/* Top Header Overlay */}
        <View style={styles.topOverlay}>
          {/* Unified White Card Container */}
          <View style={styles.unifiedTopCard}>
            {/* Top Controls Row: Back Button + 4-Stage Stepper */}
            <View style={styles.topControlsRow}>
              <TouchableOpacity
                style={styles.backCircleBtn}
                activeOpacity={0.8}
                onPress={() => router.back()}
              >
                <ArrowLeft size={18} color="#3E3C3D" strokeWidth={2.2} />
              </TouchableOpacity>

              <View style={styles.stepperRowFlex}>
                <TripProgressStepper currentStep={isHeadingToPickup ? 1 : 3} />
              </View>
            </View>

            {/* Subtle Divider Line */}
            <View style={styles.subtleDivider} />

            {/* Bottom Current Action Block + Dedicated Circular Report Delay Control */}
            <View style={styles.currentActionRow}>
              {/* Left Column: State Information */}
              <View style={styles.currentActionTextCol}>
                <View style={styles.currentStepLabelRow}>
                  <View style={styles.coralIndicatorDot} />
                  <Text style={styles.currentStepTag}>CURRENT STEP</Text>
                </View>

                <Text style={styles.currentActionTitle}>
                  {isHeadingToPickup ? 'On the way to pickup' : 'On the way to delivery'}
                </Text>

                <Text style={styles.currentActionSubtitle}>
                  {isHeadingToPickup
                    ? 'Navigate to the pickup location to start the trip.'
                    : 'Navigate to the delivery location to complete the trip.'}
                </Text>
              </View>

              {/* Right Column: Dedicated Circular Report Delay Control */}
              <View style={styles.delayControlCol}>
                <TouchableOpacity
                  style={styles.circularDelayBtn}
                  activeOpacity={0.8}
                  onPress={() => setDelayModalVisible(true)}
                >
                  <Clock size={18} color="#FA634E" strokeWidth={2.4} />
                </TouchableOpacity>
                <Text style={styles.circularDelayLabel}>Report delay</Text>
              </View>
            </View>
          </View>
        </View>

        {!position && (
          <View style={styles.gpsNotice}>
            <Text style={styles.gpsNoticeText}>Waiting for GPS signal…</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet Container */}
      <View style={styles.bottomCard}>
        {/* 1. Destination Information Block */}
        <View style={styles.destinationBlock}>
          <Text style={styles.destinationLabel}>
            {isHeadingToPickup ? 'PICKING UP AT' : 'DELIVERING TO'}
          </Text>
          <Text style={styles.destinationName} numberOfLines={1}>
            {stopLabel(activeStop, isHeadingToPickup ? 'Khamis Mushayt' : 'Khamis Mushayt')}
          </Text>
          <Text style={styles.destinationAddress} numberOfLines={2}>
            {stopAddress(activeStop) ?? "Khamis Mushayt, 'Asir Province, Saudi Arabia"}
          </Text>
        </View>

        {/* 2. PRIMARY ACTION: I'VE ARRIVED AT PICKUP */}
        <TouchableOpacity
          style={[
            styles.primaryArrivedBtn,
            { backgroundColor: isHeadingToPickup ? '#FA634E' : '#10B981' },
            arriving && { opacity: 0.6 }
          ]}
          activeOpacity={0.88}
          onPress={goToStop}
          disabled={arriving}
        >
          <Text style={styles.primaryArrivedBtnText}>
            {arriving ? 'Updating State…' : isHeadingToPickup ? "I'VE ARRIVED AT PICKUP" : "I'VE ARRIVED AT DELIVERY"}
          </Text>
        </TouchableOpacity>

        {/* 3. SECONDARY ACTION: GO TO PICKUP (External Navigation) */}
        <TouchableOpacity
          style={styles.secondaryNavBtn}
          activeOpacity={0.85}
          onPress={handleOpenExternalNavigation}
        >
          <View style={styles.secondaryNavIconRow}>
            <ArrowUpRight size={18} color="#3E3C3D" strokeWidth={2.4} />
            <View style={styles.secondaryNavTextCol}>
              <Text style={styles.secondaryNavTitle}>
                {isHeadingToPickup ? 'GO TO PICKUP' : 'GO TO DELIVERY'}
              </Text>
              <Text style={styles.secondaryNavSubtitle}>Open navigation</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <DelayReportModal
        visible={delayModalVisible}
        tripId={trip?.id ?? null}
        onClose={() => setDelayModalVisible(false)}
        onSuccess={() => refetch()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2B1A',
  },
  centerBox: { alignItems: 'center', justifyContent: 'center' },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  driverPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  destPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1A2B1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 16,
    left: 12,
    right: 12,
    zIndex: 50,
  },
  unifiedTopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperRowFlex: {
    flex: 1,
  },
  backCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  charcoalDelayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  delayChipText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  subtleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  currentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  currentActionTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  delayControlCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  circularDelayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: '#FFE4DE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FA634E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  circularDelayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  currentStepLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coralIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FA634E',
  },
  currentStepTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  currentActionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  currentActionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  cashEmojiMap: {
    fontSize: 14,
  },
  chargeValueMap: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: '#065F46',
  },
  sosCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  headerTitle: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: Colors.gray900,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  gpsNotice: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  gpsNoticeText: {
    color: Colors.white,
    fontSize: Typography.xs,
    fontWeight: '600',
  },
  bottomCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 12, // Extra padding for SafeArea
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadows.lg,
  },
  destinationBlock: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  destinationLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.gray400,
  },
  destinationName: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.gray900,
    marginTop: 2,
  },
  destinationAddress: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginTop: 2,
    lineHeight: 18,
  },
  navStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  navEta: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F9D58', // Google Maps Green
  },
  navDistance: {
    fontSize: Typography.base,
    color: Colors.gray500,
    fontWeight: '600',
  },
  primaryArrivedBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FA634E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FA634E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  primaryArrivedBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14.5,
    letterSpacing: 0.5,
  },
  secondaryNavBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginBottom: 14,
  },
  secondaryNavIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryNavTextCol: {
    flex: 1,
  },
  secondaryNavTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  secondaryNavSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  tertiaryDelayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  tertiaryDelayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  noCoordsBanner: {
    backgroundColor: '#FFFBEB', // Light amber
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  noCoordsText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: '#92400E', // Dark amber
  },
  noCoordsSubText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  arrivedCenterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white,
  },
  arrivedIllustrationContainer: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  arrivedMapPinCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  arrivedTitle: {
    fontSize: Typography.base,
    color: Colors.gray500,
    fontWeight: '600',
  },
  arrivedSubTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: Spacing.lg,
  },
  arrivedPlaceName: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
    textAlign: 'center',
  },
  arrivedPlaceAddress: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  arrivalTimeLabel: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  arrivalTimeValue: {
    fontSize: Typography.sm,
    color: '#1F2937',
    fontWeight: '700',
    marginTop: 2,
  },
  arrivedBottomContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 12,
    backgroundColor: Colors.white,
  },
  arrivedActionBtn: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  arrivedActionBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: Typography.base,
  },
  manualArriveLink: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: 4,
  },
  manualArriveText: {
    color: Colors.primary,
    fontSize: Typography.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LiveNavigationScreen;
