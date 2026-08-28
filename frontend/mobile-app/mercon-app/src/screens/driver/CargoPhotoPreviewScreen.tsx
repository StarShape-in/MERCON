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
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  onClose?: () => void;
}

export const CargoPhotoPreviewScreen: React.FC<CargoPhotoPreviewScreenProps> = ({
  photoUri: propsUri,
  locationName: propsLoc,
  fullAddress: propsAddr,
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
      await Share.share({
        title: 'Cargo Photo Evidence',
        message: `Cargo Photo Evidence - ${locationName}\nGPS: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`,
        url: photoUri,
      });
    } catch (error) {
      // Ignore share errors or dismissals
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* TOP HEADER BAR (Crisp Pure White) */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top + 6, 12) }]}>
        <TouchableOpacity
          style={styles.iconCircleBtn}
          activeOpacity={0.8}
          onPress={handleClose}
        >
          <X size={18} color="#3E3C3D" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Cargo Photo Preview</Text>

        <TouchableOpacity
          style={styles.iconCircleBtn}
          activeOpacity={0.8}
          onPress={handleShare}
        >
          <Share2 size={18} color="#3E3C3D" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* PHOTO VIEWPORT (Full Dominant Photo) */}
      <View style={styles.photoViewport}>
        <Image
          source={{ uri: photoUri }}
          style={styles.dominantPhoto}
          resizeMode="cover"
        />

        {/* SOLID WHITE GEOTAG CARD (Floated over Bottom) */}
        <View style={[styles.geotagCardPositioner, { bottom: Math.max(insets.bottom + 12, 16) }]}>
          <GoogleMapsGeotagPreview
            latitude={latitude}
            longitude={longitude}
            timestamp={timestamp}
            locationName={locationName}
            fullAddress={fullAddress}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 30,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E3C3D',
    textAlign: 'center',
  },
  photoViewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  dominantPhoto: {
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  geotagCardPositioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
  },
});
