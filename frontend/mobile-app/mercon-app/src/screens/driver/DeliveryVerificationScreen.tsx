import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, GoogleMapsGeotagPreview, GeotagPhotoModal } from '../../components';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, stopAddress, stopLabel } from '../../lib/trips';
import { ArrowLeft, Check, Camera, ClipboardCheck, Trash2, MapPin } from 'lucide-react-native';
import { choosePhoto, type CapturedPhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';
import { safeSecureStore as SecureStore } from '../../lib/secure-store';

const DeliveryVerificationScreen = () => {
  const router = useRouter();
  const { trip, loading, setTrip } = useCurrentTrip();
  const pickupStop = trip?.stops?.find((s) => s.stop_type === 'Pickup') ?? null;
  const dropoffStop = trip?.stops?.find((s) => s.stop_type === 'Dropoff') ?? null;
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const uploadedIndices = useRef<Set<number>>(new Set());
  const inFlight = useRef(false);

  // Load draft photos from SecureStore on mount/trip load
  useEffect(() => {
    if (!trip?.id) return;
    const loadDraft = async () => {
      try {
        const key = `delivery_draft_photos_${trip.id}`;
        const saved = await SecureStore.getItemAsync(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPhotos(parsed);
          }
        }
      } catch (e) {
        console.error('Error loading draft photos:', e);
      }
    };
    loadDraft();
  }, [trip?.id]);

  // Save draft photos to SecureStore on change
  useEffect(() => {
    if (!trip?.id) return;
    const saveDraft = async () => {
      try {
        const key = `delivery_draft_photos_${trip.id}`;
        if (photos.length > 0) {
          await SecureStore.setItemAsync(key, JSON.stringify(photos));
        } else {
          await SecureStore.deleteItemAsync(key);
        }
      } catch (e) {
        console.error('Error saving draft photos:', e);
      }
    };
    saveDraft();
  }, [photos, trip?.id]);

  // Sync step with backend workflow state on load
  React.useEffect(() => {
    if (trip?.driver_workflow_state === 'REVIEW_COMPLETE') {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [trip?.driver_workflow_state]);

  const addPhoto = async () => {
    try {
      const photo = await choosePhoto();
      if (photo) {
        setPhotos((prev) => [...prev, photo].slice(0, 4));
        uploadedIndices.current.clear();
      }
    } catch (e) {
      Alert.alert('Camera', getApiErrorMessage(e));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
    uploadedIndices.current.clear();
  };

  const continueToReview = async () => {
    if (!trip || submitting) return;
    setSubmitting(true);
    try {
      for (let i = 0; i < photos.length; i++) {
        if (!uploadedIndices.current.has(i)) {
          await tripService.uploadPhoto(trip.id, 'pod', photos[i]);
          uploadedIndices.current.add(i);
        }
      }
      const updated = await tripService.updateStatus(trip.id, 'InTransit', 'REVIEW_COMPLETE');
      setTrip(updated);

      try {
        const key = `delivery_draft_photos_${trip.id}`;
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        console.error('Failed to delete draft key:', err);
      }

      setStep(2);
    } catch (e) {
      Alert.alert('Could not upload POD photos', getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const canComplete =
    !!trip && photos.length >= 4 && !submitting && !loading;

  const complete = async () => {
    if (!trip || !canComplete) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const updated = await tripService.updateStatus(trip.id, 'Completed', 'COMPLETED');
      setTrip(updated);
      router.replace('/trip/completed');
    } catch (e) {
      Alert.alert('Could not complete trip', getApiErrorMessage(e));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pickupTime = pickupStop?.actual_arrival ? new Date(pickupStop.actual_arrival).getTime() : null;
  const deliveryTime = dropoffStop?.actual_arrival ? new Date(dropoffStop.actual_arrival).getTime() : null;
  let durationText = '—';
  if (pickupTime && deliveryTime && deliveryTime > pickupTime) {
    const mins = Math.round((deliveryTime - pickupTime) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    durationText = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (submitting && step === 2) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.completingContent}>
          <View style={styles.completingIconCircle}>
            <ClipboardCheck size={72} color="#10B981" strokeWidth={1.5} />
          </View>
          <Text style={styles.completingTitle}>Completing Trip...</Text>
          <Text style={styles.completingSub}>Please wait while we save your trip details.</Text>
          <ActivityIndicator color="#E8450F" size="large" style={{ marginTop: Spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.gray900} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Verification</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <TouchableOpacity
                style={[styles.stepCircle, step >= s ? styles.stepActive : null]}
                activeOpacity={0.8}
                onPress={() => step > s && setStep(s)}
              >
                {step > s ? (
                  <Check size={16} color={Colors.white} strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepNum, step >= s ? styles.stepNumActive : null]}>{s}</Text>
                )}
              </TouchableOpacity>
              {s < 2 && (
                <View style={[styles.stepLine, step > s ? styles.stepLineActive : null]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, step === 1 ? styles.stepLabelActive : null]}>
            Delivery Photos
          </Text>
          <Text style={[styles.stepLabel, step === 2 ? styles.stepLabelActive : null]}>
            Review & Complete
          </Text>
        </View>

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Proof of Delivery</Text>
            <Text style={styles.stepSub}>
              Take POD photos of the delivered cargo (At least 1 photo required).
            </Text>
            <View style={styles.photoGrid}>
              {[0, 1, 2, 3].map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.photoSlot, photos[i] ? styles.photoFilled : null]}
                  activeOpacity={0.8}
                  onPress={photos[i] ? () => setPreviewPhoto(photos[i]) : addPhoto}
                >
                  {photos[i] ? (
                    <>
                      <Image source={{ uri: photos[i].uri }} style={styles.photoImg} />
                      {!!photos[i].location && (
                        <GoogleMapsGeotagPreview
                          latitude={photos[i].location!.latitude}
                          longitude={photos[i].location!.longitude}
                          timestamp={photos[i].location!.timestamp}
                          address={photos[i].location!.address}
                          compact
                        />
                      )}
                      <TouchableOpacity
                        style={styles.deletePhotoBtn}
                        activeOpacity={0.7}
                        onPress={() => removePhoto(i)}
                      >
                        <Trash2 size={14} color={Colors.white} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.photoEmpty}>
                      <Camera size={26} color={Colors.gray400} strokeWidth={1.8} />
                      <Text style={styles.photoEmptyText}>Photo {i + 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <GeotagPhotoModal
              visible={!!previewPhoto}
              photo={previewPhoto ? { uri: previewPhoto.uri, title: 'POD Photo Preview', location: previewPhoto.location } : null}
              onClose={() => setPreviewPhoto(null)}
            />
            <TouchableOpacity style={styles.addPhotoBtn} activeOpacity={0.8} onPress={addPhoto}>
              <Text style={styles.addPhotoText}>+ Add Photo</Text>
            </TouchableOpacity>
            <View style={styles.notice}>
              <ClipboardCheck size={16} color={Colors.gray600} strokeWidth={2} />
              <Text style={styles.noticeText}>
                Ensure the delivered cargo is clearly visible in the photo.
              </Text>
            </View>
            <Button
              title="Continue to Review"
              onPress={continueToReview}
              disabled={photos.length < 1 || submitting}
              style={{ backgroundColor: '#E8450F' }}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review &amp; Complete</Text>
            <Text style={styles.stepSub}>
              Confirm the delivery details, then complete the trip.
            </Text>

            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Trip ID</Text>
              <Text style={styles.timestampValue}>#{trip?.ref_id ?? '—'}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Customer</Text>
              <Text style={styles.timestampValue}>{trip?.customer?.name ?? '—'}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Pickup Location</Text>
              <Text style={styles.timestampValue}>{stopLabel(pickupStop) ?? '—'}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Delivery Location</Text>
              <Text style={styles.timestampValue}>{stopLabel(dropoffStop) ?? '—'}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Pickup Arrived</Text>
              <Text style={styles.timestampValue}>{formatTime(pickupStop?.actual_arrival)}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Loading Started</Text>
              <Text style={styles.timestampValue}>{formatTime(pickupStop?.actual_arrival)}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Loading Completed</Text>
              <Text style={styles.timestampValue}>{formatTime(pickupStop?.actual_departure)}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Delivery Arrived</Text>
              <Text style={styles.timestampValue}>{formatTime(dropoffStop?.actual_arrival)}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>POD Photos</Text>
              <Text style={styles.timestampValue}>{photos.length} Photos</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Distance</Text>
              <Text style={styles.timestampValue}>{trip?.planned_distance ? `${trip.planned_distance} km` : '—'}</Text>
            </View>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Duration</Text>
              <Text style={styles.timestampValue}>{durationText}</Text>
            </View>

            <Button
              title={submitting ? 'Completing…' : 'COMPLETE DELIVERY'}
              onPress={complete}
              disabled={!canComplete}
              style={{ backgroundColor: '#E8450F' }}
            />
          </View>
        )}
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    gap: 0,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: Colors.primary,
  },
  stepNum: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray500,
  },
  stepNumActive: {
    color: Colors.white,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.gray200,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  stepLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: Colors.primary,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.gray900,
  },
  stepSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 1.3,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  photoFilled: {
    borderStyle: 'solid',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoEmoji: {
    fontSize: 24,
  },
  photoEmptyText: {
    fontSize: Typography.xs,
    color: Colors.gray400,
  },
  addPhotoBtn: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFF7ED',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  signatureBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  signatureArea: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  signaturePlaceholder: {
    fontSize: Typography.sm,
    color: Colors.gray400,
    marginBottom: Spacing.xl,
  },
  signatureLine: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    height: 1,
    backgroundColor: Colors.gray300,
  },
  signatureLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    textAlign: 'center',
    padding: Spacing.sm,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  timestampLabel: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  timestampValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
    flexShrink: 1,
    textAlign: 'right',
  },
  // Full-width under its row: an address wraps, and squeezing it into the
  // right-hand column of a label/value row truncates it to uselessness.
  deliveryAddress: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    lineHeight: 16,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  completingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  completingIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  completingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  completingSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  geoTagOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: Radius.xs ?? 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  geoTagOverlayText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
    flex: 1,
  },
});

export default DeliveryVerificationScreen;
