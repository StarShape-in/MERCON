import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Truck } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService } from '../../lib/trips';
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
  const { trip, loading } = useCurrentTrip();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [arriving, setArriving] = useState(false);
  const hasArrivedRef = useRef(false);

  const dropoff = trip?.stops?.find((s) => s.stop_type === 'Dropoff') ?? null;

  const goToDelivery = async () => {
    if (!trip || hasArrivedRef.current) return;
    hasArrivedRef.current = true;
    setArriving(true);
    try {
      await tripService.updateStatus(trip.id, 'AtDelivery');
      router.replace('/trip/delivery');
    } catch (e) {
      hasArrivedRef.current = false;
      setArriving(false);
      Alert.alert('Could not update', getApiErrorMessage(e));
    }
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
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setPosition({ lat, lng });

          if (dropoff && !hasArrivedRef.current) {
            const dist = distanceMeters(lat, lng, dropoff.location_lat, dropoff.location_lng);
            if (dist <= ARRIVAL_RADIUS_M) goToDelivery();
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropoff?.id]);

  if (loading && !trip) {
    return (
      <SafeAreaView style={[styles.container, styles.centerBox]}>
        <ActivityIndicator color={Colors.white} />
      </SafeAreaView>
    );
  }

  const center = position ?? (dropoff ? { lat: dropoff.location_lat, lng: dropoff.location_lng } : { lat: 24.7136, lng: 46.6753 });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B1A" />

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.2,
            longitudeDelta: 0.2,
          }}
          region={position ? { latitude: position.lat, longitude: position.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 } : undefined}
        >
          <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} flipY={false} />

          {position && (
            <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.driverPin}>
                <Truck size={16} color={Colors.white} strokeWidth={2.4} />
              </View>
            </Marker>
          )}

          {dropoff && (
            <Marker coordinate={{ latitude: dropoff.location_lat, longitude: dropoff.location_lng }} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.destPin}>
                <MapPin size={18} color={Colors.white} strokeWidth={2.4} />
              </View>
            </Marker>
          )}
        </MapView>

        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.backCircle} activeOpacity={0.8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.gray900} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>#{trip?.ref_id ?? '—'}</Text>
            <Text style={styles.headerSub}>{trip?.customer?.name ?? 'Delivery in progress'}</Text>
          </View>
        </View>

        {!position && (
          <View style={styles.gpsNotice}>
            <Text style={styles.gpsNoticeText}>Waiting for GPS signal…</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomCard}>
        <Text style={styles.bottomTitle}>Heading to delivery</Text>
        <Text style={styles.bottomSub}>
          The app will detect your arrival automatically. If it doesn't, confirm manually below.
        </Text>
        <TouchableOpacity
          style={[styles.arrivedBtn, arriving && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={goToDelivery}
          disabled={arriving}
        >
          <Text style={styles.arrivedBtnText}>{arriving ? 'Updating…' : "I've Arrived"}</Text>
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
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  headerCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
    ...Shadows.lg,
  },
  bottomTitle: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: 4,
  },
  bottomSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  arrivedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  arrivedBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.base,
  },
});

export default LiveNavigationScreen;
