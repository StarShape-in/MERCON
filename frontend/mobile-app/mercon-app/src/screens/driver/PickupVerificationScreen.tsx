import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Circle, Line, G, Polygon, Ellipse } from 'react-native-svg';
import { Info, Camera, Plus, ArrowLeft, MapPin, Trash2, Package, ArrowRight, RotateCcw, Calendar, Clock, FileText, User, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, GoogleMapsGeotagPreview, GeotagPhotoModal, TripProgressStepper } from '../../components';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, stopAddress, stopLabel } from '../../lib/trips';
import { choosePhoto, type CapturedPhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';
import { safeSecureStore as SecureStore } from '../../lib/secure-store';
import { triggerGPayHapticsAndSound } from '../../lib/sound';

const MIN_PHOTOS = 1;

// 3D Folded Map Graphic SVG Component for Location Card
const FoldedMapPreviewGraphic = () => (
  <Svg width={68} height={42} viewBox="0 0 68 42">
    <G transform="rotate(-4 34 21)">
      <Polygon points="4,10 22,5 22,35 4,40" fill="#FFF7ED" stroke="#FED7AA" strokeWidth={1} />
      <Polygon points="22,5 44,10 44,40 22,35" fill="#FFEDD5" stroke="#FED7AA" strokeWidth={1} />
      <Polygon points="44,10 62,5 62,35 44,40" fill="#FFF7ED" stroke="#FED7AA" strokeWidth={1} />
      <Path d="M 12 32 Q 28 16 38 25 T 54 16" fill="none" stroke="#F97316" strokeWidth={2.2} strokeDasharray="3,2" />
      <G transform="translate(30, 8)">
        <Path d="M7 0C3.13 0 0 3.13 0 7C0 12.25 7 16.5 7 16.5C7 16.5 14 12.25 14 7C14 3.13 10.87 0 7 0Z" fill="#E8450F" />
        <Circle cx={7} cy={7} r={2.5} fill="#FFFFFF" />
      </G>
    </G>
  </Svg>
);

// Vector Logistics Loading Illustration: Truck with open rear doors at pickup facility
const ReturnLoadingBannerGraphic = () => (
  <View style={styles.illustrationWrapper}>
    <Svg width="100%" height={105} viewBox="0 0 340 105" preserveAspectRatio="xMidYMid meet">
      {/* Background City Skyline Silhouette */}
      <Path
        d="M 10 85 L 10 45 L 22 45 L 22 32 L 35 32 L 35 55 L 48 55 L 48 25 L 62 25 L 62 85 
           M 70 85 L 70 38 L 85 38 L 85 22 L 100 22 L 100 85 
           M 235 85 L 235 40 L 250 40 L 250 30 L 265 30 L 265 85 
           M 275 85 L 275 48 L 290 48 L 290 38 L 305 38 L 305 85"
        fill="#F1F5F9"
        opacity={0.85}
      />

      {/* Ground Line */}
      <Line x1={0} y1={87} x2={340} y2={87} stroke="#E2E8F0" strokeWidth={1.5} />

      {/* Orange Route Path Line */}
      <Path
        d="M 65 50 Q 115 35, 160 50 T 265 60"
        fill="none"
        stroke="#F97316"
        strokeWidth={2}
        strokeDasharray="4,3"
      />

      {/* Orange Route Pin */}
      <G transform="translate(60, 35)">
        <Path d="M7 0C3.13 0 0 3.13 0 7C0 11.5 7 16 7 16C7 16 14 11.5 14 7C14 3.13 10.87 0 7 0Z" fill="#E8450F" />
        <Circle cx={7} cy={7} r={2.5} fill="#FFFFFF" />
      </G>

      {/* Truck at Loading Facility with open doors */}
      <G transform="translate(170, 36)">
        {/* Wheels */}
        <Circle cx={18} cy={44} r={5.5} fill="#1E293B" stroke="#94A3B8" strokeWidth={1.8} />
        <Circle cx={18} cy={44} r={2.2} fill="#E2E8F0" />
        <Circle cx={60} cy={44} r={5.5} fill="#1E293B" stroke="#94A3B8" strokeWidth={1.8} />
        <Circle cx={60} cy={44} r={2.2} fill="#E2E8F0" />

        {/* Chassis */}
        <Rect x={10} y={38} width={60} height={4} fill="#334155" rx={1} />

        {/* Cargo Box with Open Rear Door */}
        <Rect x={15} y={10} width={48} height={30} rx={2} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.4} />
        <Rect x={15} y={34} width={48} height={3} fill="#F59E0B" />

        {/* Open Door Flaps */}
        <Polygon points="15,10 5,6 5,38 15,40" fill="#E2E8F0" stroke="#94A3B8" strokeWidth={1} />

        {/* Cabin */}
        <Path d="M 63 16 L 78 16 Q 86 16 88 22 L 89 33 Q 89 40 83 40 L 63 40 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.4} />
        <Path d="M 68 19 L 80 19 Q 84 19 85 23 L 85 29 L 68 29 Z" fill="#64748B" />

        {/* Bumper */}
        <Rect x={63} y={37} width={26} height={3} fill="#334155" rx={1} />
      </G>

      {/* Cargo Boxes being loaded */}
      <G transform="translate(130, 58)">
        <Rect x={0} y={0} width={13} height={13} fill="#F59E0B" rx={1.5} stroke="#D97706" strokeWidth={1} />
        <Rect x={12} y={2} width={11} height={11} fill="#D97706" rx={1.5} stroke="#B45309" strokeWidth={1} />
        <Rect x={5} y="-12" width={11} height={11} fill="#F59E0B" rx={1.5} stroke="#D97706" strokeWidth={1} />
      </G>
    </Svg>
  </View>
);

// 3D Realistic Cargo Box Stack with Camera Overlay SVG Graphic
const CargoBoxesCameraGraphic = () => (
  <Svg width={54} height={48} viewBox="0 0 54 48">
    {/* Base Shadow */}
    <Ellipse cx={24} cy={44} rx={22} ry={3.5} fill="#FED7AA" opacity={0.6} />

    {/* Back Box (Left, Darker cardboard brown) */}
    <G transform="translate(2, 14)">
      {/* Front Face */}
      <Polygon points="0,8 14,14 14,30 0,24" fill="#D97706" />
      {/* Right Side Face */}
      <Polygon points="14,14 26,8 26,24 14,30" fill="#B45309" />
      {/* Top Face */}
      <Polygon points="0,8 12,2 26,8 14,14" fill="#F59E0B" />
      {/* Tape Line */}
      <Path d="M 6,5 L 20,11" stroke="#FDE68A" strokeWidth={1.5} opacity={0.9} />
    </G>

    {/* Front Box (Center/Main 3D Cardboard Box) */}
    <G transform="translate(10, 8)">
      {/* Left Front Face */}
      <Polygon points="0,10 16,18 16,36 0,28" fill="#F59E0B" />
      {/* Right Front Face */}
      <Polygon points="16,18 30,10 30,28 16,36" fill="#D97706" />
      {/* Top Face */}
      <Polygon points="0,10 14,2 30,10 16,18" fill="#FEF3C7" />
      {/* Packaging Seam Tape */}
      <Polygon points="7,6 23,14 25,13 9,5" fill="#FDE68A" />
      {/* Fragile/Handle Glass Symbol Stamp */}
      <Path d="M 6,21 L 10,23 M 8,19 L 8,24" stroke="#7C2D12" strokeWidth={1} opacity={0.6} />
    </G>

    {/* Camera Badge Badge (Bottom Right 3D Overlay) */}
    <G transform="translate(26, 22)">
      {/* Shadow */}
      <Rect x={1} y={4} width={24} height={18} rx={5} fill="#000000" opacity={0.2} />

      {/* Main Camera Body (Sleek dark navy with orange accent) */}
      <Rect x={0} y={3} width={24} height={18} rx={5} fill="#0F172A" />
      {/* Top Flash bump */}
      <Path d="M 7 3 L 9 0.5 L 15 0.5 L 17 3 Z" fill="#1E293B" />
      {/* Outer Lens Ring */}
      <Circle cx={12} cy={12} r={5.5} fill="#334155" stroke="#475569" strokeWidth={1} />
      {/* Glass Lens Element */}
      <Circle cx={12} cy={12} r={3.8} fill="#0284C7" />
      {/* Lens Flare Specular Highlight */}
      <Circle cx={10.5} cy={10.5} r={1.2} fill="#FFFFFF" opacity={0.9} />
      {/* Red/Orange Recording LED */}
      <Circle cx={19.5} cy={6.5} r={1.2} fill="#EF4444" />
    </G>
  </Svg>
);

// Orange Camera Icon with Plus Badge for Photo Upload Slots
const OrangeCameraPlusIcon = () => (
  <View style={{ width: 34, height: 30, justifyContent: 'center', alignItems: 'center' }}>
    <Svg width={30} height={28} viewBox="0 0 30 28">
      <Path
        d="M 4 8 C 2.9 8 2 8.9 2 10 L 2 23 C 2 24.1 2.9 25 4 25 L 21 25 C 22.1 25 23 24.1 23 23 L 23 10 C 23 8.9 22.1 8 21 8 Z"
        fill="none"
        stroke="#E8450F"
        strokeWidth={2.2}
      />
      <Path d="M 8 8 L 10 5 L 15 5 L 17 8 Z" fill="none" stroke="#E8450F" strokeWidth={2.2} />
      <Circle cx={12.5} cy={16.5} r={4.5} fill="none" stroke="#E8450F" strokeWidth={2.2} />

      {/* Plus Badge */}
      <Circle cx={22} cy={19} r={5.5} fill="#E8450F" />
      <Line x1={22} y1={16} x2={22} y2={22} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      <Line x1={19} y1={19} x2={25} y2={19} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  </View>
);

const PickupVerificationScreen = () => {
  const router = useRouter();
  const { trip, loading, refetch, setTrip } = useCurrentTrip();
  const ws = trip?.driver_workflow_state || 'ASSIGNED';
  const legIndex = (ws === 'RETURN_LOADING' || ws === 'FIRST_DELIVERY_COMPLETED') ? 1 : 0;
  const activeStop = trip?.stops?.find((s) => s.stop_sequence === (legIndex + 1)) ?? null;
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const [showStatusCard, setShowStatusCard] = useState(false);
  const uploadedIndices = useRef<Set<number>>(new Set());
  const inFlight = useRef(false);

  // Load draft photos from SecureStore on mount/trip load
  useEffect(() => {
    if (!trip?.id) return;
    const loadDraft = async () => {
      try {
        const key = `pickup_draft_photos_${trip.id}_${legIndex}`;
        const saved = await SecureStore.getItemAsync(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPhotos(parsed);
          }
        } else {
          setPhotos([]);
        }
      } catch (e) {
        console.error('Error loading draft photos:', e);
      }
    };
    loadDraft();
  }, [trip?.id, legIndex]);

  // Save draft photos to SecureStore on change
  useEffect(() => {
    if (!trip?.id) return;
    const saveDraft = async () => {
      try {
        const key = `pickup_draft_photos_${trip.id}_${legIndex}`;
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
  }, [photos, trip?.id, legIndex]);

  const addPhoto = async () => {
    try {
      const photo = await choosePhoto();
      if (photo) {
        setPhotos((prev) => [...prev, photo].slice(0, 3));
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

  const startLoading = async () => {
    if (!trip || submitting) return;
    setSubmitting(true);
    try {
      const nextState = legIndex === 1 ? 'RETURN_LOADING' : 'LOADING';
      const updated = await tripService.updateStatus(trip.id, 'Loading', nextState);
      setTrip(updated);
    } catch (e) {
      Alert.alert('Error', getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const isStarted = ws === 'LOADING' || ws === 'RETURN_LOADING';

  const canConfirm =
    !!trip && isStarted && photos.length >= MIN_PHOTOS && !submitting && !loading;

  const confirm = async () => {
    if (!trip || !canConfirm) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      for (let i = 0; i < photos.length; i++) {
        if (!uploadedIndices.current.has(i)) {
          await tripService.uploadPhoto(trip.id, 'cargo', photos[i], legIndex, 'pickup');
          uploadedIndices.current.add(i);
        }
      }
      const nextState = legIndex === 1 ? 'IN_TRANSIT_RETURN' : 'IN_TRANSIT';
      const updated = await tripService.updateStatus(trip.id, 'InTransit', nextState);
      setTrip(updated);

      try {
        const key = `pickup_draft_photos_${trip.id}_${legIndex}`;
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        console.error('Failed to delete draft key:', err);
      }

      triggerGPayHapticsAndSound();
      router.replace('/trip/navigate');
    } catch (e) {
      Alert.alert('Could not start trip', getApiErrorMessage(e));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const startLoadingTime = activeStop?.actual_arrival;
  const formattedLoadingStarted = startLoadingTime
    ? new Date(startLoadingTime).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }) + ' at ' + new Date(startLoadingTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Aug 26, 2026 at 10:29 PM';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{legIndex === 1 ? 'Return Loading' : 'Loading'}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Top Progress Stepper */}
        <TripProgressStepper currentStep={2} />

        {/* Combined Illustration Banner + Trip Summary Card */}
        <View style={styles.combinedCard}>
          <View style={[styles.illustrationWrapper, !isStarted && { height: 200 }]}>
            <Image
              source={!isStarted ? require('../../../assets/images/start_loading.png') : require('../../../assets/images/loading.png')}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Trip ID</Text>
              <Text style={styles.summaryValue}>#{trip?.ref_id ?? 'TRP-0039'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItemFlex}>
              <Text style={styles.summaryLabel}>Customer</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {trip?.customer?.name ? trip.customer.name.toUpperCase() : 'IMILE DELIVERY SAUDI LO...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pickup Location Card with Folded Map Graphic */}
        <View style={styles.locationCard}>
          <View style={styles.locationLeftRow}>
            <View style={styles.locationPinBadge}>
              <MapPin size={18} color="#E8450F" strokeWidth={2.2} />
            </View>
            <View style={styles.locationText}>
              <Text style={styles.locationName} numberOfLines={1}>
                {stopLabel(activeStop) ?? (legIndex === 1 ? 'Khamis Mushayt' : 'Khamis Mushayt')}
              </Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {stopAddress(activeStop) ?? 'Khamis Mushayt, \'Asir Province, Saudi Arabia'}
              </Text>
            </View>
          </View>
          <FoldedMapPreviewGraphic />
        </View>

        {/* Loading Started Time Card */}
        {isStarted && (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusLabelGroup}>
                <View style={styles.calendarIconBadge}>
                  <Calendar size={14} color="#E8450F" strokeWidth={2} />
                </View>
                <Text style={styles.startedLabel}>Loading Started</Text>
              </View>
              <Text style={styles.startedValue}>Aug 26, 2026 at 10:29 PM</Text>
            </View>
          </View>
        )}

        {!isStarted ? (
          <View style={styles.startLoadingWrapper}>
            {/* Readiness Reminder Banner (Placed above Start Loading controls) */}
            <View style={styles.preStartReminderCard}>
              <View style={styles.preStartInfoBadge}>
                <Info size={15} color="#94A3B8" strokeWidth={2.2} />
              </View>
              <Text style={styles.preStartReminderText}>Make sure all items are ready before starting.</Text>
            </View>

            {/* Center Circular Action Controls (Placed at bottom) */}
            <View style={styles.circularActionsRow}>
              {/* Left Action: View History */}
              <TouchableOpacity
                style={styles.sideActionItem}
                activeOpacity={0.75}
                onPress={() => Alert.alert('History', 'No previous history recorded for this trip.')}
              >
                <View style={styles.sideActionCircle}>
                  <Clock size={20} color="#E8450F" strokeWidth={2.2} />
                </View>
                <Text style={styles.sideActionText}>View History</Text>
              </TouchableOpacity>

              {/* Center Main Action: Round Vibrant START LOADING Button */}
              <TouchableOpacity
                style={styles.roundStartOuterRing}
                activeOpacity={0.85}
                onPress={startLoading}
                disabled={submitting}
              >
                <View style={styles.roundStartInnerButton}>
                  <Package size={26} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.roundStartText}>
                    {submitting ? 'STARTING…' : legIndex === 1 ? 'START RETURN\nLOADING' : 'START\nLOADING'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Right Action: Add Note */}
              <TouchableOpacity
                style={styles.sideActionItem}
                activeOpacity={0.75}
                onPress={() => Alert.alert('Add Note', 'Driver notes feature coming soon.')}
              >
                <View style={styles.sideActionCircle}>
                  <FileText size={20} color="#E8450F" strokeWidth={2.2} />
                </View>
                <Text style={styles.sideActionText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Cargo Photos Instruction Banner Card */}
            <View style={styles.instructionCard}>
              <View style={styles.infoIconCircle}>
                <Info size={16} color="#E8450F" strokeWidth={2.4} />
              </View>
              <View style={styles.instructionTextWrapper}>
                <Text style={styles.instructionTitle}>Upload at least 3 cargo photos.</Text>
                <Text style={styles.instructionSubtext}>Take clear photos.</Text>
              </View>
              <CargoBoxesCameraGraphic />
            </View>

            {/* Photo Upload Section */}
            <Text style={styles.sectionTitle}>Cargo Photos ({photos.length}/3)</Text>
            <View style={styles.photosGrid}>
              {[0, 1, 2].map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.photoPreview, photos[i] ? styles.photoFilled : styles.photoEmpty]}
                  activeOpacity={0.8}
                  onPress={photos[i] ? () => setPreviewPhoto(photos[i]) : addPhoto}
                >
                  {photos[i] ? (
                    <>
                      <Image source={{ uri: photos[i].uri }} style={styles.photoImage} />
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
                        <Trash2 size={12} color={Colors.white} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <OrangeCameraPlusIcon />
                      <Text style={styles.photoPlaceholderText}>Photo {i + 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <GeotagPhotoModal
              visible={!!previewPhoto}
              photo={previewPhoto ? { uri: previewPhoto.uri, title: 'Cargo Photo Preview', location: previewPhoto.location } : null}
              onClose={() => setPreviewPhoto(null)}
            />

            <TouchableOpacity
              style={[styles.mainActionBtn, !canConfirm && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={confirm}
              disabled={!canConfirm}
            >
              <Package size={22} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.mainActionBtnText}>{submitting ? 'COMPLETING…' : 'CONTINUE TO REVIEW'}</Text>
              <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  placeholder: {
    width: 36,
  },
  combinedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  illustrationWrapper: {
    backgroundColor: '#FFFFFF',
    height: 122,
    paddingTop: 4,
    paddingBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  summaryItemFlex: {
    flex: 1.5,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 3,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  divider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  locationLeftRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginRight: 6,
  },
  locationPinBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  locationText: { flex: 1 },
  locationName: { fontSize: 13.5, fontWeight: '800', color: '#0F172A' },
  locationAddress: { fontSize: 10.5, color: '#64748B', marginTop: 2, lineHeight: 14.5 },
  statusToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  toggleBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusCardExpanded: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statusSubLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  startedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  startedLabel: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  startedValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  instructionTextWrapper: {
    flex: 1,
    marginRight: 6,
  },
  instructionTitle: {
    fontSize: 12,
    color: '#7C2D12',
    fontWeight: '800',
    lineHeight: 16,
  },
  instructionSubtext: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '600',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 2,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  photoPreview: {
    flex: 1,
    aspectRatio: 1.1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  photoEmpty: {
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
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
  photoPlaceholderText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItemWithIcon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryItemFlexWithIcon: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
  },
  summaryIconSquare: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLoadingWrapper: {
    marginTop: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  circularActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 12,
  },
  sideActionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sideActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  roundStartOuterRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#E8450F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  roundStartInnerButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#E8450F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#E8450F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  roundStartText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  preStartReminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    marginTop: 2,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  preStartInfoBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  preStartReminderText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  mainActionBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E8450F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    shadowColor: '#E8450F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 2,
  },
  mainActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
});

export default PickupVerificationScreen;
