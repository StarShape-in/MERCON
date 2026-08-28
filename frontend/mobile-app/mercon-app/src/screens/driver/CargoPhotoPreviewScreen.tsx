import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" translucent />

      {/* TOP BAR */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          style={styles.closeCircleBtn}
          activeOpacity={0.8}
          onPress={handleClose}
        >
          <X size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Cargo Photo Preview</Text>

        {/* Balance spacer */}
        <View style={styles.headerSpacer} />
      </View>

      {/* PHOTO CONTAINER (Full and Visually Dominant) */}
      <View style={styles.photoViewport}>
        <Image
          source={{ uri: photoUri }}
          style={styles.dominantPhoto}
          resizeMode="cover"
        />

        {/* GEOTAG INFORMATION CARD (Solid White Card Floated over Bottom) */}
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
    backgroundColor: '#1E293B',
  },
  headerBar: {
    height: 90,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    zIndex: 30,
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  photoViewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  dominantPhoto: {
    width: '100%',
    height: '100%',
    opacity: 1, // Full opacity, no darkening or blur
  },
  geotagCardPositioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
  },
});
