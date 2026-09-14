import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Upload, CheckCircle2, AlertCircle, Camera, Image as ImageIcon, RefreshCw, Building2, ArrowRight,
} from 'lucide-react-native';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, getEffectiveWorkflowState, statusLabel, stopLabel } from '../../lib/trips';
import { pickFromGallery, capturePhoto, type CapturedPhoto } from '../../lib/camera';
import { API_URL, getApiErrorMessage } from '../../lib/api';
import { TripProgressStepper, DelayButton, DelayReportModal, BilingualText } from '../../components';

const FILE_BASE = API_URL.replace(/\/api\/?$/, '');

export const ExternalAppWorkflowScreen = () => {
  const router = useRouter();
  const { trip, loading, refetch, setTrip } = useCurrentTrip();

  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [result, setResult] = useState<{
    document_id?: string;
    extraction_status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
    event_type?: string | null;
    event_timestamp?: string | null;
    stop_location_name?: string | null;
    external_reference?: string | null;
    detected_text?: string | null;
    is_wrong_trip?: boolean;
    extraction_error?: string | null;
    confidence: number;
    applied: boolean;
    can_confirm?: boolean;
    target_status?: string | null;
    target_workflow_state?: string | null;
    notes?: string | null;
    validation_reason?: string | null;
    trip?: MobileTrip | null;
  } | null>(null);

  const ws = getEffectiveWorkflowState(trip);

  const getStepperStep = () => {
    if (trip?.status === 'Completed' || ws === 'COMPLETED' || ws === 'REVIEW_COMPLETE') return 4;
    if (ws === 'ARRIVED_AT_DELIVERY' || ws === 'DELIVERY_VERIFICATION' || ws === 'ARRIVED_AT_FINAL_DELIVERY' || ws === 'FINAL_DELIVERY_VERIFICATION' || ws === 'IN_TRANSIT_RETURN') return 3;
    if (ws === 'ARRIVED_AT_PICKUP' || ws === 'LOADING' || ws === 'LOADING_COMPLETED' || ws === 'GOING_TO_STOP' || ws === 'ARRIVED_AT_STOP' || ws === 'IN_TRANSIT') return 2;
    return 1;
  };

  const resetPhotoState = () => {
    setSelectedPhoto(null);
    setResult(null);
    setIsConfirmed(false);
    setConfirming(false);
  };

  const handlePickGallery = async () => {
    try {
      const photo = await pickFromGallery();
      if (photo) {
        setSelectedPhoto(photo);
        setResult(null);
        setIsConfirmed(false);
        setConfirming(false);
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
        setIsConfirmed(false);
        setConfirming(false);
      }
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err));
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!trip || !selectedPhoto) return;
    setAnalyzing(true);
    setResult(null);
    setIsConfirmed(false);
    setConfirming(false);
    try {
      const rawRes = await tripService.uploadExternalScreenshot(trip.id, selectedPhoto);
      const res = (rawRes as any)?.data || rawRes;
      const appliedSuccess = Boolean(res.applied);
      setResult({
        document_id: res.document_id,
        extraction_status: res.extraction_status,
        event_type: res.event_type,
        event_timestamp: res.event_timestamp,
        stop_location_name: res.stop_location_name,
        external_reference: res.external_reference,
        detected_text: res.detected_text,
        is_wrong_trip: res.is_wrong_trip,
        extraction_error: res.extraction_error,
        confidence: res.confidence,
        applied: appliedSuccess,
        can_confirm: res.can_confirm ?? (res.event_type && !res.is_wrong_trip && !res.extraction_error),
        target_status: res.target_status,
        target_workflow_state: res.target_workflow_state,
        notes: res.notes,
        validation_reason: res.validation_reason,
        trip: res.trip,
      });

      if (appliedSuccess) {
        setIsConfirmed(true);
        if (res.trip) {
          setTrip(res.trip);
        } else {
          await refetch();
        }
      }
    } catch (err) {
      Alert.alert('Upload Error', getApiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!trip || !result) return;
    setConfirming(true);
    try {
      if (result.target_status) {
        const updatedTrip = await tripService.updateTripStatus(trip.id, {
          status: result.target_status as any,
          driver_workflow_state: result.target_workflow_state ?? undefined,
        });
        setTrip(updatedTrip);
      } else if (result.trip) {
        setTrip(result.trip);
      } else {
        await refetch();
      }
      setIsConfirmed(true);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const pickupStop = trip?.stops?.find((s) => s.stop_sequence === 1 || s.stop_type === 'Pickup') ?? trip?.stops?.[0];
  const dropoffStop = trip?.stops?.find((s) => s.stop_sequence === (trip?.stops?.length ?? 2) || s.stop_type === 'Dropoff') ?? trip?.stops?.[trip?.stops?.length - 1];
  const isCompleted = trip?.status === 'Completed' || trip?.status === 'Invoiced';

  const isWrongTripError = result?.is_wrong_trip || Boolean(result?.validation_reason?.toLowerCase().includes('wrong trip'));
  const isAiError = Boolean(result?.extraction_error || result?.notes?.toLowerCase().includes('ai processing error') || result?.notes?.toLowerCase().includes('ai error'));
  const isFullyAppliedOrConfirmed = (result?.applied || isConfirmed) && !isWrongTripError && !isAiError;
  const canConfirm = Boolean(result && (result.can_confirm || (result.event_type && !isWrongTripError && !isAiError)) && !isFullyAppliedOrConfirmed);

  const formatMilestoneName = (event?: string | null) => {
    if (!event) return 'Milestone';
    switch (event) {
      case 'ARRIVED_AT_PICKUP': return 'Arrived at Pickup';
      case 'LOADING_COMPLETED': return 'Loading Completed';
      case 'DEPARTED_PICKUP': return 'Departed Pickup (In Transit)';
      case 'ARRIVED_AT_DELIVERY': return 'Arrived at Delivery';
      case 'DELIVERY_COMPLETED': return 'Delivery Completed';
      case 'DELAYED': return 'Trip Delayed';
      default: return event.replace(/_/g, ' ');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF1F6" />

      {/* Top Header Bar */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#3E3C3D" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <BilingualText
            ur="ایپ ویریفکیشن"
            en="External App Verification"
            primaryStyle={styles.headerTitleUrdu}
            subStyle={styles.headerTitleEn}
          />
        </View>
        <DelayButton onPress={() => setShowDelayModal(true)} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 4-Step Progress Stepper showing route location names */}
        <TripProgressStepper
          currentStep={getStepperStep()}
          isCompletedAll={isCompleted}
          customStep1Label={stopLabel(pickupStop) ?? 'Pickup'}
          customStep2Label="In Transit"
          customStep3Label={stopLabel(dropoffStop) ?? 'Delivery'}
        />

        {/* Card 1: Hero Overview */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.logoFallback}>
              <Building2 size={22} color="#FA634E" strokeWidth={2} />
            </View>
            <View style={styles.heroCustomerCol}>
              <Text style={styles.customerName} numberOfLines={1}>
                {trip?.customer?.name ?? 'Mercon Logistics'}
              </Text>
              <Text style={styles.tripRefId}>TRP-{trip?.ref_id ?? trip?.id?.slice(0, 8)}</Text>
            </View>
            <View style={[styles.statusBadge, isCompleted ? styles.statusBadgeCompleted : styles.statusBadgeActive]}>
              <Text style={[styles.statusBadgeText, isCompleted ? styles.statusTextCompleted : styles.statusTextActive]}>
                {ws ? ws.replace(/_/g, ' ') : statusLabel(trip?.status || 'Scheduled')}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Route Overview */}
          <View style={styles.routeRow}>
            <Text style={styles.routeOriginText} numberOfLines={1}>{stopLabel(pickupStop) ?? 'Pickup'}</Text>
            <ArrowRight size={16} color="#FA634E" strokeWidth={2.5} style={styles.routeArrow} />
            <Text style={styles.routeDestText} numberOfLines={1}>{stopLabel(dropoffStop) ?? 'Delivery'}</Text>
          </View>
        </View>

        {/* Card 2: Upload Screenshot */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Upload App Screenshot</Text>

          {selectedPhoto ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedPhoto.uri }} style={styles.previewImage} resizeMode="contain" />
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={resetPhotoState}
                disabled={analyzing || confirming}
              >
                <RefreshCw size={14} color="#3E3C3D" />
                <Text style={styles.changePhotoText}>Change Screenshot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickersRow}>
              <TouchableOpacity style={styles.pickerBox} onPress={handlePickGallery} activeOpacity={0.8}>
                <ImageIcon size={26} color="#FA634E" strokeWidth={2} />
                <Text style={styles.pickerTitle}>Choose Screenshot</Text>
                <Text style={styles.pickerSub}>Select from gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerBox} onPress={handleCamera} activeOpacity={0.8}>
                <Camera size={26} color="#3E3C3D" strokeWidth={2} />
                <Text style={styles.pickerTitle}>Take Photo</Text>
                <Text style={styles.pickerSub}>Use camera</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedPhoto && (
            <TouchableOpacity
              style={[
                styles.uploadActionBtn,
                (analyzing || confirming || isFullyAppliedOrConfirmed) && styles.uploadActionBtnDisabled,
                isFullyAppliedOrConfirmed && styles.uploadActionBtnConfirmed,
              ]}
              onPress={
                isFullyAppliedOrConfirmed
                  ? undefined
                  : canConfirm
                  ? handleConfirmUpdate
                  : handleUploadAndAnalyze
              }
              disabled={analyzing || confirming || isFullyAppliedOrConfirmed}
              activeOpacity={0.88}
            >
              {analyzing ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.uploadActionText}>Analysing Screenshot...</Text>
                </>
              ) : confirming ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.uploadActionText}>Confirming Update...</Text>
                </>
              ) : isFullyAppliedOrConfirmed ? (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.uploadActionText}>Progress Update Confirmed</Text>
                </>
              ) : canConfirm ? (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.uploadActionText}>Confirm & Update Progress</Text>
                </>
              ) : result ? (
                <>
                  <RefreshCw size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.uploadActionText}>Re-analyse Screenshot</Text>
                </>
              ) : (
                <>
                  <Upload size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.uploadActionText}>Analyse Screenshot</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Card 3: Result Card */}
        {result && (
          <View
            style={[
              styles.card,
              isFullyAppliedOrConfirmed
                ? styles.resultCardSuccess
                : canConfirm
                ? styles.resultCardWarning
                : styles.resultCardDanger,
            ]}
          >
            <View style={styles.resultHeader}>
              {isFullyAppliedOrConfirmed ? (
                <CheckCircle2 size={20} color="#059669" strokeWidth={2.2} />
              ) : canConfirm ? (
                <AlertCircle size={20} color="#D97706" strokeWidth={2.2} />
              ) : (
                <AlertCircle size={20} color="#DC2626" strokeWidth={2.2} />
              )}
              <Text style={styles.resultTitle}>
                {isFullyAppliedOrConfirmed
                  ? 'Milestone Verified & Applied'
                  : canConfirm
                  ? 'Milestone Extracted — Ready to Confirm'
                  : isWrongTripError
                  ? 'Wrong Trip Screenshot'
                  : isAiError
                  ? 'AI Processing Error'
                  : 'Verification Failed'}
              </Text>
            </View>

            {/* Extracted Details Section */}
            {result.event_type && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>Extracted Milestone:</Text>
                <Text style={styles.resultValue}>{formatMilestoneName(result.event_type)}</Text>
              </View>
            )}

            {result.external_reference && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>Extracted Ref #:</Text>
                <Text style={styles.resultValue}>{result.external_reference}</Text>
              </View>
            )}

            {result.stop_location_name && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>Extracted Location:</Text>
                <Text style={styles.resultValue}>{result.stop_location_name}</Text>
              </View>
            )}

            {result.event_timestamp && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>Extracted Time:</Text>
                <Text style={styles.resultValue}>{result.event_timestamp}</Text>
              </View>
            )}

            {result.confidence > 0 && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>AI Confidence:</Text>
                <Text style={styles.resultValue}>{Math.round((result.confidence || 0) * 100)}%</Text>
              </View>
            )}

            {result.notes && (
              <View style={styles.resultDetailRow}>
                <Text style={styles.resultLabel}>AI Summary:</Text>
                <Text style={styles.resultValue}>{result.notes}</Text>
              </View>
            )}

            {!isFullyAppliedOrConfirmed && !canConfirm && (
              <View style={styles.failureReasonBox}>
                <View style={styles.failureReasonTitleRow}>
                  <AlertCircle size={16} color="#DC2626" strokeWidth={2.2} />
                  <Text style={styles.failureReasonTitle}>Why Verification Failed:</Text>
                </View>
                <Text style={styles.failureReasonText}>
                  {result.validation_reason || result.notes || 'The uploaded screenshot could not be automatically verified for this trip.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <DelayReportModal
        visible={showDelayModal}
        tripId={trip?.id ?? null}
        onClose={() => setShowDelayModal(false)}
        onSuccess={() => refetch()}
      />
    </SafeAreaView>
  );
};

export default ExternalAppWorkflowScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitleUrdu: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3E3C3D',
  },
  headerTitleEn: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6E6E80',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoFallback: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCustomerCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3E3C3D',
  },
  tripRefId: {
    fontSize: 12,
    color: '#9898A4',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#FFF0ED',
  },
  statusBadgeCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#FA634E',
  },
  statusTextCompleted: {
    color: '#15803D',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EEF1F6',
    marginVertical: 14,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeOriginText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3E3C3D',
    flex: 1,
  },
  routeArrow: {
    marginHorizontal: 4,
  },
  routeDestText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3E3C3D',
    flex: 1,
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3E3C3D',
    marginBottom: 14,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D8D8DC',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3E3C3D',
    marginTop: 8,
  },
  pickerSub: {
    fontSize: 11,
    color: '#9898A4',
    marginTop: 2,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#EEF1F6',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF1F6',
    borderRadius: 8,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3E3C3D',
  },
  uploadActionBtn: {
    backgroundColor: '#FA634E',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
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
    marginBottom: 10,
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
    width: 100,
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
  failureReasonBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  failureReasonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  failureReasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  failureReasonText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
});
