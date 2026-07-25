import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button } from '../../components';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService } from '../../lib/trips';
import { capturePhoto, type CapturedPhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';

const MIN_PHOTOS = 1;

const PickupVerificationScreen = () => {
  const router = useRouter();
  const { trip, loading } = useCurrentTrip();
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addPhoto = async () => {
    try {
      const photo = await capturePhoto();
      if (photo) setPhotos((prev) => [...prev, photo].slice(0, 3));
    } catch (e) {
      Alert.alert('Camera', getApiErrorMessage(e));
    }
  };

  const canConfirm =
    !!trip && trip.status === 'AtPickup' && photos.length >= MIN_PHOTOS && !submitting && !loading;

  const confirm = async () => {
    if (!trip || !canConfirm) return;
    setSubmitting(true);
    try {
      for (const photo of photos) {
        await tripService.uploadPhoto(trip.id, 'cargo', photo);
      }
      await tripService.updateStatus(trip.id, 'InTransit');
      router.back();
    } catch (e) {
      Alert.alert('Could not start trip', getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pickup Verification</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Trip Summary Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Trip ID</Text>
            <Text style={styles.summaryValue}>#{trip?.ref_id ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Customer</Text>
            <Text style={styles.summaryValue}>{trip?.customer?.name ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cargo</Text>
            <Text style={styles.summaryValue}>{trip?.cargo_type ?? '—'}</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.instructionIcon}>ℹ️</Text>
          <Text style={styles.instructionText}>
            Take at least one clear photo of the cargo before you start the trip.
          </Text>
        </View>

        {/* Camera Upload Area */}
        <TouchableOpacity style={styles.uploadArea} activeOpacity={0.8} onPress={addPhoto}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.uploadTitle}>Take Photo</Text>
          <Text style={styles.uploadSub}>Tap to open camera</Text>
        </TouchableOpacity>

        {/* Photo Previews */}
        <Text style={styles.sectionTitle}>Photos ({photos.length}/3)</Text>
        <View style={styles.photosGrid}>
          {[0, 1, 2].map((i) => (
            <TouchableOpacity
              key={i}
              style={[styles.photoPreview, photos[i] ? styles.photoFilled : styles.photoEmpty]}
              activeOpacity={0.8}
              onPress={photos[i] ? undefined : addPhoto}
            >
              {photos[i] ? (
                <Image source={{ uri: photos[i].uri }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>＋</Text>
                  <Text style={styles.photoPlaceholderText}>Photo {i + 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.checklist}>
          {[
            'Front of cargo/shipment',
            'Side view with labels visible',
            'Loading bay / truck interior',
          ].map((item, i) => (
            <View key={i} style={styles.checkItem}>
              <View style={[styles.checkBox, photos.length > i ? styles.checkBoxDone : null]}>
                {photos.length > i && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <Button
          title={submitting ? 'Starting…' : 'Confirm Pickup & Start Trip'}
          onPress={confirm}
          disabled={!canConfirm}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.gray900,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
  },
  placeholder: {
    width: 40,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight || '#FFF7ED',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  instructionIcon: {
    fontSize: 18,
  },
  instructionText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
  },
  cameraIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  uploadTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  uploadSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  photoPreview: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  photoEmpty: {
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: Colors.gray50,
  },
  photoFilled: {
    borderWidth: 0,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 24,
    color: Colors.gray400,
  },
  photoPlaceholderText: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginTop: 4,
  },
  checklist: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  checkText: {
    fontSize: Typography.sm,
    color: Colors.gray700,
  },
});

export default PickupVerificationScreen;
