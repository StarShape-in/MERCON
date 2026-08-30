import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Image, TouchableOpacity, ScrollView, Share, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { Check, Share2, Clock, Calendar, User, FileText, MapPin, Home, PackageCheck, CheckCircle2 } from 'lucide-react-native';
import { GeotagPhotoModal } from '../../components';
import { API_URL } from '../../lib/api';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { useCargoPodPhotos } from '../../lib/documents';

const FILE_BASE = API_URL ? API_URL.replace(/\/api\/?$/, '') : '';

const SAMPLE_CARGO_PHOTOS = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
];

const SAMPLE_POD_PHOTOS = [
  'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
];

const getPhotoUri = (item: any, defaultUrl: string) => {
  if (typeof item === 'object' && item?.file_url) {
    const url = item.file_url;
    return url.startsWith('http') ? url : `${FILE_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return defaultUrl;
};

// Vibrant Green Success Checkmark Badge with Spring Entrance, Dual Glow Rings & Rich Confetti
const SuccessCheckmarkBadge = () => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.heroBadgeWrapper, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      {/* Outer Soft Aura Ring */}
      <View style={styles.heroCheckOuterRing} />
      {/* Inner Glow Ring */}
      <View style={styles.heroCheckGlowRing} />
      {/* Core Solid Green Check Circle */}
      <View style={styles.heroCheckCircle}>
        <Check size={42} color="#FFFFFF" strokeWidth={4} />
      </View>

      {/* Rich Sparkle & Confetti Burst Overlay */}
      <Svg width={220} height={120} viewBox="0 0 220 120" style={styles.confettiOverlay}>
        {/* Left Side Confetti & Sparkles */}
        <Circle cx={25} cy={35} r={3.5} fill="#F59E0B" />
        <Circle cx={45} cy={18} r={2.5} fill="#10B981" />
        <Circle cx={15} cy={65} r={3} fill="#06B6D4" />
        <Circle cx={42} cy={85} r={2} fill="#FF6B6B" />
        <Path d="M 18 42 L 24 36" stroke="#FF6B6B" strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M 32 80 L 38 76" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" />

        {/* Right Side Confetti & Sparkles */}
        <Circle cx={195} cy={35} r={3.5} fill="#10B981" />
        <Circle cx={175} cy={18} r={2.5} fill="#F59E0B" />
        <Circle cx={205} cy={65} r={3} fill="#6366F1" />
        <Circle cx={178} cy={85} r={2} fill="#FF6B6B" />
        <Path d="M 198 42 L 192 36" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" />
        <Path d="M 182 78 L 176 74" stroke="#6366F1" strokeWidth={2} strokeLinecap="round" />

        {/* Top Floating Stars */}
        <Circle cx={110} cy={10} r={3} fill="#F59E0B" />
        <Circle cx={85} cy={16} r={2.5} fill="#10B981" />
        <Circle cx={135} cy={16} r={2.5} fill="#06B6D4" />
      </Svg>
    </Animated.View>
  );
};

const TripCompletedScreen = () => {
  const router = useRouter();
  const { trip, refetch } = useCurrentTrip();
  const { photos: docs } = useCargoPodPhotos();
  const documents = docs || [];
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  useEffect(() => {
    refetch();
  }, []);

  const tripDocs = trip?.id
    ? documents.filter((d) => d.entity_id === trip.id || d.trip_ref_id === trip.ref_id)
    : documents;

  const cargoPhotos = tripDocs.filter((d) => d.doc_type === 'Waybill' || d.doc_type === 'CARGO_PHOTO' || d.doc_type === 'CustomsClearance');
  const podPhotos = tripDocs.filter((d) => d.doc_type === 'POD');

  const handleShare = async () => {
    try {
      await Share.share({
        title: `MERCON Trip Summary #${trip?.ref_id ?? 'TRP-0399'}`,
        message: `Trip #${trip?.ref_id ?? 'TRP-0399'} to ${trip?.customer?.name || 'Customer'} completed successfully. Distance: 164 km, Duration: 2h 18m.`,
      });
    } catch {
      // silent
    }
  };

  const handleBackHome = () => {
    router.replace('/');
  };

  const tripRefId = trip?.ref_id ? `#${trip.ref_id}` : '#TRP-0430';
  const customerName = trip?.customer?.name ? trip.customer.name.toUpperCase() : 'IMILE DELIVERY SAUDI LOGIS...';
  
  const formattedLoadingDate = (trip as any)?.actual_pickup || (trip as any)?.actual_start
    ? new Date((trip as any).actual_pickup || (trip as any).actual_start).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Aug 26, 2026 at 09:45 AM';

  const formattedDeliveryDate = trip?.actual_end
    ? new Date(trip.actual_end).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Aug 26, 2026 at 12:03 PM';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FDF4" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Hero Header with Success Badge */}
        <View style={styles.topHeroSection}>
          {/* Floating Back Button on Top Left */}
          <TouchableOpacity style={styles.floatingBackBtn} activeOpacity={0.8} onPress={handleBackHome}>
            <Text style={styles.backIconText}>←</Text>
          </TouchableOpacity>

          {/* Hero Main Content */}
          <View style={styles.topHeroContent}>
            <SuccessCheckmarkBadge />
          </View>
        </View>

        {/* 1. Trip Summary Card */}
        <View style={styles.summaryCard}>
          {/* Card Header Row */}
          <View style={styles.summaryCardHeader}>
            <Text style={styles.summaryTitle}>Trip Summary</Text>
            <Text style={styles.tripIdBadge}>{tripRefId}</Text>
          </View>

          {/* 2-Column Grid Container */}
          <View style={styles.gridContainer}>
            {/* Grid Row 1: Customer (Left) | Duration (Right) */}
            <View style={styles.gridRow}>
              <View style={[styles.gridCell, styles.gridCellLeft]}>
                <View style={styles.cellIconRing}>
                  <User size={11} color="#10B981" strokeWidth={2.2} />
                </View>
                <View style={styles.cellTextWrapper}>
                  <Text style={styles.cellLabel}>Customer</Text>
                  <Text style={styles.cellValueBold} numberOfLines={2}>
                    {customerName}
                  </Text>
                </View>
              </View>

              <View style={styles.gridCell}>
                <View style={styles.cellIconRing}>
                  <Clock size={11} color="#10B981" strokeWidth={2.2} />
                </View>
                <View style={styles.cellTextWrapper}>
                  <Text style={styles.cellLabel}>Duration</Text>
                  <Text style={styles.cellValueBold}>2h 18m</Text>
                </View>
              </View>
            </View>

            {/* Grid Row 2: Distance (Left) | Delivery Completed (Right) */}
            <View style={styles.gridRow}>
              <View style={[styles.gridCell, styles.gridCellLeft]}>
                <View style={styles.cellIconRing}>
                  <MapPin size={11} color="#10B981" strokeWidth={2.2} />
                </View>
                <View style={styles.cellTextWrapper}>
                  <Text style={styles.cellLabel}>Distance</Text>
                  <Text style={styles.cellValueBold}>164 km</Text>
                </View>
              </View>

              <View style={styles.gridCell}>
                <View style={styles.cellIconRing}>
                  <CheckCircle2 size={11} color="#10B981" strokeWidth={2.2} />
                </View>
                <View style={styles.cellTextWrapper}>
                  <Text style={styles.cellLabel}>Delivery Completed</Text>
                  <Text style={styles.cellValueBold}>{formattedDeliveryDate}</Text>
                </View>
              </View>
            </View>

            {/* Grid Row 3: Loading Completed (Left) */}
            <View style={[styles.gridRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.gridCell, styles.gridCellLeft]}>
                <View style={styles.cellIconRing}>
                  <PackageCheck size={11} color="#10B981" strokeWidth={2.2} />
                </View>
                <View style={styles.cellTextWrapper}>
                  <Text style={styles.cellLabel}>Loading Completed</Text>
                  <Text style={styles.cellValueBold}>{formattedLoadingDate}</Text>
                </View>
              </View>
              <View style={styles.gridCell} />
            </View>
          </View>
        </View>

        {/* 2. Proof Media Card */}
        <View style={styles.mediaCard}>
          {/* Proof of Loading (POL) */}
          <View style={styles.mediaSectionHeader}>
            <View style={styles.mediaSectionTitleGroup}>
              <PackageCheck size={18} color="#10B981" strokeWidth={2.2} />
              <Text style={styles.mediaSectionTitle}>Proof of Loading (POL)</Text>
            </View>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View all ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mediaGrid}>
            {(cargoPhotos.length > 0 ? cargoPhotos : SAMPLE_CARGO_PHOTOS.map((u, i) => ({ id: i, file_url: u }))).slice(0, 3).map((item, idx) => {
              const photoUri = getPhotoUri(item, SAMPLE_CARGO_PHOTOS[idx % SAMPLE_CARGO_PHOTOS.length]);
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.mediaThumbFrame}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPhoto({ uri: photoUri, title: `Proof of Loading (POL) #${idx + 1}` })}
                >
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.mediaThumbImg}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.cardDivider} />

          {/* Proof of Delivery (POD) */}
          <View style={styles.mediaSectionHeader}>
            <View style={styles.mediaSectionTitleGroup}>
              <CheckCircle2 size={18} color="#10B981" strokeWidth={2.2} />
              <Text style={styles.mediaSectionTitle}>Proof of Delivery (POD)</Text>
            </View>
            <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View all ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mediaGrid}>
            {(podPhotos.length > 0 ? podPhotos : SAMPLE_POD_PHOTOS.map((u, i) => ({ id: i, file_url: u }))).slice(0, 3).map((item, idx) => {
              const photoUri = getPhotoUri(item, SAMPLE_POD_PHOTOS[idx % SAMPLE_POD_PHOTOS.length]);
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.mediaThumbFrame}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPhoto({ uri: photoUri, title: `Proof of Delivery (POD) #${idx + 1}` })}
                >
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.mediaThumbImg}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Bottom Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8} onPress={handleShare}>
            <Share2 size={16} color="#10B981" strokeWidth={2.2} />
            <Text style={styles.shareBtnText}>SHARE TRIP</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeBtn} activeOpacity={0.85} onPress={handleBackHome}>
            <Home size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.homeBtnText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GeotagPhotoModal
        visible={!!selectedPhoto}
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  topHeroSection: {
    position: 'relative',
    width: '100%',
    height: 260,
  },
  floatingBackBtn: {
    position: 'absolute',
    top: 10,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 30,
  },
  backIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroBadgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  heroCheckOuterRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  heroCheckGlowRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  heroCheckCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  confettiOverlay: {
    position: 'absolute',
    top: 10,
  },
  topHeroContent: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    width: '84%',
    alignSelf: 'center',
    marginTop: -30,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  tripIdBadge: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#10B981',
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  gridCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 5,
  },
  gridCellLeft: {
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  cellIconRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cellTextWrapper: {
    flex: 1,
  },
  cellLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 0,
  },
  cellValueBold: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 12,
  },

  mediaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mediaSectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaThumbFrame: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  mediaThumbImg: {
    width: '100%',
    height: '100%',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 28,
  },
  shareBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  homeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  homeBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default TripCompletedScreen;
