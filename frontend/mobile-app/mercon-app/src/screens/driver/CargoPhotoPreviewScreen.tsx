import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, StatusBar, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Share2 } from 'lucide-react-native';
import { GoogleMapsGeotagPreview } from '../../components/GoogleMapsGeotagPreview';

export interface CargoPhotoPreviewScreenProps {
  photoUri?: string;
  locationName?: string;
  fullAddress?: string;
  companyName?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  onClose?: () => void;
}

export const CargoPhotoPreviewScreen: React.FC<CargoPhotoPreviewScreenProps> = ({
  photoUri: propsUri,
  locationName: propsLoc,
  fullAddress: propsAddr,
  companyName: propsComp,
  latitude: propsLat,
  longitude: propsLng,
  timestamp: propsTime,
  onClose,
}) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Handle passed props or router params or fallback demo photo
  const photoUri = (params.photoUri as string) || propsUri || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
  const locationName = (params.locationName as string) || propsLoc || 'Up Hill, Malappuram, India';
  const fullAddress = (params.fullAddress as string) || propsAddr || 'Up Hill, Malappuram,\nKerala 676519, India';
  const companyName = (params.companyName as string) || propsComp || 'Horizon Distributors Co.';
  const latitude = params.latitude ? parseFloat(params.latitude as string) : (propsLat ?? 11.0467);
  const longitude = params.longitude ? parseFloat(params.longitude as string) : (propsLng ?? 76.0747);
  const timestamp = (params.timestamp as string) || propsTime || '2026-08-28T09:23:00.000Z';

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleShare = async () => {
    try {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      const dateStr = new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timeStr = new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const shareMessage = 
        `📷 MERCON CARGO PROOF OF EVIDENCE\n\n` +
        `🏢 Customer: ${companyName}\n` +
        `📍 Location: ${locationName}\n` +
        `📮 Address: ${fullAddress.replace(/\n/g, ' ')}\n` +
        `📅 Captured: ${dateStr} · ${timeStr}\n` +
        `🌐 GPS Coordinates: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E\n\n` +
        `🗺️ Google Maps Location:\n${mapsUrl}\n\n` +
        `🖼️ Cargo Photo:\n${photoUri}`;

      await Share.share({
        title: 'MERCON Cargo Proof Evidence',
        message: shareMessage,
        url: photoUri,
      });
    } catch (error) {
      // Dismissed or unsupported
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3E3C3D" translucent />

      {/* DARK CHARCOAL TOP NAVIGATION BAR */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <TouchableOpacity
          style={styles.iconCircleBtn}
          activeOpacity={0.8}
          onPress={handleClose}
        >
          <X size={18} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Cargo Photo Preview</Text>

        <TouchableOpacity
          style={styles.iconCircleBtn}
          activeOpacity={0.8}
          onPress={handleShare}
        >
          <Share2 size={18} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* PHOTO VIEWPORT (Full Dominant Photo, Original Brightness & Details) */}
      <View style={styles.photoViewport}>
        <Image
          source={{ uri: photoUri }}
          style={styles.dominantPhoto}
          resizeMode="cover"
        />

        {/* SOLID WHITE EDGE-TO-EDGE METADATA PANEL (Attached seamlessly to bottom of screen) */}
        <View style={styles.edgeToEdgePanelWrapper}>
          <GoogleMapsGeotagPreview
            latitude={latitude}
            longitude={longitude}
            timestamp={timestamp}
            locationName={locationName}
            fullAddress={fullAddress}
            companyName={companyName}
            bottomPadding={Math.max(insets.bottom + 14, 24)}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E3C3D',
  },
  headerBar: {
    backgroundColor: '#3E3C3D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 30,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  photoViewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  dominantPhoto: {
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  edgeToEdgePanelWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 50,
  },
});
