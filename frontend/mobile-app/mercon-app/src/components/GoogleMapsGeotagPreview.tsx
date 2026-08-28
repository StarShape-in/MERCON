import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Calendar, Clock, Globe, Compass, MapPin } from 'lucide-react-native';

export interface GoogleMapsGeotagProps {
  latitude?: number;
  longitude?: number;
  timestamp?: string | null;
  locationName?: string | null;
  fullAddress?: string | null;
  address?: string | null;
  compact?: boolean;
}

export const GoogleMapsGeotagPreview: React.FC<GoogleMapsGeotagProps> = ({
  latitude = 11.0467,
  longitude = 76.0747,
  timestamp,
  locationName,
  fullAddress,
  address,
}) => {
  const displayLocation = locationName ?? address ?? 'Up Hill, Malappuram, India';
  const displayFullAddress = fullAddress ?? address ?? 'Up Hill, Malappuram,\nKerala 676519, India';

  const dateObj = timestamp ? new Date(timestamp) : new Date('2026-08-28T09:23:00');
  
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }); // e.g. "Aug 28, 2026"

  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }); // e.g. "09:23 AM"

  const latStr = `${latitude.toFixed(4)}°N`;
  const lngStr = `${longitude.toFixed(4)}°E`;

  return (
    <View style={styles.cardContainer}>
      {/* Main Content Row: Map on Left, Details on Right */}
      <View style={styles.mainRow}>
        {/* LEFT SIDE: Google Maps Style Preview */}
        <View style={styles.mapTileWrapper}>
          {Platform.OS === 'web' ? (
            <View style={styles.webMapSim}>
              <View style={styles.simRoadHorizontal} />
              <View style={styles.simRoadVertical} />
              <Text style={styles.simLocalityText}>Up Hill</Text>
              <View style={styles.pinWrapper}>
                <MapPin size={22} color="#FA634E" fill="#FA634E" />
              </View>
            </View>
          ) : (
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.nativeMap}
              initialRegion={{
                latitude,
                longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 1 }}>
                <MapPin size={22} color="#FA634E" fill="#FA634E" />
              </Marker>
            </MapView>
          )}

          {/* Google Maps Subtle Branding Label */}
          <View style={styles.googleAttributionBadge}>
            <Text style={styles.googleAttributionText}>Google</Text>
          </View>
        </View>

        {/* RIGHT SIDE: Location Name + 2-Column Metadata Grid */}
        <View style={styles.detailsCol}>
          {/* Prominent Location Name */}
          <Text style={styles.locationTitle} numberOfLines={1}>
            {displayLocation}
          </Text>

          {/* Detailed Address */}
          <Text style={styles.fullAddressText} numberOfLines={2}>
            {displayFullAddress}
          </Text>

          {/* Subtle Horizontal Divider */}
          <View style={styles.innerDivider} />

          {/* 2-Column Metadata Layout */}
          <View style={styles.metadataGrid}>
            {/* Column 1: DATE & LATITUDE */}
            <View style={styles.metadataCol}>
              <View style={styles.metaItem}>
                <View style={styles.labelRow}>
                  <Calendar size={10} color="#FA634E" strokeWidth={2.4} />
                  <Text style={styles.metaLabel}>DATE</Text>
                </View>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>

              <View style={[styles.metaItem, { marginTop: 8 }]}>
                <View style={styles.labelRow}>
                  <Globe size={10} color="#FA634E" strokeWidth={2.4} />
                  <Text style={styles.metaLabel}>LATITUDE</Text>
                </View>
                <Text style={styles.metaValue}>{latStr}</Text>
              </View>
            </View>

            {/* Column 2: TIME & LONGITUDE */}
            <View style={styles.metadataCol}>
              <View style={styles.metaItem}>
                <View style={styles.labelRow}>
                  <Clock size={10} color="#FA634E" strokeWidth={2.4} />
                  <Text style={styles.metaLabel}>TIME</Text>
                </View>
                <Text style={styles.metaValue}>{formattedTime}</Text>
              </View>

              <View style={[styles.metaItem, { marginTop: 8 }]}>
                <View style={styles.labelRow}>
                  <Compass size={10} color="#FA634E" strokeWidth={2.4} />
                  <Text style={styles.metaLabel}>LONGITUDE</Text>
                </View>
                <Text style={styles.metaValue}>{lngStr}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* BOTTOM OF CARD: Subtle Attribution Row */}
      <View style={styles.bottomAttributionRow}>
        <Text style={styles.bottomAttributionText}>
          <Text style={styles.googleBrandText}>Google Maps</Text> · Captured with GPS
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mapTileWrapper: {
    width: 110,
    height: 125,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nativeMap: {
    ...StyleSheet.absoluteFill,
  },
  webMapSim: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  simRoadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CBD5E1',
    top: 55,
  },
  simRoadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CBD5E1',
    left: 48,
  },
  simLocalityText: {
    position: 'absolute',
    top: 12,
    left: 10,
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  pinWrapper: {
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleAttributionBadge: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  googleAttributionText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#5F6368',
  },
  detailsCol: {
    flex: 1,
    marginLeft: 14,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E3C3D',
    lineHeight: 19,
  },
  fullAddressText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 15,
  },
  innerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  metadataGrid: {
    flexDirection: 'row',
  },
  metadataCol: {
    flex: 1,
  },
  metaItem: {
    flexDirection: 'column',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3E3C3D',
    marginTop: 1,
  },
  bottomAttributionRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  bottomAttributionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  googleBrandText: {
    fontWeight: '700',
    color: '#64748B',
  },
});
