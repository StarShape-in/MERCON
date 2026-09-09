import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, StyleProp, ViewStyle, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LEAFLET_CSS, LEAFLET_JS } from '../../assets/leaflet/leafletBundle';
import { isValidCoordinate, type LatLng } from '../../lib/geo';

export interface MarkerInfo {
  coordinate: LatLng;
  title?: string | null;
  address?: string | null;
}

const DEFAULT_CENTER: LatLng = { latitude: 24.7136, longitude: 46.6753 }; // Riyadh, Saudi Arabia

export interface OsmMapViewProps {
  destination?: MarkerInfo | null;
  pickup?: MarkerInfo | null;
  driverPosition?: LatLng | null;
  routeCoordinates?: LatLng[] | null;
  initialCenter?: LatLng;
  zoomLevel?: number;
  showsUserLocation?: boolean;
  onMapReady?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface OsmMapViewRef {
  recenter: () => void;
}

export const OsmMapView = React.forwardRef<OsmMapViewRef, OsmMapViewProps>(({
  destination,
  pickup,
  driverPosition,
  routeCoordinates,
  initialCenter,
  zoomLevel = 14,
  onMapReady,
  style,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);

  React.useImperativeHandle(ref, () => ({
    recenter: () => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          try {
            var pts = [];
            if (destinationMarker) pts.push(destinationMarker.getLatLng());
            if (pickupMarker) pts.push(pickupMarker.getLatLng());
            if (driverMarker) pts.push(driverMarker.getLatLng());
            if (pts.length > 1) {
              map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 16 });
            } else if (pts.length === 1) {
              map.panTo(pts[0]);
            }
          } catch(e) {}
          true;
        `);
      }
    }
  }));

  // Validate coordinates before passing
  const validDestination = useMemo(() => {
    if (destination && isValidCoordinate(destination.coordinate.latitude, destination.coordinate.longitude)) {
      return destination;
    }
    return null;
  }, [destination]);

  const validPickup = useMemo(() => {
    if (pickup && isValidCoordinate(pickup.coordinate.latitude, pickup.coordinate.longitude)) {
      return pickup;
    }
    return null;
  }, [pickup]);

  const validDriverPos = useMemo(() => {
    if (driverPosition && isValidCoordinate(driverPosition.latitude, driverPosition.longitude)) {
      return driverPosition;
    }
    return null;
  }, [driverPosition]);

  const validRoute = useMemo(() => {
    if (!routeCoordinates || !Array.isArray(routeCoordinates) || routeCoordinates.length === 0) {
      return null;
    }
    const filtered = routeCoordinates.filter((c) => isValidCoordinate(c.latitude, c.longitude));
    return filtered.length > 0 ? filtered : null;
  }, [routeCoordinates]);

  // Determine starting center
  const centerLat = validDriverPos?.latitude ?? validDestination?.coordinate.latitude ?? initialCenter?.latitude ?? DEFAULT_CENTER.latitude;
  const centerLng = validDriverPos?.longitude ?? validDestination?.coordinate.longitude ?? initialCenter?.longitude ?? DEFAULT_CENTER.longitude;

  // Generate self-contained Leaflet HTML with locally bundled assets
  const htmlContent = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    ${LEAFLET_CSS}
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
    }
    /* Custom SVG Pin Styles */
    .dest-pin-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -100%);
    }
    .dest-pin-body {
      width: 36px;
      height: 36px;
      background: #FA634E;
      border: 3px solid #FFFFFF;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 10px rgba(250, 99, 78, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dest-pin-icon {
      transform: rotate(45deg);
      color: #FFFFFF;
      font-size: 16px;
      font-weight: bold;
    }
    .dest-pin-pulse {
      width: 14px;
      height: 6px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 50%;
      margin-top: 2px;
    }

    .truck-pin-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    }
    .truck-pin-body {
      width: 34px;
      height: 34px;
      background: #3E3C3D;
      border: 2.5px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 16px;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255, 255, 255, 0.7) !important;
      padding: 1px 5px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    ${LEAFLET_JS}

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([${centerLat}, ${centerLng}], ${zoomLevel});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var destinationMarker = null;
    var pickupMarker = null;
    var driverMarker = null;
    var routePolyline = null;

    // Custom Icon Creators
    function createDestIcon() {
      return L.divIcon({
        className: 'custom-dest-icon',
        html: '<div class="dest-pin-wrap"><div class="dest-pin-body"><span class="dest-pin-icon">📍</span></div><div class="dest-pin-pulse"></div></div>',
        iconSize: [36, 44],
        iconAnchor: [18, 44]
      });
    }

    function createPickupIcon() {
      return L.divIcon({
        className: 'custom-pickup-icon',
        html: '<div class="dest-pin-wrap"><div class="dest-pin-body" style="background:#3B82F6;"><span class="dest-pin-icon">📦</span></div><div class="dest-pin-pulse"></div></div>',
        iconSize: [36, 44],
        iconAnchor: [18, 44]
      });
    }

    function createTruckIcon() {
      return L.divIcon({
        className: 'custom-truck-icon',
        html: '<div class="truck-pin-wrap"><div class="truck-pin-body">🚚</div></div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
    }

    window.updateData = function(data) {
      try {
        var pointsToFit = [];

        // 1. Destination
        if (data.destination && data.destination.coordinate) {
          var destLatLng = [data.destination.coordinate.latitude, data.destination.coordinate.longitude];
          pointsToFit.push(destLatLng);
          if (!destinationMarker) {
            destinationMarker = L.marker(destLatLng, { icon: createDestIcon() }).addTo(map);
          } else {
            destinationMarker.setLatLng(destLatLng);
          }
        } else if (destinationMarker) {
          map.removeLayer(destinationMarker);
          destinationMarker = null;
        }

        // 2. Pickup
        if (data.pickup && data.pickup.coordinate) {
          var pickLatLng = [data.pickup.coordinate.latitude, data.pickup.coordinate.longitude];
          pointsToFit.push(pickLatLng);
          if (!pickupMarker) {
            pickupMarker = L.marker(pickLatLng, { icon: createPickupIcon() }).addTo(map);
          } else {
            pickupMarker.setLatLng(pickLatLng);
          }
        } else if (pickupMarker) {
          map.removeLayer(pickupMarker);
          pickupMarker = null;
        }

        // 3. Driver
        if (data.driverPosition) {
          var driverLatLng = [data.driverPosition.latitude, data.driverPosition.longitude];
          pointsToFit.push(driverLatLng);
          if (!driverMarker) {
            driverMarker = L.marker(driverLatLng, { icon: createTruckIcon(), zIndexOffset: 1000 }).addTo(map);
          } else {
            driverMarker.setLatLng(driverLatLng);
          }
        } else if (driverMarker) {
          map.removeLayer(driverMarker);
          driverMarker = null;
        }

        // 4. Route Polyline
        if (data.routeCoordinates && data.routeCoordinates.length > 0) {
          var polyCoords = data.routeCoordinates.map(function(c) { return [c.latitude, c.longitude]; });
          if (!routePolyline) {
            routePolyline = L.polyline(polyCoords, {
              color: '#FA634E',
              weight: 5,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);
          } else {
            routePolyline.setLatLngs(polyCoords);
          }
        } else if (routePolyline) {
          map.removeLayer(routePolyline);
          routePolyline = null;
        }

        // Fit Bounds if multiple points, else center
        if (pointsToFit.length > 1) {
          var bounds = L.latLngBounds(pointsToFit);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } else if (pointsToFit.length === 1) {
          map.panTo(pointsToFit[0]);
        }
      } catch (err) {
        // Safe degrade
      }
    };

    // Notify React Native that Leaflet map is initialized
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
    }
  </script>
</body>
</html>`;
  }, [centerLat, centerLng, zoomLevel]);

  // Sync data updates to WebView
  const syncMapData = useCallback(() => {
    if (!isReady || !webViewRef.current) return;
    const payload = JSON.stringify({
      destination: validDestination,
      pickup: validPickup,
      driverPosition: validDriverPos,
      routeCoordinates: validRoute,
    });
    webViewRef.current.injectJavaScript(`window.updateData(${payload}); true;`);
  }, [isReady, validDestination, validPickup, validDriverPos, validRoute]);

  useEffect(() => {
    syncMapData();
  }, [syncMapData]);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const raw = event.nativeEvent?.data;
        if (!raw) return;
        const msg = JSON.parse(raw);
        if (msg?.type === 'MAP_READY') {
          setIsReady(true);
          onMapReady?.();
          syncMapData();
        }
      } catch {
        // Safe ignore
      }
    },
    [onMapReady, syncMapData]
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        originWhitelist={['*']}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={false}
        androidLayerType="hardware"
        onMessage={handleMessage}
        scrollEnabled={false}
        overScrollMode="never"
      />
      {!isReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FA634E" />
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8FAFC',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default OsmMapView;
