import React, { useEffect, useRef, useState, useCallback } from 'react';
import { openInGoogleMaps } from '../../lib/maps';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, ActivityIndicator, Platform, Image,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Truck, Siren, Clock, Banknote, ArrowUpRight, Navigation, Camera, Trash2, CheckCircle2 } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { DelayReportModal, TripProgressStepper, DelayButton, GeotagPhotoModal } from '../../components';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, stopAddress, stopLabel } from '../../lib/trips';
import { choosePhoto, type CapturedPhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';

const ARRIVAL_RADIUS_M = 200;

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
  const insets = useSafeAreaInsets();
  const { trip, loading, refetch } = useCurrentTrip();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [baseDuration, setBaseDuration] = useState<number | null>(null);
  const [baseDistance, setBaseDistance] = useState<number | null>(null);
  const routeFetchedRef = useRef<string | null>(null);
  
  const [arriving, setArriving] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [arrivalPhoto, setArrivalPhoto] = useState<CapturedPhoto | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const hasArrivedRef = useRef(false);
  const mapRef = useRef<any>(null);

  const ws = trip?.driver_workflow_state || 'ASSIGNED';

  // Determine if heading to pickup or delivery directly from workflow state
  const isHeadingToPickup = ws === 'ASSIGNED' || ws === 'GOING_TO_PICKUP' || ws === 'ARRIVED_AT_PICKUP' || ws === 'RETURN_LOADING';

  // Leg index: 0 for first leg, 1 for return leg
  const legIndex = (ws === 'RETURN_LOADING' || ws === 'IN_TRANSIT_RETURN' || ws === 'ARRIVED_AT_FINAL_DELIVERY' || ws === 'FIRST_DELIVERY_COMPLETED' || ws.includes('RETURN_STOP')) ? 1 : 0;

  // Find target stop based on current state and leg
  const activeStop = React.useMemo(() => {
    if (!trip?.stops || trip.stops.length === 0) return null;

    if (isHeadingToPickup) {
      // Heading to Pickup: Stop 1 for leg 0, Stop 3 for leg 1
      const targetSeq = legIndex === 1 ? 3 : 1;
      return trip.stops.find((s) => s.stop_sequence === targetSeq) ??
             trip.stops.find((s) => s.stop_type === 'Pickup') ??
             trip.stops[0];
    } else {
      // Heading to Delivery: Dropoff stop for outbound (leg 0) or return (leg 1)
      if (legIndex === 1) {
        return trip.stops.find((s) => s.stop_sequence === 4) ??
               trip.stops.find((s) => s.stop_type === 'Dropoff' && s.stop_sequence > 2) ??
               trip.stops[trip.stops.length - 1];
      }
      return trip.stops.find((s) => s.stop_type === 'Dropoff') ??
             trip.stops.find((s) => s.stop_sequence === 2) ??
             trip.stops[trip.stops.length - 1];
    }
  }, [trip?.stops, isHeadingToPickup, legIndex]);

  const handleAddPhoto = async () => {
    try {
      const photo = await choosePhoto();
      if (photo) {
        setArrivalPhoto(photo);
      }
    } catch (e) {
      Alert.alert('Camera Error', getApiErrorMessage(e));
    }
  };

  const goToStop = async () => {
    if (!trip || hasArrivedRef.current) return;

    if (!arrivalPhoto) {
      Alert.alert(
        'Arrival Photo Required',
        'Please capture or attach an arrival photo before confirming arrival.',
        [
          { text: 'Add Image 📷', onPress: handleAddPhoto },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    hasArrivedRef.current = true;
    setArriving(true);
    try {
      if (arrivalPhoto && trip.id) {
        try {
          const arrivalOp = isHeadingToPickup
            ? (legIndex === 1 ? 'return_loading_arrival' : 'pickup_arrival')
            : (legIndex === 1 ? 'return_delivery_arrival' : 'delivery_arrival');

          await tripService.uploadPhoto(
            trip.id,
            isHeadingToPickup ? 'cargo' : 'pod',
            {
              uri: arrivalPhoto.uri,
              fileName: arrivalPhoto.fileName,
              mimeType: arrivalPhoto.mimeType,
              location: arrivalPhoto.location ? {
                latitude: arrivalPhoto.location.latitude,
                longitude: arrivalPhoto.location.longitude,
                timestamp: arrivalPhoto.location.timestamp,
              } : null,
            },
            legIndex,
            arrivalOp
          );
        } catch (photoErr) {
          console.warn('Arrival photo upload warning:', photoErr);
        }
      }

      if (ws === 'GOING_TO_RETURN_STOP' || ws === 'ARRIVED_AT_RETURN_STOP' || ws === 'RETURN_STOP_VERIFICATION') {
        await tripService.updateStatus(trip.id, 'InTransit', 'ARRIVED_AT_RETURN_STOP');
        router.replace({ pathname: '/trip/stop', params: { legIndex: '1' } } as any);
      } else if (ws === 'GOING_TO_STOP' || ws === 'ARRIVED_AT_STOP' || ws === 'STOP_VERIFICATION') {
        await tripService.updateStatus(trip.id, 'InTransit', 'ARRIVED_AT_STOP');
        router.replace({ pathname: '/trip/stop', params: { legIndex: '0' } } as any);
      } else if (isHeadingToPickup) {
        await tripService.updateStatus(trip.id, 'Loading', 'ARRIVED_AT_PICKUP');
        router.replace('/trip/pickup' as any);
      } else {
        const isFinal = legIndex === 1 || (activeStop ? activeStop.stop_sequence === (trip.stops?.length ?? 1) : true);
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
    openInGoogleMaps(activeStop);
  };



  const lastPostTimeRef = useRef<number>(0);

  // Stream live position to backend and auto-detect arrival at the dropoff.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      // Stop tracking if trip is completed, cancelled, or not active
      const isTrackable =
        trip &&
        (['Loading', 'InTransit', 'Delayed'].includes(trip.status) ||
          (trip.status === 'Scheduled' && trip.driver_workflow_state === 'GOING_TO_PICKUP'));
      if (!isTrackable || cancelled) return;

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

          // Send throttled location update to backend every 15 seconds
          const now = Date.now();
          if (trip?.id && now - lastPostTimeRef.current >= 15000) {
            lastPostTimeRef.current = now;
            tripService.sendLocationUpdate(trip.id, {
              latitude: lat,
              longitude: lng,
              speed_kph: loc.coords.speed != null && loc.coords.speed >= 0 ? loc.coords.speed * 3.6 : null,
              heading_deg: loc.coords.heading != null && loc.coords.heading >= 0 ? loc.coords.heading : null,
              accuracy_m: loc.coords.accuracy != null ? loc.coords.accuracy : null,
              recorded_at: new Date(loc.timestamp).toISOString(),
            });
          }

          if (activeStop) {
            const dist = distanceMeters(lat, lng, activeStop.location_lat, activeStop.location_lng);
            setDistanceToTarget(dist);
            if (dist <= ARRIVAL_RADIUS_M && !hasArrivedRef.current && arrivalPhoto) goToStop();
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStop?.id, trip?.id, trip?.status, trip?.driver_workflow_state]);

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

  const recenterMap = useCallback(() => {
    if (!mapRef.current) return;
    if (position && activeStop) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: position.lat, longitude: position.lng },
          { latitude: activeStop.location_lat, longitude: activeStop.location_lng },
        ],
        { edgePadding: { top: 200, right: 60, bottom: 300, left: 60 }, animated: true }
      );
    } else if (position) {
      mapRef.current.animateToRegion({
        latitude: position.lat,
        longitude: position.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }, 500);
    } else if (activeStop) {
      mapRef.current.animateToRegion({
        latitude: activeStop.location_lat,
        longitude: activeStop.location_lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }, 500);
    }
  }, [position, activeStop]);

  const initialFitDone = useRef(false);
  useEffect(() => {
    if ((position || activeStop) && mapRef.current && !initialFitDone.current) {
      initialFitDone.current = true;
      setTimeout(() => {
        recenterMap();
      }, 600);
    }
  }, [position, activeStop, recenterMap]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* ── Background Map (OpenStreetMap OSM Layer) ────────────────────── */}
      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' || !MapView ? (
          <View style={[StyleSheet.absoluteFill, styles.centerBox, { backgroundColor: '#EEF1F6' }]}>
            <MapPin size={36} color="#FA634E" />
            <Text style={{ color: '#3E3C3D', marginTop: 12, fontWeight: '700', fontSize: Typography.base }}>
              OpenStreetMap View
            </Text>
            <Text style={{ color: '#64748B', marginTop: 4, fontSize: Typography.xs }}>
              Open on mobile device for interactive OpenStreetMap navigation
            </Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: center.lat,
              longitude: center.lng,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            {/* OpenStreetMap (OSM) Tile Layer */}
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              minimumZ={1}
              flipY={false}
              shouldReplaceMapContent={true}
              tileSize={256}
              zIndex={1}
            />

            {/* Route Polyline */}
            {routeCoords && routeCoords.length > 0 ? (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#FA634E"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                zIndex={5}
              />
            ) : position && activeStop ? (
              <Polyline
                coordinates={[
                  { latitude: position.lat, longitude: position.lng },
                  { latitude: activeStop.location_lat, longitude: activeStop.location_lng },
                ]}
                strokeColor="#FA634E"
                strokeWidth={4}
                lineDashPattern={[6, 6]}
                zIndex={5}
              />
            ) : null}

            {/* Destination Stop Marker */}
            {activeStop && (
              <Marker
                coordinate={{ latitude: activeStop.location_lat, longitude: activeStop.location_lng }}
                anchor={{ x: 0.5, y: 0.9 }}
                zIndex={10}
              >
                <View style={styles.destPinOuter}>
                  <View style={styles.destPinInner}>
                    <MapPin size={18} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                  <View style={styles.destPinArrow} />
                </View>
              </Marker>
            )}

            {/* Live Driver Truck Marker */}
            {position && (
              <Marker
                coordinate={{ latitude: position.lat, longitude: position.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                flat
                zIndex={20}
              >
                <View style={styles.driverPinPulse}>
                  <View style={styles.driverPinOuter}>
                    <Truck size={17} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                </View>
              </Marker>
            )}
          </MapView>
        )}
      </View>

      {/* ── Top Header Overlay ─────────────────────────────────────────── */}
      <View style={[styles.topOverlay, { top: Math.max(insets.top + 8, 16) }]}>
        {/* Outer Shadow Container */}
        <View style={styles.unifiedTopCardShadow}>
          {/* Inner Clipped Curved White Card */}
          <View style={styles.unifiedTopCardInner}>
            {/* Row 1: Back Arrow (Left), Current Step Info (Center), Report Delay Pill (Right) */}
            <View style={styles.topControlHeaderRow}>
              <TouchableOpacity
                style={styles.backCircleBtn}
                activeOpacity={0.8}
                onPress={() => router.back()}
              >
                <ArrowLeft size={18} color="#3E3C3D" strokeWidth={2.2} />
              </TouchableOpacity>

              <View style={styles.headerTitleCenter}>
                <View style={styles.currentStepTagRow}>
                  <View style={styles.coralIndicatorDot} />
                  <Text style={styles.currentStepTag}>CURRENT STEP</Text>
                </View>
                <Text style={styles.headerStateTitle} numberOfLines={1}>
                  {isHeadingToPickup ? 'On the way to pickup' : 'On the way to delivery'}
                </Text>
              </View>

              <DelayButton onPress={() => setDelayModalVisible(true)} />
            </View>

            {/* Subtle Horizontal Divider */}
            <View style={styles.subtleDivider} />

            {/* Row 2: Full Width Connected 4-Stage Stepper */}
            <View style={styles.fullWidthStepperContainer}>
              <TripProgressStepper currentStep={isHeadingToPickup ? 1 : 3} />
            </View>
          </View>
        </View>
      </View>

      {/* ── Floating Controls on Map (ETA Pill + Recenter Button) ────────── */}
      {(displayDistance || displayEta) && (
        <View style={[styles.floatingEtaContainer, { top: Math.max(insets.top + 8, 16) + 124 }]}>
          <View style={styles.floatingEtaPill}>
            <View style={[styles.etaPulseDot, { backgroundColor: position ? '#10B981' : '#F59E0B' }]} />
            {displayDistance ? (
              <Text style={styles.floatingDistanceText}>{displayDistance}</Text>
            ) : null}
            {displayDistance && displayEta ? (
              <Text style={styles.floatingEtaDivider}>•</Text>
            ) : null}
            {displayEta ? (
              <Text style={styles.floatingEtaText}>{displayEta} remaining</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Floating Recenter Map Button */}
      <TouchableOpacity
        style={[styles.floatingRecenterBtn, { bottom: Math.max(insets.bottom + 16, 24) + 225 }]}
        activeOpacity={0.85}
        onPress={recenterMap}
      >
        <Navigation size={18} color="#FA634E" strokeWidth={2.4} />
      </TouchableOpacity>


      {/* Bottom Sheet Container */}
      <View style={styles.bottomCardShadow}>
        <View style={[styles.bottomCardInner, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          {/* 1. Destination Information Block with Add Photo button */}
          <View style={styles.destinationBlock}>
            <View style={styles.destinationRow}>
              <View style={styles.destinationTextCol}>
                <Text style={styles.destinationLabel}>
                  {isHeadingToPickup ? 'PICKING UP AT' : 'DELIVERING TO'}
                </Text>
                <Text style={styles.destinationName} numberOfLines={1}>
                  {stopLabel(activeStop, isHeadingToPickup ? 'Pickup Location' : 'Delivery Location')}
                </Text>
                <Text style={styles.destinationAddress} numberOfLines={2}>
                  {stopAddress(activeStop) ?? (isHeadingToPickup ? "Pickup Point, Saudi Arabia" : "Delivery Destination, Saudi Arabia")}
                </Text>
              </View>

              {/* Photo Upload Tile (Matching user screenshot) */}
              {arrivalPhoto ? (
                <View style={styles.photoTileWrapper}>
                  <TouchableOpacity
                    style={styles.arrivalPhotoThumbBox}
                    activeOpacity={0.85}
                    onPress={() => setPreviewPhoto(arrivalPhoto)}
                  >
                    <Image source={{ uri: arrivalPhoto.uri }} style={styles.arrivalPhotoThumb} />
                    <View style={styles.photoCheckBadge}>
                      <CheckCircle2 size={11} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    activeOpacity={0.7}
                    onPress={() => setArrivalPhoto(null)}
                  >
                    <Trash2 size={11} color="#FFFFFF" strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addArrivalPhotoBtn}
                  activeOpacity={0.8}
                  onPress={handleAddPhoto}
                >
                  <View style={styles.addPhotoIconCircle}>
                    <Camera size={18} color="#FA634E" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.addPhotoBtnText}>Add Image</Text>
                  <Text style={styles.requiredBadge}>Required</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 2. PRIMARY ACTION: I'VE ARRIVED AT PICKUP */}
          <TouchableOpacity
            style={[
              styles.primaryArrivedBtn,
              { backgroundColor: !arrivalPhoto ? '#94A3B8' : (isHeadingToPickup ? '#FA634E' : '#10B981') },
              arriving && { opacity: 0.6 }
            ]}
            activeOpacity={0.88}
            onPress={goToStop}
            disabled={arriving}
          >
            <Text style={styles.primaryArrivedBtnText}>
              {arriving
                ? 'Updating State…'
                : !arrivalPhoto
                ? 'ADD IMAGE TO CONFIRM ARRIVAL'
                : isHeadingToPickup
                ? "I'VE ARRIVED AT PICKUP"
                : "I'VE ARRIVED AT DELIVERY"}
            </Text>
          </TouchableOpacity>

          {/* 3. SECONDARY ACTION: GO TO PICKUP (External Navigation Tile) */}
          <TouchableOpacity
            style={styles.secondaryNavTile}
            activeOpacity={0.85}
            onPress={handleOpenExternalNavigation}
          >
            <View style={styles.navTileIconBadge}>
              <Navigation size={16} color="#FA634E" strokeWidth={2.4} />
            </View>

            <View style={styles.navTileTextCol}>
              <Text style={styles.navTileTitle}>
                {isHeadingToPickup ? 'GO TO PICKUP' : 'GO TO DELIVERY'}
              </Text>
              <Text style={styles.navTileSubtext}>Open navigation app</Text>
            </View>

            <ArrowUpRight size={18} color="#94A3B8" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>

      <DelayReportModal
        visible={delayModalVisible}
        tripId={trip?.id ?? null}
        onClose={() => setDelayModalVisible(false)}
        onSuccess={() => refetch()}
      />

      <GeotagPhotoModal
        visible={!!previewPhoto}
        photo={previewPhoto ? { uri: previewPhoto.uri, title: 'Arrival Photo Preview', location: previewPhoto.location } : null}
        onClose={() => setPreviewPhoto(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerBox: { alignItems: 'center', justifyContent: 'center' },
  driverPinPulse: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(250, 99, 78, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPinOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FA634E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  destPinOuter: {
    alignItems: 'center',
  },
  destPinInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  destPinArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 0,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1E293B',
    marginTop: -1,
  },
  floatingEtaContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 45,
  },
  floatingEtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    gap: 6,
  },
  etaPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  floatingDistanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FA634E',
  },
  floatingEtaDivider: {
    fontSize: 12,
    color: '#94A3B8',
  },
  floatingEtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingRecenterBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 45,
  },

  topOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
  },
  unifiedTopCardShadow: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  unifiedTopCardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topControlHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 36,
  },
  backCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  headerTitleCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  currentStepTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  coralIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FA634E',
  },
  currentStepTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  headerStateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
    textAlign: 'center',
  },
  delayPillBtn: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: '#FFD0C7',
    borderRadius: 17,
    paddingHorizontal: 11,
    shadowColor: '#FA634E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  delayPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FA634E',
  },
  subtleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  fullWidthStepperContainer: {
    width: '100%',
    paddingHorizontal: 2,
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
  bottomCardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  bottomCardInner: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  destinationBlock: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationTextCol: {
    flex: 1,
    paddingRight: 10,
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
  addArrivalPhotoBtn: {
    width: 76,
    height: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FA634E',
    borderStyle: 'dashed',
    backgroundColor: '#FFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  addPhotoIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFEBE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  addPhotoBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FA634E',
  },
  requiredBadge: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#E11D48',
    marginTop: 1,
  },
  photoTileWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  arrivalPhotoThumbBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  arrivalPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  photoCheckBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
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
  secondaryNavTile: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  navTileIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE4DE',
  },
  navTileTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  navTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  navTileSubtext: {
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
