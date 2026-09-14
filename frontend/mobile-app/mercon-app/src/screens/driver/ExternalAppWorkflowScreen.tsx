import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Upload, CheckCircle2, AlertCircle, FileCheck, Camera, Image as ImageIcon, Sparkles, Clock, RefreshCw,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, type MobileTrip } from '../../lib/trips';
import { pickFromGallery, capturePhoto, type CapturedPhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';

const MILESTONES = [
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'ARRIVED_AT_PICKUP', label: 'Pickup' },
  { key: 'LOADING_COMPLETED', label: 'Loading' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'ARRIVED_AT_DELIVERY', label: 'Delivery' },
  { key: 'COMPLETED', label: 'Completed' },
];

export const ExternalAppWorkflowScreen = () => {
  const router = useRouter();
  const { trip, loading, refetch, setTrip } = useCurrentTrip();

  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    extraction_status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
    event_type?: string | null;
    confidence: number;
    applied: boolean;
    notes?: string | null;
    validation_reason?: string | null;
  } | null>(null);

  const currentWorkflowState = trip?.driver_workflow_state || (trip?.status === 'Completed' ? 'COMPLETED' : 'ASSIGNED');

  const getStepStatus = (stepKey: string) => {
    if (trip?.status === 'Completed' || currentWorkflowState === 'COMPLETED') return 'completed';
    const order = ['ASSIGNED', 'ARRIVED_AT_PICKUP', 'LOADING_COMPLETED', 'IN_TRANSIT', 'ARRIVED_AT_DELIVERY', 'COMPLETED'];
    const currentIndex = order.indexOf(currentWorkflowState);
    const stepIndex = order.indexOf(stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const handlePickGallery = async () => {
    try {
      const photo = await pickFromGallery();
      if (photo) {
        setSelectedPhoto(photo);
        setResult(null);
      }
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err));
    }
  };

  const handleCamera = async () => {
    try {
      const photo = await capturePhoto();
      if (photo) {
        setSelectedPhoto(photo);
        setResult(null);
      }
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err));
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!trip || !selectedPhoto) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await tripService.uploadExternalScreenshot(trip.id, selectedPhoto);
      setResult({
        extraction_status: res.extraction_status,
        event_type: res.event_type,
        confidence: res.confidence,
        applied: res.applied,
        notes: res.notes,
        validation_reason: res.validation_reason,
      });
      if (res.trip) {
        setTrip(res.trip);
      } else {
        await refetch();
      }
    } catch (err) {
      Alert.alert('Upload Error', getApiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3E3C3D" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>External App Workflow</Text>
          <Text style={styles.headerSub}>
            {trip?.ref_id ? `Trip #${trip.ref_id}` : 'Operational Milestone Extraction'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Sparkles size={20} color="#FA634E" />
          <View style={styles.bannerTextBlock}>
            <Text style={styles.bannerTitle}>External Customer App</Text>
            <Text style={styles.bannerText}>
              Execute your trip in the customer's application and upload app screenshots here. CargoPod AI automatically detects milestones.
            </Text>
          </View>
        </View>

        {/* Milestone Stepper */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Milestone Progress</Text>
          <View style={styles.stepperContainer}>
            {MILESTONES.map((m, idx) => {
              const st = getStepStatus(m.key);
              const isLast = idx === MILESTONES.length - 1;
              return (
                <View key={m.key} style={styles.stepItem}>
                  <View style={styles.stepIndicatorRow}>
                    <View
                      style={[
                        styles.stepDot,
                        st === 'completed' && styles.stepDotCompleted,
                        st === 'current' && styles.stepDotCurrent,
                      ]}
                    >
                      {st === 'completed' ? (
                        <CheckCircle2 size={12} color="#FFFFFF" />
                      ) : (
                        <View style={[styles.innerDot, st === 'current' && styles.innerDotCurrent]} />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.stepLine,
                          st === 'completed' && styles.stepLineCompleted,
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      st === 'completed' && styles.stepLabelCompleted,
                      st === 'current' && styles.stepLabelCurrent,
                    ]}
                  >
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Image Picker / Upload Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Upload App Screenshot</Text>

          {selectedPhoto ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedPhoto.uri }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={() => setSelectedPhoto(null)}
                disabled={analyzing}
              >
                <RefreshCw size={14} color="#3E3C3D" />
                <Text style={styles.changePhotoText}>Change Screenshot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickersRow}>
              <TouchableOpacity style={styles.pickerBox} onPress={handlePickGallery}>
                <ImageIcon size={28} color="#FA634E" />
                <Text style={styles.pickerTitle}>Choose Screenshot</Text>
                <Text style={styles.pickerSub}>Select from gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerBox} onPress={handleCamera}>
                <Camera size={28} color="#3E3C3D" />
                <Text style={styles.pickerTitle}>Take Photo</Text>
                <Text style={styles.pickerSub}>Use camera</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedPhoto && (
            <TouchableOpacity
              style={[styles.uploadActionBtn, analyzing && styles.uploadActionBtnDisabled]}
              onPress={handleUploadAndAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Upload size={18} color="#FFFFFF" />
                  <Text style={styles.uploadActionText}>Analyze Screenshot</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* AI Extraction Result Card */}
        {result && (
          <View
            style={[
              styles.card,
              result.applied
                ? styles.resultCardSuccess
                : result.extraction_status === 'NEEDS_REVIEW'
                ? styles.resultCardWarning
                : styles.resultCardDanger,
            ]}
          >
            <View style={styles.resultHeader}>
              {result.applied ? (
                <CheckCircle2 size={20} color="#059669" />
              ) : (
                <AlertCircle size={20} color="#D97706" />
              )}
              <Text style={styles.resultTitle}>
                {result.applied
                  ? 'Milestone Validated & Applied'
                  : result.extraction_status === 'NEEDS_REVIEW'
                  ? 'Saved for Operator Review'
                  : 'Extraction Failed'}
              </Text>
            </View>

            {result.event_type && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>Detected Event:</Text>
                <Text style={styles.resultValue}>{result.event_type.replace(/_/g, ' ')}</Text>
              </View>
            )}

            <View style={styles.resultDetailRow}>
              <Text style={styles.resultLabel}>AI Confidence:</Text>
              <Text style={styles.resultValue}>{Math.round((result.confidence || 0) * 100)}%</Text>
            </View>

            {result.notes && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>Summary:</Text>
                <Text style={styles.resultValue}>{result.notes}</Text>
              </View>
            )}

            {result.validation_reason && !result.applied && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>Note:</Text>
                <Text style={styles.resultValueDanger}>{result.validation_reason}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExternalAppWorkflowScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  header: {
    backgroundColor: '#3E3C3D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    color: '#D1D5DB',
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FA634E',
    ...Shadows.sm,
  },
  bannerTextBlock: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3E3C3D',
  },
  bannerText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3E3C3D',
    marginBottom: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotCurrent: {
    backgroundColor: '#FA634E',
  },
  stepDotCompleted: {
    backgroundColor: '#059669',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  innerDotCurrent: {
    backgroundColor: '#FFFFFF',
  },
  stepLine: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E5E7EB',
    top: 9,
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: '#059669',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: '#FA634E',
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: '#059669',
    fontWeight: '600',
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3E3C3D',
    marginTop: 8,
  },
  pickerSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF1F6',
    borderRadius: 6,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3E3C3D',
  },
  uploadActionBtn: {
    backgroundColor: '#FA634E',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  uploadActionBtnDisabled: {
    opacity: 0.6,
  },
  uploadActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resultCardSuccess: {
    borderColor: '#A7F3D0',
    borderWidth: 1,
    backgroundColor: '#ECFDF5',
  },
  resultCardWarning: {
    borderColor: '#FDE68A',
    borderWidth: 1,
    backgroundColor: '#FFFBEB',
  },
  resultCardDanger: {
    borderColor: '#FECACA',
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  resultDetailRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    width: 110,
  },
  resultValue: {
    fontSize: 12,
    color: '#111827',
    flex: 1,
  },
  resultValueDanger: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
});
