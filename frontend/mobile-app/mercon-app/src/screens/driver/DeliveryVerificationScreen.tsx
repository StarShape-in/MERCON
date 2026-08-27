import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Image, Alert, ActivityIndicator, Share, Animated, Vibration, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Circle, Line, G, Polygon, Ellipse } from 'react-native-svg';
import {
  ArrowLeft, Check, Camera, Plus, Trash2, ClipboardCheck, Info, MapPin, Package, ArrowRight, Clock, IdCard, GitFork, CornerUpLeft, ImageIcon, RotateCcw, Calendar,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, GoogleMapsGeotagPreview, GeotagPhotoModal, TripProgressStepper } from '../../components';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { useCargoPodPhotos } from '../../lib/documents';
import { tripService, stopAddress, stopLabel } from '../../lib/trips';
import { choosePhoto, type CapturedPhoto } from '../../lib/camera';
import { getApiErrorMessage, API_URL } from '../../lib/api';
import { safeSecureStore as SecureStore } from '../../lib/secure-store';
import { triggerGPayHapticsAndSound } from '../../lib/sound';

let captureRef: any = null;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch (_) {}

let Sharing: any = null;
try {
  Sharing = require('expo-sharing');
} catch (_) {}

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
        <Path d="M7 0C3.13 0 0 3.13 0 7C0 12.25 7 16.5 7 16.5C7 16.5 14 12.25 14 7C14 3.13 10.87 0 7 0Z" fill="#FA634E" />
        <Circle cx={7} cy={7} r={2.5} fill="#FFFFFF" />
      </G>
    </G>
  </Svg>
);

// Vector Logistics Delivery Illustration: Truck traveling toward Warehouse / Godown
const FinalDeliveryBannerGraphic = () => (
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

      {/* Orange Dashed Route Path Line */}
      <Path
        d="M 65 60 Q 115 35, 160 50 T 215 45"
        fill="none"
        stroke="#F97316"
        strokeWidth={2}
        strokeDasharray="4,3"
      />

      {/* Orange Route Location Pin */}
      <G transform="translate(140, 32)">
        <Path d="M7 0C3.13 0 0 3.13 0 7C0 11.5 7 16 7 16C7 16 14 11.5 14 7C14 3.13 10.87 0 7 0Z" fill="#E8450F" />
        <Circle cx={7} cy={7} r={2.5} fill="#FFFFFF" />
      </G>

      {/* Left: White Delivery Truck */}
      <G transform="translate(25, 36)">
        {/* Wheels */}
        <Circle cx={18} cy={44} r={5.5} fill="#1E293B" stroke="#94A3B8" strokeWidth={1.8} />
        <Circle cx={18} cy={44} r={2.2} fill="#E2E8F0" />
        <Circle cx={60} cy={44} r={5.5} fill="#1E293B" stroke="#94A3B8" strokeWidth={1.8} />
        <Circle cx={60} cy={44} r={2.2} fill="#E2E8F0" />

        {/* Chassis */}
        <Rect x={10} y={38} width={60} height={4} fill="#334155" rx={1} />

        {/* Cargo Box */}
        <Rect x={5} y={10} width={48} height={30} rx={2} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.4} />
        {/* Orange Stripe */}
        <Rect x={5} y={34} width={48} height={3} fill="#F59E0B" />

        {/* Truck Cabin */}
        <Path d="M 53 16 L 68 16 Q 76 16 78 22 L 79 33 Q 79 40 73 40 L 53 40 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.4} />
        <Path d="M 58 19 L 70 19 Q 74 19 75 23 L 75 29 L 58 29 Z" fill="#64748B" />

        {/* Headlight & Bumper */}
        <Rect x={78} y={33} width={3} height={5} fill="#F59E0B" rx={1} />
        <Rect x={53} y={37} width={26} height={3} fill="#334155" rx={1} />
      </G>

      {/* Right: Warehouse / Godown Facility */}
      <G transform="translate(195, 24)">
        {/* Roof with Orange Trim */}
        <Polygon points="0,20 58,8 116,20" fill="#FFFFFF" stroke="#E8450F" strokeWidth={2.8} />

        {/* Building Facade */}
        <Rect x={5} y={20} width={106} height={43} fill="#E2E8F0" stroke="#CBD5E1" strokeWidth={1.4} />

        {/* Dock Bay Doors */}
        <Rect x={12} y={30} width={28} height={33} fill="#475569" rx={1} stroke="#334155" strokeWidth={1} />
        <Rect x={68} y={28} width={38} height={35} fill="#1E293B" rx={1} stroke="#0F172A" strokeWidth={1} />

        {/* Garage Panel Lines */}
        <Line x1={12} y1={38} x2={40} y2={38} stroke="#64748B" strokeWidth={1} />
        <Line x1={12} y1={46} x2={40} y2={46} stroke="#64748B" strokeWidth={1} />
        <Line x1={12} y1={54} x2={40} y2={54} stroke="#64748B" strokeWidth={1} />

        {/* Cargo Boxes Outside Entrance */}
        <Rect x={44} y={43} width={13} height={13} fill="#F59E0B" rx={1.5} stroke="#D97706" strokeWidth={1} />
        <Rect x={56} y={45} width={11} height={11} fill="#D97706" rx={1.5} stroke="#B45309" strokeWidth={1} />
        <Rect x={48} y={31} width={11} height={11} fill="#F59E0B" rx={1.5} stroke="#D97706" strokeWidth={1} />

        {/* Green Bushes */}
        <Circle cx={112} cy={55} r={5.5} fill="#10B981" />
        <Circle cx={116} cy={57} r={4} fill="#059669" />
      </G>
    </Svg>
  </View>
);

// Clipboard with Checkmarks & Camera Graphic for POD Photo Banner
const ClipboardCameraGraphic = () => (
  <Svg width={54} height={48} viewBox="0 0 54 48">
    {/* Shadow */}
    <Ellipse cx={24} cy={44} rx={20} ry={3} fill="#FED7AA" opacity={0.6} />

    {/* Clipboard Base */}
    <Rect x={4} y={5} width={28} height={34} rx={4} fill="#F59E0B" stroke="#D97706" strokeWidth={1} />
    <Rect x={6} y={9} width={24} height={28} rx={2.5} fill="#FFFFFF" />
    {/* Clip Top */}
    <Rect x={12} y={3} width={12} height={4.5} rx={1.2} fill="#475569" />
    {/* Checkmarks */}
    <Path d="M 9 15 L 12 18 L 16 13" stroke="#10B981" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={18} y1={16} x2={26} y2={16} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M 9 22 L 12 25 L 16 20" stroke="#10B981" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={18} y1={23} x2={26} y2={23} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M 9 29 L 12 32 L 16 27" stroke="#10B981" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={18} y1={30} x2={24} y2={30} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />

    {/* Camera Badge Overlapping Bottom Right */}
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

function formatSimpleDate(iso?: string | null): string {
  if (!iso) return 'Aug 26, 2026 at 10:29 PM';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Aug 26, 2026 at 10:29 PM';
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
}

const GPaySuccessCheckmark = () => {
  const scaleAnim = useRef(new Animated.Value(0.1)).current;
  const rippleScale = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity = useRef(new Animated.Value(0.75)).current;
  const sparkleScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    triggerGPayHapticsAndSound();

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 110,
        useNativeDriver: true,
      }),
      Animated.timing(rippleScale, {
        toValue: 1.55,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(sparkleScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.checkmarkContainer}>
      <Animated.View
        style={[
          styles.rippleCircle,
          {
            transform: [{ scale: rippleScale }],
            opacity: rippleOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.checkmarkCircle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Check size={42} color="#FFFFFF" strokeWidth={3.5} />
      </Animated.View>
    </View>
  );
};

const DeliveryVerificationScreen = () => {
  const router = useRouter();
  const { trip, loading, setTrip } = useCurrentTrip();
  const { photos: savedDocPhotos } = useCargoPodPhotos();
  const ws = trip?.driver_workflow_state || 'ASSIGNED';
  const legIndex = (ws === 'ARRIVED_AT_FINAL_DELIVERY' || ws === 'FINAL_DELIVERY_VERIFICATION' || ws === 'REVIEW_COMPLETE') ? 1 : 0;
  const activeStop = trip?.stops?.find((s) => s.stop_sequence === (legIndex + 2)) ?? null;
  const dropoffStop = activeStop;
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const uploadedIndices = useRef<Set<number>>(new Set());
  const inFlight = useRef(false);
  const viewRef = useRef<any>(null);

  const FILE_BASE = API_URL.replace(/\/api\/?$/, '');
  const cargoDoc = (savedDocPhotos as any[]).find((p) => (p.doc_type === 'Waybill' || p.doc_type === 'Cargo') && (p.entity_id === trip?.id || p.trip_ref_id === trip?.ref_id));
  const podDoc = (savedDocPhotos as any[]).find((p) => p.doc_type === 'POD' && (p.entity_id === trip?.id || p.trip_ref_id === trip?.ref_id));

  const cargoPhotoUri = photos[0]?.uri || (cargoDoc?.file_url ? (cargoDoc.file_url.startsWith('http') ? cargoDoc.file_url : `${FILE_BASE}${cargoDoc.file_url}`) : null);
  const podPhotoUri = photos[1]?.uri || photos[0]?.uri || (podDoc?.file_url ? (podDoc.file_url.startsWith('http') ? podDoc.file_url : `${FILE_BASE}${podDoc.file_url}`) : null);

  // Load draft photos from SecureStore on mount/trip load
  useEffect(() => {
    if (!trip?.id) return;
    const loadDraft = async () => {
      try {
        const key = `delivery_draft_photos_${trip.id}_${legIndex}`;
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
        const key = `delivery_draft_photos_${trip.id}_${legIndex}`;
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

  // Sync step with backend workflow state on load
  useEffect(() => {
    if (trip?.driver_workflow_state === 'REVIEW_COMPLETE' || trip?.driver_workflow_state === 'FIRST_DELIVERY_COMPLETED') {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [trip?.driver_workflow_state]);

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

  const continueToReview = async () => {
    if (!trip || submitting) return;
    setSubmitting(true);
    try {
      for (let i = 0; i < photos.length; i++) {
        if (!uploadedIndices.current.has(i)) {
          await tripService.uploadPhoto(trip.id, 'pod', photos[i], legIndex, 'delivery');
          uploadedIndices.current.add(i);
        }
      }
      const nextState = legIndex === 1 ? 'REVIEW_COMPLETE' : 'FIRST_DELIVERY_COMPLETED';
      const updated = await tripService.updateStatus(trip.id, 'InTransit', nextState);
      setTrip(updated);

      try {
        const key = `delivery_draft_photos_${trip.id}_${legIndex}`;
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

  const complete = async () => {
    if (!trip) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      if (legIndex === 1) {
        const updated = await tripService.updateStatus(trip.id, 'Completed', 'COMPLETED');
        setTrip(updated);
        try {
          const key = `delivery_draft_photos_${trip.id}_${legIndex}`;
          await SecureStore.deleteItemAsync(key);
        } catch (err) {
          console.error('Failed to delete draft key:', err);
        }
        router.replace('/trip/completed');
      } else {
        const updated = await tripService.updateStatus(trip.id, 'InTransit', 'FIRST_DELIVERY_COMPLETED');
        setTrip(updated);
        setStep(2);
      }
    } catch (e) {
      Alert.alert('Could not complete trip', getApiErrorMessage(e));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (submitting && step === 2) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.completingContent}>
          <View style={styles.completingIconCircle}>
            <ClipboardCheck size={72} color="#10B981" strokeWidth={1.5} />
          </View>
          <Text style={styles.completingTitle}>Completing Trip...</Text>
          <ActivityIndicator color="#E8450F" size="large" style={{ marginTop: Spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  const deliveryStartedTime = dropoffStop?.actual_arrival || trip?.actual_start;
  const formattedDeliveryStarted = formatSimpleDate(deliveryStartedTime);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Final Delivery</Text>
            <View style={styles.placeholder} />
          </View>

          {/* 4-Step Progress Stepper: Go to Pickup -> Loading -> In Transit -> Delivery (In Progress) */}
          <TripProgressStepper currentStep={4} />

          {/* Combined Illustration Banner + Trip Summary Card */}
          <View style={styles.combinedCard}>
            <View style={styles.illustrationWrapper}>
              <Image
                source={require('../../../assets/images/delivery.png')}
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

          {/* Location Card with Folded Map Preview */}
          <View style={styles.locationCard}>
            <View style={styles.locationLeftRow}>
              <View style={styles.locationPinBadge}>
                <MapPin size={18} color="#E8450F" strokeWidth={2.2} />
              </View>
              <View style={styles.locationText}>
                <Text style={styles.locationName} numberOfLines={1}>
                  {stopLabel(dropoffStop) ?? 'Riyadh, Saudi Arabia'}
                </Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {stopAddress(dropoffStop) ?? 'الرياض، محافظة الرياض، منطقة الرياض، 12643 السعودية'}
                </Text>
              </View>
            </View>
            <FoldedMapPreviewGraphic />
          </View>

          {/* POD Instructions Banner Card */}
          <View style={styles.instructionCard}>
            <View style={styles.infoIconCircle}>
              <Info size={16} color="#E8450F" strokeWidth={2.4} />
            </View>
            <View style={styles.instructionTextWrapper}>
              <Text style={styles.instructionTitle}>Upload Proof of Delivery (POD) photos.</Text>
              <Text style={styles.instructionSubtext}>Take at least 1 photo.</Text>
            </View>
            <ClipboardCameraGraphic />
          </View>

          {/* Photos Upload Cards Section */}
          <Text style={styles.sectionTitle}>Photos ({photos.length}/3)</Text>
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
            photo={previewPhoto ? { uri: previewPhoto.uri, title: 'POD Photo Preview', location: previewPhoto.location } : null}
            onClose={() => setPreviewPhoto(null)}
          />

          {/* Bottom Primary Action Button */}
          <TouchableOpacity
            style={styles.mainActionBtn}
            activeOpacity={0.85}
            onPress={continueToReview}
            disabled={submitting}
          >
            <Package size={22} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.mainActionBtnText}>CONTINUE TO REVIEW</Text>
            <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View ref={viewRef} style={styles.simpleStep2Wrapper}>
          <ScrollView contentContainerStyle={styles.simpleScrollContent} showsVerticalScrollIndicator={false}>
            {/* Top Bar with back button */}
            <View style={styles.simpleTopBar}>
              <TouchableOpacity style={styles.simpleBackBtn} activeOpacity={0.8} onPress={() => setStep(1)}>
                <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Checkmark and Title */}
            <View style={styles.simpleHeaderSection}>
              <GPaySuccessCheckmark />
              <Text style={styles.simpleHeaderTitle}>Delivery Completed!</Text>
              <Text style={styles.simpleHeaderSub}>
                {legIndex === 1 ? 'All Deliveries Completed' : '1 / 2 Deliveries Completed'}
              </Text>
            </View>

            {/* Trip Summary Card */}
            <View style={styles.simpleCard}>
              <Text style={styles.simpleCardTitle}>Trip Summary</Text>

              <View style={styles.simpleRowBorder}>
                <View style={styles.simpleLabelRow}>
                  <IdCard size={18} color="#10B981" strokeWidth={2} />
                  <Text style={styles.simpleLabelText}>Trip ID</Text>
                </View>
                <Text style={styles.simpleValueText}>#{trip?.ref_id ?? 'TRP-0039'}</Text>
              </View>

              <View style={styles.simpleRowBorder}>
                <View style={styles.simpleLabelRow}>
                  <GitFork size={18} color="#10B981" strokeWidth={2} />
                  <Text style={styles.simpleLabelText}>Trip Type</Text>
                </View>
                <Text style={[styles.simpleValueText, { color: '#10B981', fontWeight: '800' }]}>{trip?.trip_type || 'Round Trip'}</Text>
              </View>

              <View style={styles.simpleRowNoBorder}>
                <View style={styles.simpleLabelRow}>
                  <Clock size={18} color="#10B981" strokeWidth={2} />
                  <Text style={styles.simpleLabelText}>Completed At</Text>
                </View>
                <Text style={styles.simpleValueText}>
                  {formatSimpleDate(dropoffStop?.actual_arrival || activeStop?.actual_arrival || trip?.actual_end)}
                </Text>
              </View>
            </View>

            {/* Trip Media Card */}
            <View style={styles.simpleCard}>
              <Text style={styles.simpleCardTitle}>Trip Media</Text>

              <View style={styles.simpleMediaGrid}>
                {/* Cargo Pickup (Loading) */}
                <View style={styles.simpleMediaCol}>
                  <Text style={styles.simpleMediaLabel}>Cargo Pickup (Loading)</Text>
                  <View style={styles.simpleMediaBox}>
                    {cargoPhotoUri ? (
                      <Image source={{ uri: cargoPhotoUri }} style={styles.simpleMediaImg} resizeMode="cover" />
                    ) : (
                      <ImageIcon size={34} color="#94A3B8" strokeWidth={1.5} />
                    )}
                  </View>
                </View>

                {/* Proof of Delivery (POD) */}
                <View style={styles.simpleMediaCol}>
                  <Text style={styles.simpleMediaLabel}>Proof of Delivery (POD)</Text>
                  <View style={styles.simpleMediaBox}>
                    {podPhotoUri ? (
                      <Image source={{ uri: podPhotoUri }} style={styles.simpleMediaImg} resizeMode="cover" />
                    ) : (
                      <ImageIcon size={34} color="#94A3B8" strokeWidth={1.5} />
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.simpleActionStack}>
              <TouchableOpacity
                style={styles.simplePrimaryBtn}
                activeOpacity={0.85}
                onPress={complete}
                disabled={submitting}
              >
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.simplePrimaryBtnText}>{submitting ? 'COMPLETING…' : 'COMPLETE TRIP'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
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

  completingContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  completingIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  completingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },

  simpleStep2Wrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  simpleScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  simpleTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  simpleBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  checkmarkContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rippleCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#10B981',
  },
  checkmarkCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  simpleHeaderSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  simpleHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  simpleHeaderSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  simpleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  simpleCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  simpleRowBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  simpleRowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  simpleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simpleLabelText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  simpleValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  simpleMediaGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  simpleMediaCol: {
    flex: 1,
  },
  simpleMediaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  simpleMediaBox: {
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleMediaImg: {
    width: '100%',
    height: '100%',
  },
  simpleActionStack: {
    marginTop: 8,
  },
  simplePrimaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  simplePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default DeliveryVerificationScreen;
