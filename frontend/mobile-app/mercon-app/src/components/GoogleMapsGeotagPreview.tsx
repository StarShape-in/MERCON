import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react-native';
import { Radius } from '../theme/tokens';

export interface GoogleMapsGeotagProps {
  latitude: number;
  longitude: number;
  timestamp?: string | null;
  address?: string | null;
  compact?: boolean;
}

export const GoogleMapsGeotagPreview: React.FC<GoogleMapsGeotagProps> = ({
  latitude,
  longitude,
  timestamp,
  address,
  compact = false,
}) => {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const coordStr = `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <MapPin size={10} color="#EA4335" fill="#EA4335" />
          <Text style={styles.compactLocationText} numberOfLines={1}>
            {address ?? coordStr}
          </Text>
        </View>
        <View style={styles.compactFooter}>
          <Text style={styles.compactSubText} numberOfLines={1}>
            {address ? coordStr : ''} {formattedTime ? `• ${formattedTime}` : ''}
          </Text>
          <View style={styles.verifiedDot}>
            <ShieldCheck size={9} color="#34D399" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <View style={styles.fullHeader}>
        <View style={styles.pinCircle}>
          <MapPin size={13} color="#EA4335" fill="#EA4335" />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.fullTitle} numberOfLines={1}>
            {address ?? 'Google Maps Geotag Location'}
          </Text>
          <Text style={styles.fullSub} numberOfLines={1}>
            {coordStr} {formattedTime ? `• ${formattedTime}` : ''}
          </Text>
        </View>
        <View style={styles.gpsVerifiedBadge}>
          <Navigation size={10} color="#38BDF8" />
          <Text style={styles.gpsVerifiedText}>GPS</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: Radius.xs ?? 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactLocationText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  compactSubText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  verifiedDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: Radius.md ?? 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: 4,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 67, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  fullTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 1,
  },
  gpsVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.full ?? 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  gpsVerifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
  },
});
