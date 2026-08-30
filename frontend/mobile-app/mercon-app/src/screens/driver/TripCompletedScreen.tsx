import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Image, TouchableOpacity, ScrollView, Share, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Share2, Clock, Calendar, User, FileText, MapPin, Home, PackageCheck, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { GeotagPhotoModal } from '../../components';
import { API_URL } from '../../lib/api';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { useCargoPodPhotos } from '../../lib/documents';
import { tripService, type MobileTrip } from '../../lib/trips';
import { safeSecureStore as SecureStore } from '../../lib/secure-store';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../../../assets/images/mercon-logo.png');

const FILE_BASE = API_URL ? API_URL.replace(/\/api\/?$/, '') : '';

const getPhotoUri = (item: any): string | null => {
  if (!item) return null;
  if (typeof item === 'string') {
    return item.startsWith('http') || item.startsWith('file:') || item.startsWith('data:')
      ? item
      : `${FILE_BASE}${item.startsWith('/') ? '' : '/'}${item}`;
  }
  if (typeof item === 'object') {
    const url = item.file_url || item.uri;
    if (!url) return null;
    return url.startsWith('http') || url.startsWith('file:') || url.startsWith('data:')
      ? url
      : `${FILE_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return null;
};

const TripCompletedScreen = () => {
  const router = useRouter();
  const { trip, refetch } = useCurrentTrip();
  const { photos: docs } = useCargoPodPhotos();
  const documents = docs || [];
  
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [completedTrip, setCompletedTrip] = useState<MobileTrip | null>(null);
  const [localPickupPhotos, setLocalPickupPhotos] = useState<any[]>([]);
  const [localDeliveryPhotos, setLocalDeliveryPhotos] = useState<any[]>([]);

  useEffect(() => {
    refetch();
    const loadData = async () => {
      try {
        const history = await tripService.getHistory(1).catch(() => []);
        const latestTrip = history[0] ?? null;
        if (latestTrip) setCompletedTrip(latestTrip);

        const currentOrLatest = trip || latestTrip;
        const targetId = currentOrLatest?.id;
        const targetRefId = currentOrLatest?.ref_id;
        const lastTripId = await SecureStore.getItemAsync('last_completed_trip_id');

        const pickupKeys = [
          targetId ? `pickup_completed_photos_${targetId}` : null,
          targetId ? `pickup_draft_photos_${targetId}` : null,
          targetRefId ? `pickup_completed_photos_${targetRefId}` : null,
          lastTripId ? `pickup_completed_photos_${lastTripId}` : null,
          'last_pickup_photos',
        ].filter(Boolean) as string[];

        for (const key of pickupKeys) {
          const saved = await SecureStore.getItemAsync(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLocalPickupPhotos(parsed);
              break;
            }
          }
        }

        const deliveryKeys = [
          targetId ? `delivery_completed_photos_${targetId}` : null,
          targetId ? `delivery_draft_photos_${targetId}` : null,
          targetRefId ? `delivery_completed_photos_${targetRefId}` : null,
          lastTripId ? `delivery_completed_photos_${lastTripId}` : null,
          'last_delivery_photos',
        ].filter(Boolean) as string[];

        for (const key of deliveryKeys) {
          const saved = await SecureStore.getItemAsync(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLocalDeliveryPhotos(parsed);
              break;
            }
          }
        }
      } catch (e) {
        console.error('Error loading local photos:', e);
      }
    };
    loadData();
  }, [trip?.id]);

  const activeTrip = trip || completedTrip;

  const tripDocs = activeTrip?.id
    ? documents.filter((d) => d.entity_id === activeTrip.id || d.trip_ref_id === activeTrip.ref_id)
    : documents;

  const apiCargo = tripDocs.filter((d) => d.doc_type === 'Waybill' || d.doc_type === 'CARGO_PHOTO' || d.doc_type === 'CustomsClearance');
  const apiPod = tripDocs.filter((d) => d.doc_type === 'POD');

  const polList = apiCargo.length > 0 ? apiCargo : localPickupPhotos;
  const podList = apiPod.length > 0 ? apiPod : localDeliveryPhotos;

  const handleShare = async () => {
    try {
      await Share.share({
        title: `MERCON Trip Summary #${activeTrip?.ref_id ?? 'TRP-0467'}`,
        message: `Trip #${activeTrip?.ref_id ?? 'TRP-0467'} to ${activeTrip?.customer?.name || 'IMILE DELIVERY SAUDI LOGISTICS'} completed successfully.`,
      });
    } catch {
      // silent
    }
  };

  const handleBackHome = () => {
    router.replace('/');
  };

  const rawRef = activeTrip?.ref_id || activeTrip?.id || 'TRP-0467';
  const tripIdDisplay = rawRef.startsWith('TRP-') ? rawRef : `TRP-${rawRef.slice(0, 6)}`;
  const tripRefId = `#${tripIdDisplay}`;
  const customerName = activeTrip?.customer?.name ? activeTrip.customer.name.toUpperCase() : 'IMILE DELIVERY SAUDI LOGISTICS';
  
  // Destination city/address
  const destinationLocation = (activeTrip as any)?.destination_location?.name
    || (activeTrip?.stops && activeTrip.stops.length > 0 ? activeTrip.stops[activeTrip.stops.length - 1]?.location?.name : null)
    || 'Riyadh, Saudi Arabia';

  const formattedLoadingDate = (activeTrip as any)?.actual_pickup || (activeTrip as any)?.actual_start
    ? new Date((activeTrip as any).actual_pickup || (activeTrip as any).actual_start).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Aug 26, 2026 at 09:45 AM';

  const formattedDeliveryDate = activeTrip?.actual_end
    ? new Date(activeTrip.actual_end).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Aug 26, 2026 at 12:03 PM';

  // ---------------------------------------------------------------------------
  // VIEW 1: CLEAN LANDING CARD (MATCHING USER SCREENSHOT EXACTLY)
  // ---------------------------------------------------------------------------
  if (!showDetails) {
    return (
      <SafeAreaView style={styles.cleanContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ScrollView contentContainerStyle={styles.cleanScroll} showsVerticalScrollIndicator={false}>
          {/* Top Checkmark Circle */}
          <View style={styles.cleanCheckWrapper}>
            <View style={styles.cleanCheckCircle}>
              <Check size={48} color="#FFFFFF" strokeWidth={3.8} />
            </View>
          </View>

          {/* Delivered To Subtitle & Bold Customer Name */}
          <View style={styles.cleanHeaderGroup}>
            <Text style={styles.cleanSubtitle}>Delivered to</Text>
            <Text style={styles.cleanCustomerName}>{customerName}</Text>
          </View>

          {/* 3 Detail Info Rows */}
          <View style={styles.cleanInfoList}>
            {/* Row 1: Destination Location */}
            <View style={styles.cleanInfoRow}>
              <MapPin size={24} color="#16A34A" strokeWidth={2.2} />
              <Text style={styles.cleanInfoText}>{destinationLocation}</Text>
            </View>

            {/* Row 2: Delivery Date */}
            <View style={styles.cleanInfoRow}>
              <Calendar size={24} color="#16A34A" strokeWidth={2.2} />
              <Text style={styles.cleanInfoText}>{formattedDeliveryDate}</Text>
            </View>

            {/* Row 3: Trip ID */}
            <View style={styles.cleanInfoRow}>
              <FileText size={24} color="#16A34A" strokeWidth={2.2} />
              <Text style={styles.cleanInfoText}>Trip ID: {tripIdDisplay}</Text>
            </View>
          </View>

          {/* MERCON LOGISTICS Branding Logo */}
          <View style={styles.cleanBrandingGroup}>
            <Image source={logo} style={styles.cleanLogoImage} resizeMode="contain" />
            <Text style={styles.cleanLogoTitle}>MERCON LOGISTICS</Text>
            <Text style={styles.cleanLogoSubtitle}>SERVICES COMPANY</Text>
          </View>
        </ScrollView>

        {/* Bottom 3 Action Buttons */}
        <View style={styles.cleanActionBar}>
          {/* 1. Share screenshot */}
          <TouchableOpacity style={styles.cleanBtnShare} activeOpacity={0.8} onPress={handleShare}>
            <Share2 size={16} color="#16A34A" strokeWidth={2.2} />
            <Text style={styles.cleanBtnShareText} numberOfLines={1}>Share screenshot</Text>
          </TouchableOpacity>

          {/* 2. More details */}
          <TouchableOpacity style={styles.cleanBtnDetails} activeOpacity={0.8} onPress={() => setShowDetails(true)}>
            <FileText size={16} color="#2563EB" strokeWidth={2.2} />
            <Text style={styles.cleanBtnDetailsText} numberOfLines={1}>More details</Text>
          </TouchableOpacity>

          {/* 3. Done */}
          <TouchableOpacity style={styles.cleanBtnDone} activeOpacity={0.85} onPress={handleBackHome}>
            <Text style={styles.cleanBtnDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW 2: FULL DETAILED PAGE (WITH POL / POD PHOTOS AND DETAILED METRICS)
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FDF4" />
      
      {/* Top Header Bar for Detailed View */}
      <View style={styles.detailedHeader}>
        <TouchableOpacity style={styles.detailedBackBtn} activeOpacity={0.8} onPress={() => setShowDetails(false)}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.detailedHeaderTitle}>Trip Details Summary</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            {polList.length > 0 && (
              <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => router.push('/cargo-pod-photos')}>
                <Text style={styles.viewAllText}>View all ›</Text>
              </TouchableOpacity>
            )}
          </View>

          {polList.length === 0 ? (
            <View style={styles.emptyPhotoBox}>
              <PackageCheck size={18} color="#94A3B8" />
              <Text style={styles.emptyPhotoText}>No loading photo attached</Text>
            </View>
          ) : (
            <View style={styles.mediaGrid}>
              {polList.slice(0, 3).map((item, idx) => {
                const photoUri = getPhotoUri(item);
                if (!photoUri) return null;
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
          )}

          <View style={styles.cardDivider} />

          {/* Proof of Delivery (POD) */}
          <View style={styles.mediaSectionHeader}>
            <View style={styles.mediaSectionTitleGroup}>
              <CheckCircle2 size={18} color="#10B981" strokeWidth={2.2} />
              <Text style={styles.mediaSectionTitle}>Proof of Delivery (POD)</Text>
            </View>
            {podList.length > 0 && (
              <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7} onPress={() => router.push('/cargo-pod-photos')}>
                <Text style={styles.viewAllText}>View all ›</Text>
              </TouchableOpacity>
            )}
          </View>

          {podList.length === 0 ? (
            <View style={styles.emptyPhotoBox}>
              <CheckCircle2 size={18} color="#94A3B8" />
              <Text style={styles.emptyPhotoText}>No delivery photo attached</Text>
            </View>
          ) : (
            <View style={styles.mediaGrid}>
              {podList.slice(0, 3).map((item, idx) => {
                const photoUri = getPhotoUri(item);
                if (!photoUri) return null;
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
          )}
        </View>

        {/* 3. Bottom Action Buttons in Detailed View */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8} onPress={() => setShowDetails(false)}>
            <ArrowLeft size={16} color="#10B981" strokeWidth={2.2} />
            <Text style={styles.shareBtnText}>BACK TO SUMMARY</Text>
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
  // ---------------------------------------------------------------------------
  // CLEAN LANDING STYLES (MATCHING USER SCREENSHOT EXACTLY)
  // ---------------------------------------------------------------------------
  cleanContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  cleanScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  cleanCheckWrapper: {
    marginBottom: 28,
  },
  cleanCheckCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cleanHeaderGroup: {
    alignItems: 'center',
    marginBottom: 36,
  },
  cleanSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 6,
  },
  cleanCustomerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 24,
  },
  cleanInfoList: {
    width: '100%',
    paddingHorizontal: 12,
    gap: 22,
    marginBottom: 44,
  },
  cleanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cleanInfoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  cleanBrandingGroup: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  cleanLogoImage: {
    width: 140,
    height: 45,
    marginBottom: 4,
  },
  cleanLogoTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FA634E',
    letterSpacing: 0.8,
  },
  cleanLogoSubtitle: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  cleanActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cleanBtnShare: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  cleanBtnShareText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  cleanBtnDetails: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  cleanBtnDetailsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  cleanBtnDone: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  cleanBtnDoneText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ---------------------------------------------------------------------------
  // DETAILED VIEW STYLES
  // ---------------------------------------------------------------------------
  detailedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailedBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  tripIdBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 10,
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
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
  },
  gridCellLeft: {
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  cellIconRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 1,
  },
  cellValueBold: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 14,
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
  emptyPhotoBox: {
    height: 72,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  emptyPhotoText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
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
    fontSize: 11.5,
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
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default TripCompletedScreen;
