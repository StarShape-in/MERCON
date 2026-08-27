/** Driver Home Screen Component */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, G, Circle } from 'react-native-svg';
import {
  MapPin, Globe, Clock, ChevronRight, ChevronDown, Building2, Navigation,
  Play, CheckCircle2, Wallet, MoreVertical, ArrowRight, Route, House, Camera, Settings,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Badge, DelayReportModal, DriverChargePill, BilingualText } from '../../components';
import { useAuth } from '../../lib/auth-context';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, statusLabel, stopAddress, stopLabel, type TripStatus, type MobileTrip } from '../../lib/trips';
import { getApiErrorMessage } from '../../lib/api';
import { useLanguage } from '../../lib/language-context';

import { getTripChargeValue } from './DriverChargesScreen';

const WORKFLOW_URDU_LABEL: Record<string, string> = {
  ASSIGNED: 'ٹرپ شروع کریں',
  GOING_TO_PICKUP: 'پک اپ پر جائیں',
  ARRIVED_AT_PICKUP: 'لوڈنگ شروع کریں',
  LOADING: 'ٹرپ شروع کریں',
  IN_TRANSIT: 'ڈلیوری پر جائیں',
  ARRIVED_AT_DELIVERY: 'ان لوڈ اور تصدیق کریں',
  DELIVERY_VERIFICATION: 'ان لوڈ اور تصدیق کریں',
  FIRST_DELIVERY_COMPLETED: 'واپسی لوڈنگ شروع کریں',
  RETURN_LOADING: 'واپسی ٹرپ شروع کریں',
  IN_TRANSIT_RETURN: 'فائنل ڈلیوری پر جائیں',
  ARRIVED_AT_FINAL_DELIVERY: 'فائنل ان لوڈ اور تصدیق',
  FINAL_DELIVERY_VERIFICATION: 'فائنل ان لوڈ اور تصدیق',
  REVIEW_COMPLETE: 'ٹرپ مکمل کریں',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Header SVG: Dark Charcoal (#3E3C3D) on top-left background touching left/top edges with Coral Red (#FA634E) on right */
function HeaderWaveBg({ width = SCREEN_WIDTH, height = 310 }: { width?: number; height?: number }) {
  const topExtension = 600;
  const totalHeight = height + topExtension;
  return (
    <Svg
      width={width}
      height={totalHeight}
      viewBox={`0 -${topExtension} 400 ${totalHeight}`}
      preserveAspectRatio="none"
      style={[StyleSheet.absoluteFill, { top: -topExtension, height: totalHeight }]}
    >
      {/* 1. Base Coral Red Background (#FA634E) covering full right & main area upwards */}
      <Path d={`M -10 -${topExtension + 10} L 410 -${topExtension + 10} L 410 ${height + 10} L -10 ${height + 10} Z`} fill="#FA634E" />

      {/* 2. Bold Dark Charcoal (#3E3C3D) Area touching top & left edges completely */}
      <Path
        d={`M -10 -${topExtension + 10} L 430 -${topExtension + 10} L 160 ${height + 10} L -10 ${height + 10} Z`}
        fill="#3E3C3D"
      />

      {/* 3. Subtle Dotted Pattern Grid on the Charcoal area extending upwards */}
      <G opacity={0.18}>
        {[-150, -120, -90, -60, -30, 0, 30, 45, 60, 75, 90, 105, 120, 135, 150].map((yVal) => (
          <React.Fragment key={yVal}>
            <Circle cx="35" cy={yVal} r="2.2" fill="#FFFFFF" />
            <Circle cx="50" cy={yVal} r="2.2" fill="#FFFFFF" />
            <Circle cx="65" cy={yVal} r="2.2" fill="#FFFFFF" />
            <Circle cx="80" cy={yVal} r="2.2" fill="#FFFFFF" />
            <Circle cx="95" cy={yVal} r="2.2" fill="#FFFFFF" />
            <Circle cx="110" cy={yVal} r="2.2" fill="#FFFFFF" />
          </React.Fragment>
        ))}
      </G>
    </Svg>
  );
}

/** Badge colour by trip status. */
function statusVariant(s: TripStatus): 'warning' | 'success' | 'info' | 'neutral' {
  if (s === 'InTransit') return 'warning';
  if (s === 'Completed') return 'success';
  if (s === 'AtPickup' || s === 'AtDelivery') return 'info';
  return 'neutral';
}

/** Short "27 Jul, 14:30" label, or a fallback when there's no timestamp. */
function shortWhen(iso?: string | null, fallback = 'Scheduled'): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatCharge(val?: number | string | null): string {
  if (val === null || val === undefined) return '0.00';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const HomeScreen = () => {
  const { profile, signOut } = useAuth();
  const { trip, loading, error, refetch, setTrip } = useCurrentTrip();
  const { language, openLanguageModal, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('Home');
  const [advancing, setAdvancing] = useState(false);
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [scheduledTrips, setScheduledTrips] = useState<MobileTrip[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const router = useRouter();

  // Restore current trip workflow screen on mount
  const restoredRef = useRef(false);
  useEffect(() => {
    if (loading || !trip || restoredRef.current) return;
    restoredRef.current = true;
    const ws = trip.driver_workflow_state || 'ASSIGNED';
    if (ws === 'GOING_TO_PICKUP' || ws === 'IN_TRANSIT' || ws === 'IN_TRANSIT_RETURN') {
      router.push('/trip/navigate');
    } else if (ws === 'ARRIVED_AT_PICKUP' || ws === 'LOADING' || ws === 'RETURN_LOADING') {
      router.push('/trip/pickup');
    } else if (ws === 'ARRIVED_AT_DELIVERY' || ws === 'DELIVERY_VERIFICATION' || ws === 'ARRIVED_AT_FINAL_DELIVERY' || ws === 'FINAL_DELIVERY_VERIFICATION' || ws === 'REVIEW_COMPLETE') {
      router.push('/trip/delivery');
    }
  }, [trip, loading]);

  const fetchEarnings = useCallback(async () => {
    try {
      const history = await tripService.getHistory(100);
      const total = history.reduce((sum, t) => {
        if (t.status === 'Completed' || t.status === 'Invoiced') {
          return sum + getTripChargeValue(t);
        }
        return sum;
      }, 0);
      setTotalEarnings(total);
    } catch {
      // silently fail
    }
  }, []);

  const fetchScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const data = await tripService.getScheduled();
      setScheduledTrips(trip ? data.filter((t) => t.id !== trip.id) : data);
    } catch {
      // silently fail
    } finally {
      setScheduledLoading(false);
    }
  }, [trip]);

  // Refresh the trip whenever Home regains focus
  useFocusEffect(useCallback(() => { refetch(); fetchScheduled(); fetchEarnings(); }, [refetch, fetchScheduled, fetchEarnings]));

  const firstName = (profile?.name || 'Driver').split(' ')[0];

  const pickupStop = trip?.stops?.find((s) => s.stop_type === 'Pickup') ?? null;
  const dropoffStop = trip?.stops?.find((s) => s.stop_type === 'Dropoff') ?? null;
  const intermediateStops = trip?.stops?.filter((s) => s.stop_type !== 'Pickup' && s.stop_type !== 'Dropoff') ?? [];

  const langTag = language === 'en' ? 'EN' : language === 'ur' ? 'اردو' : 'اردو / EN';

  interface WorkflowStateInfo {
    badgeLabel: string;
    btnLabel: string;
    onPress: () => void;
  }

  const getWorkflowStateInfo = (t: MobileTrip): WorkflowStateInfo => {
    const ws = t.driver_workflow_state || 'ASSIGNED';
    switch (ws) {
      case 'ASSIGNED':
        return {
          badgeLabel: 'Assigned',
          btnLabel: 'Start Trip',
          onPress: async () => {
            setAdvancing(true);
            try {
              const updated = await tripService.updateStatus(t.id, 'Scheduled', 'GOING_TO_PICKUP');
              setTrip(updated);
              router.push('/trip/navigate');
            } catch (err) {
              Alert.alert('Error', getApiErrorMessage(err));
            } finally {
              setAdvancing(false);
            }
          }
        };
      case 'GOING_TO_PICKUP':
        return {
          badgeLabel: 'Going to Pickup',
          btnLabel: 'Go to Pickup',
          onPress: () => router.push('/trip/navigate')
        };
      case 'ARRIVED_AT_PICKUP':
        return {
          badgeLabel: 'Arrived at Pickup',
          btnLabel: 'Start Loading',
          onPress: () => router.push('/trip/pickup')
        };
      case 'LOADING':
        return {
          badgeLabel: 'Loading In Progress',
          btnLabel: 'Start Trip',
          onPress: () => router.push('/trip/pickup')
        };
      case 'IN_TRANSIT':
        return {
          badgeLabel: 'In Transit',
          btnLabel: 'Go to Delivery',
          onPress: () => router.push('/trip/navigate')
        };
      case 'ARRIVED_AT_DELIVERY':
      case 'DELIVERY_VERIFICATION':
        return {
          badgeLabel: 'Arrived at Delivery',
          btnLabel: 'Unload & Verify',
          onPress: () => router.push('/trip/delivery')
        };
      case 'FIRST_DELIVERY_COMPLETED':
        return {
          badgeLabel: '1 / 2 Completed',
          btnLabel: 'Start Return Loading',
          onPress: async () => {
            setAdvancing(true);
            try {
              const updated = await tripService.updateStatus(t.id, 'Loading', 'RETURN_LOADING');
              setTrip(updated);
              router.push('/trip/pickup');
            } catch (err) {
              Alert.alert('Error', getApiErrorMessage(err));
            } finally {
              setAdvancing(false);
            }
          }
        };
      case 'RETURN_LOADING':
        return {
          badgeLabel: 'Return Loading',
          btnLabel: 'Start Return Trip',
          onPress: () => router.push('/trip/pickup')
        };
      case 'IN_TRANSIT_RETURN':
        return {
          badgeLabel: 'In Transit (Return)',
          btnLabel: 'Go to Final Delivery',
          onPress: () => router.push('/trip/navigate')
        };
      case 'ARRIVED_AT_FINAL_DELIVERY':
      case 'FINAL_DELIVERY_VERIFICATION':
        return {
          badgeLabel: 'Arrived at Final Delivery',
          btnLabel: 'Final Unload & Verify',
          onPress: () => router.push('/trip/delivery')
        };
      case 'REVIEW_COMPLETE':
        return {
          badgeLabel: 'Review & Complete',
          btnLabel: 'Complete Trip',
          onPress: () => router.push('/trip/delivery')
        };
      default:
        return {
          badgeLabel: statusLabel(t.status),
          btnLabel: 'Start Trip',
          onPress: () => {
            if (t.status === 'Scheduled' || t.status === 'Draft') { router.push('/trip/navigate'); }
            else if (t.status === 'Loading' || t.status === 'AtPickup') { router.push('/trip/pickup'); }
            else { router.push('/trip/delivery'); }
          }
        };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FA634E" />

      {/* Main ScrollView containing both Header and Content for smooth pull-to-refresh & continuous scrolling */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              refetch();
              fetchScheduled();
              fetchEarnings();
            }}
            tintColor="#FFFFFF"
            progressBackgroundColor="#FA634E"
            colors={['#FFFFFF']}
          />
        }
      >
        {/* Header Block inside ScrollView */}
        <View style={styles.headerContainer}>
          <HeaderWaveBg width={SCREEN_WIDTH} height={310} />

          <SafeAreaView style={styles.headerSafe}>
            {/* Top Header Row: Language Top-Left, Driver Charge Top-Right */}
            <View style={styles.topHeaderRow}>
              {/* Select Language on Top-Left */}
              <TouchableOpacity onPress={openLanguageModal} activeOpacity={0.8} style={styles.langPill}>
                <Globe size={15} color="#3E3C3D" strokeWidth={2.2} />
                <Text style={styles.langPillText}>{langTag}</Text>
                <ChevronDown size={14} color="#3E3C3D" strokeWidth={2.2} />
              </TouchableOpacity>

              {/* Driver Charge on Top-Right */}
              <DriverChargePill amount={totalEarnings} />
            </View>

            {/* Welcome back / Greeting below Language on the Left */}
            <View style={styles.greetingBox}>
              <Text style={styles.greetingSub}>{t('title_welcome_back', 'Good Morning,')}</Text>
              <Text style={styles.greetingMain}>{t('msg_drive_safe', 'Drive Safe Today!')}</Text>
            </View>
          </SafeAreaView>
        </View>

        {/* ── Current Trip Card Section (Overlapping Header naturally) ── */}
        <View style={styles.cardWrapper}>
          {loading && !trip ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#FA634E" />
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={refetch}><Text style={styles.retryText}>Tap to retry</Text></TouchableOpacity>
            </View>
          ) : !trip ? (
            <View style={styles.emptyCard}>
              <BilingualText
                ur="فی الحال کوئی فعال ٹرپ نہیں ہے"
                en="No active trip at the moment"
                align="center"
                primaryStyle={styles.emptyTitleUrdu}
                subStyle={styles.emptyTitleEn}
              />
              <BilingualText
                ur="آپ کا تمام کام مکمل ہے، اگلے ٹرپ اسائنمنٹ کا انتظار ہے۔"
                en="You're all caught up. Waiting for your next assignment."
                align="center"
                primaryStyle={styles.emptySubUrdu}
                subStyle={styles.emptySubEn}
                containerStyle={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <View style={styles.refTripCard}>
              {/* Card Header */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleCol}>
                  <BilingualText
                    ur="موجودہ ٹرپ"
                    en="Current Trip"
                    primaryStyle={styles.cardTitleUrduPrimary}
                    subStyle={styles.cardTitleSubEn}
                  />
                </View>

                <View style={styles.headerRightGroup}>
                  <View style={styles.inProgressBadge}>
                    <View style={styles.coralDot} />
                    <Text style={styles.inProgressText} numberOfLines={1} ellipsizeMode="tail">
                      {trip.driver_workflow_state ? trip.driver_workflow_state.replace(/_/g, ' ') : 'In Progress'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.moreOptionsBtn}>
                    <MoreVertical size={18} color="#3E3C3D" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Trip ID Row */}
              <View style={styles.tripIdRow}>
                <Text style={styles.tripIdLabel}>Trip ID</Text>
                <Text style={styles.tripIdValue}>TRP-{trip.ref_id ?? trip.id.slice(0, 8)}</Text>
              </View>

              <View style={styles.cardDivider} />

              {/* Route Vertical Timeline */}
              <View style={styles.routeContainer}>
                {/* Left Timeline Line & Nodes */}
                <View style={styles.timelineCol}>
                  <View style={styles.pickupNodeOuter}>
                    <View style={styles.pickupNodeInner} />
                  </View>
                  <View style={styles.dashedLine} />
                  {intermediateStops.length > 0 && (
                    <>
                      <View style={styles.stopNodeDot} />
                      <View style={styles.dashedLine} />
                    </>
                  )}
                  <View style={styles.stopNodeDot} />
                </View>

                {/* Right Route Items */}
                <View style={styles.routeItemsCol}>
                  {/* Pickup Item */}
                  <View style={styles.routeRowItem}>
                    <View style={styles.iconCircleBadge}>
                      <House size={20} color="#FA634E" strokeWidth={2} />
                    </View>
                    <View style={styles.routeTextCol}>
                      <BilingualText
                        ur="پک اپ"
                        en="Pickup"
                        primaryStyle={styles.stageUrduPrimary}
                        subStyle={styles.stageSubEn}
                      />
                      <Text style={styles.routePlaceName} numberOfLines={1}>
                        {stopLabel(pickupStop) ?? 'Mercon Logistics Hub'}
                      </Text>
                      <Text style={styles.routeAddressText} numberOfLines={1}>
                        {stopAddress(pickupStop) ?? 'Bhiwandi, Thane, Maharashtra'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.navCircleBtn} onPress={() => router.push('/trip/navigate')}>
                      <Navigation size={16} color="#3E3C3D" strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>

                  {/* Intermediate Stops Item (Only shown if trip has intermediate stops) */}
                  {intermediateStops.length > 0 && (
                    <View style={styles.routeRowItem}>
                      <View style={styles.iconCircleBadge}>
                        <Route size={20} color="#FA634E" strokeWidth={2} />
                      </View>
                      <View style={styles.routeTextCol}>
                        <BilingualText
                          ur="اسٹاپس"
                          en="Stops"
                          primaryStyle={styles.stageUrduPrimary}
                          subStyle={styles.stageSubEn}
                        />
                        <Text style={styles.routePlaceName}>
                          {intermediateStops.length} {intermediateStops.length === 1 ? 'Intermediate Stop' : 'Intermediate Stops'}
                        </Text>
                        <Text style={styles.routeAddressText} numberOfLines={1}>
                          {intermediateStops.map((s) => stopLabel(s)).filter(Boolean).join(', ')}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.navCircleBtn}>
                        <ChevronDown size={18} color="#3E3C3D" strokeWidth={2.2} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Delivery Item */}
                  <View style={styles.routeRowItem}>
                    <View style={styles.iconCircleBadge}>
                      <MapPin size={20} color="#FA634E" strokeWidth={2} />
                    </View>
                    <View style={styles.routeTextCol}>
                      <BilingualText
                        ur="ڈلیوری"
                        en="Delivery"
                        primaryStyle={styles.stageUrduPrimary}
                        subStyle={styles.stageSubEn}
                      />
                      <Text style={styles.routePlaceName} numberOfLines={1}>
                        {stopLabel(dropoffStop) ?? 'Pune Warehouse'}
                      </Text>
                      <Text style={styles.routeAddressText} numberOfLines={1}>
                        {stopAddress(dropoffStop) ?? 'Chakan, Pune, Maharashtra'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.navCircleBtn} onPress={() => router.push('/trip/navigate')}>
                      <Navigation size={16} color="#3E3C3D" strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Primary Action CTA & Secondary Delay Button Below */}
              {(() => {
                const info = getWorkflowStateInfo(trip);
                return (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.primaryCtaBtn, advancing && { opacity: 0.7 }]}
                      activeOpacity={0.88}
                      onPress={info.onPress}
                      disabled={advancing}
                    >
                      {advancing ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <View style={styles.ctaContentRow}>
                          <BilingualText
                            ur={WORKFLOW_URDU_LABEL[trip.driver_workflow_state || 'ASSIGNED'] || 'ٹرپ شروع کریں'}
                            en={info.btnLabel || 'Go to Pickup'}
                            align="center"
                            primaryStyle={styles.ctaUrduPrimary}
                            subStyle={styles.ctaSubEn}
                          />
                          <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Secondary Action - Report Delay (Below Start Button) */}
                    <TouchableOpacity
                      style={styles.secondaryDelayBtn}
                      activeOpacity={0.85}
                      onPress={() => setDelayModalVisible(true)}
                    >
                      <Clock size={16} color="#FA634E" strokeWidth={2.2} />
                      <BilingualText
                        ur="تاخیر کی اطلاع دیں"
                        en="Report Delay"
                        align="center"
                        primaryStyle={styles.delayUrduPrimary}
                        subStyle={styles.delaySubEn}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          )}
        </View>
      </ScrollView>

      <DelayReportModal
        visible={delayModalVisible}
        tripId={trip?.id ?? null}
        onClose={() => setDelayModalVisible(false)}
        onSuccess={() => refetch()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  topHeaderFill: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000 + 310,
    backgroundColor: '#FA634E',
  },
  headerContainer: {
    height: 310,
    width: '100%',
    position: 'relative',
    backgroundColor: '#FA634E',
  },
  headerSafe: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverChargePill: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3E3C3D',
    borderRadius: 19,
    paddingHorizontal: 12,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeTextCol: {
    justifyContent: 'center',
  },
  chargeAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 15,
  },
  chargeLabel: {
    fontSize: 9.5,
    color: '#D8D8DC',
    lineHeight: 11,
    fontWeight: '500',
  },
  langPill: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    paddingHorizontal: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  langPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#3E3C3D',
  },
  greetingBox: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    textAlign: 'center',
  },
  greetingMain: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  cardWrapper: {
    paddingHorizontal: 16,
    marginTop: -120,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    color: '#FA634E',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginTop: 10,
  },
  emptyTitleUrdu: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E3C3D',
    textAlign: 'center',
  },
  emptyTitleEn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6E80',
    textAlign: 'center',
  },
  emptySubUrdu: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#6E6E80',
    textAlign: 'center',
  },
  emptySubEn: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9898A4',
    textAlign: 'center',
  },

  /* Reference Card */
  refTripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    minHeight: 460,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleCol: {
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#3E3C3D',
  },
  cardTitleUrduPrimary: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E3C3D',
  },
  cardTitleSubEn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6E80',
  },
  stageUrduPrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E3C3D',
  },
  stageSubEn: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6E80',
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaStackedCol: {
    alignItems: 'center',
  },
  ctaUrduPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  ctaSubEn: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 14,
  },
  delayStackedCol: {
    alignItems: 'center',
  },
  delayUrduPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FA634E',
    lineHeight: 18,
  },
  delaySubEn: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#6E6E80',
    lineHeight: 13,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  inProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    flexShrink: 1,
    maxWidth: 160,
  },
  coralDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FA634E',
  },
  inProgressText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FA634E',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  moreOptionsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  tripIdLabel: {
    fontSize: 13,
    color: '#9898A4',
    fontWeight: '500',
  },
  tripIdValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E3C3D',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EEF1F6',
    marginVertical: 16,
  },

  /* Route Timeline */
  routeContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  timelineCol: {
    width: 24,
    alignItems: 'center',
    paddingTop: 14,
  },
  pickupNodeOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FA634E',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupNodeInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FA634E',
  },
  dashedLine: {
    width: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#D8D8DC',
    borderStyle: 'dashed',
    marginVertical: 2,
  },
  stopNodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#3E3C3D',
    backgroundColor: '#FFFFFF',
  },

  routeItemsCol: {
    flex: 1,
    gap: 16,
  },
  routeRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTextCol: {
    flex: 1,
  },
  routeStageLabel: {
    fontSize: 12,
    color: '#9898A4',
    fontWeight: '500',
  },
  routePlaceName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E3C3D',
    marginTop: 1,
  },
  routeAddressText: {
    fontSize: 12,
    color: '#6E6E80',
    marginTop: 2,
  },
  navCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Actions */
  actionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  primaryCtaBtn: {
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FA634E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
    shadowColor: '#FA634E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryCtaText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryDelayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFF0ED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  secondaryDelayText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FA634E',
  },
});

export default HomeScreen;
