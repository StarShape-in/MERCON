import React from 'react';
import {
  Modal, View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Radius, Typography, Spacing } from '../theme/tokens';
import { GoogleMapsGeotagPreview } from './GoogleMapsGeotagPreview';

export interface GeotagPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  photo: {
    uri: string;
    title?: string;
    location?: {
      latitude: number;
      longitude: number;
      timestamp?: string | null;
      address?: string | null;
    } | null;
  } | null;
}

export const GeotagPhotoModal: React.FC<GeotagPhotoModalProps> = ({
  visible,
  onClose,
  photo,
}) => {
  if (!photo) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <SafeAreaView style={styles.safeContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={onClose}>
            <X size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {photo.title ?? 'Geotagged Photo Preview'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Full Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.fullImage}
            resizeMode="contain"
          />

          {/* Bottom Google Maps Geotag Overlay Banner */}
          {!!photo.location && (
            <View style={styles.geotagBannerWrapper}>
              <GoogleMapsGeotagPreview
                latitude={photo.location.latitude}
                longitude={photo.location.longitude}
                timestamp={photo.location.timestamp}
                address={photo.location.address}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: '#0B0F17',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.white,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#000000',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  geotagBannerWrapper: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
  },
});
