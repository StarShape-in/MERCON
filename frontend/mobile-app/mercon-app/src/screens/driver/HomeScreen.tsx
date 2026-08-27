import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ImageBackground,
  StyleSheet, StatusBar, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, Hand, Globe, Clock, Banknote, Calendar, ChevronRight, Building2, Navigation, Camera, Play, CheckCircle2, Repeat, Info, Package } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Badge, DarkCard, DelayReportModal } from '../../components';
import { useAuth } from '../../lib/auth-context';
import { useCurrentTrip } from '../../lib/use-current-trip';
import { tripService, NEXT_STEP, PHOTO_FOR, statusLabel, stopAddress, stopLabel, type TripStatus, type MobileTrip } from '../../lib/trips';
import { choosePhoto } from '../../lib/camera';
import { getApiErrorMessage } from '../../lib/api';
import { useLanguage } from '../../lib/language-context';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const homeBg = require('../../../assets/images/home-bg.png');

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

  const fetchEarnings = useCallback(async () => {
    try {
      const history = await tripService.getHistory(100);
      const total = history.reduce((sum, t) => {
        if (t.status === 'Completed' || t.status === 'Invoiced') {
          const val = Number(t.trip_charges || t.billing_amount || 0);
          return sum + (Number.isNaN(val) ? 0 : val);
        }
        return sum;
      }, 0);
      setTotalEarnings(total);
    } catch {
      // silently fail
    }
  }, []);

  // Refresh the trip whenever Home regains focus (e.g. returning from a step screen).
  useFocusEffect(useCallback(() => { refetch(); fetchScheduled(); fetchEarnings(); }, [refetch, fetchEarnings]));

  const fetchScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const data = await tripService.getScheduled();
      // Filter out current trip from scheduled list to avoid duplicates
      setScheduledTrips(trip ? data.filter((t) => t.id !== trip.id) : data);
    } catch {
      // silently fail — not critical
    } finally {
      setScheduledLoading(false);
    }
  }, [trip]);

  const firstName = (profile?.name || 'Driver').split(' ')[0];

  const pickupStop = trip?.stops?.find((s) => s.stop_type === 'Pickup') ?? null;
  const dropoffStop = trip?.stops?.find((s) => s.stop_type === 'Dropoff') ?? null;

  const getExactDistance = () => {
    if (trip?.planned_distance) {
      return `${Number(trip.planned_distance).toFixed(1)} km`;
    }
    if (pickupStop && dropoffStop && pickupStop.location_lat && pickupStop.location_lng && dropoffStop.location_lat && dropoffStop.location_lng) {
      const distM = distanceMeters(
        pickupStop.location_lat,
        pickupStop.location_lng,
        dropoffStop.location_lat,
        dropoffStop.location_lng
      );
      return `${(distM / 1000).toFixed(1)} km`;
    }
    return '—';
  };

  const langTag = language === 'en' ? 'EN' : language === 'ur' ? 'اردو' : 'اردو / EN';

  interface WorkflowStateInfo {
    badgeLabel: string;
    badgeVariant: 'neutral' | 'info' | 'warning' | 'success';
    btnLabel: string;
    onPress: () => void;
  }

  const getWorkflowStateInfo = (t: MobileTrip): WorkflowStateInfo => {
    const ws = t.driver_workflow_state || 'ASSIGNED';
    switch (ws) {
      case 'ASSIGNED':
        return {
          badgeLabel: 'Assigned',
          badgeBg: '#DCFCE7',
          badgeTextColor: '#15803D',
          btnLabel: 'Start Trip',
          btnColor: '#16A34A',
          IconComponent: Play,
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
          badgeBg: '#DCFCE7',
          badgeTextColor: '#15803D',
          btnLabel: 'Go to Pickup',
          btnColor: '#16A34A',
          IconComponent: Navigation,
          onPress: () => router.push('/trip/navigate')
        };
      case 'ARRIVED_AT_PICKUP':
        return {
          badgeLabel: 'Arrived at Pickup',
          badgeBg: '#DCFCE7',
          badgeTextColor: '#15803D',
          btnLabel: 'Start Loading',
          btnColor: '#16A34A',
          IconComponent: Play,
          onPress: () => router.push('/trip/pickup')
        };
      case 'LOADING':
        return {
          badgeLabel: 'Loading In Progress',
          badgeBg: '#DCFCE7',
          badgeTextColor: '#15803D',
          btnLabel: 'Start Trip',
          btnColor: '#16A34A',
          IconComponent: Camera,
          onPress: () => router.push('/trip/pickup')
        };
      case 'IN_TRANSIT':
        return {
          badgeLabel: 'In Transit',
          badgeBg: '#FFEDD5',
          badgeTextColor: '#C2410C',
          btnLabel: 'Go to Delivery',
          btnColor: '#16A34A',
          IconComponent: MapPin,
          onPress: () => router.push('/trip/navigate')
        };
      case 'ARRIVED_AT_DELIVERY':
      case 'DELIVERY_VERIFICATION':
        return {
          badgeLabel: 'Arrived at Delivery',
          badgeBg: '#FFEDD5',
          badgeTextColor: '#C2410C',
          btnLabel: 'Unload & Verify',
          btnColor: '#E8450F',
          IconComponent: Camera,
          onPress: () => router.push('/trip/delivery')
        };
      case 'FIRST_DELIVERY_COMPLETED':
        return {
          badgeLabel: '1 / 2 Completed',
          badgeBg: '#E0F2FE',
          badgeTextColor: '#0369A1',
          btnLabel: 'Start Return Loading',
          btnColor: '#16A34A',
          IconComponent: Play,
          onPress: () => router.push('/trip/pickup')
        };
      case 'RETURN_LOADING':
        return {
          badgeLabel: 'Return Loading',
          badgeBg: '#DCFCE7',
          badgeTextColor: '#15803D',
          btnLabel: 'Start Return Trip',
          btnColor: '#16A34A',
          IconComponent: Camera,
          onPress: () => router.push('/trip/pickup')
        };
      case 'IN_TRANSIT_RETURN':
        return {
          badgeLabel: 'In Transit (Return)',
          badgeBg: '#FFEDD5',
          badgeTextColor: '#C2410C',
          btnLabel: 'Go to Final Delivery',
          btnColor: '#16A34A',
          IconComponent: MapPin,
          onPress: () => router.push('/trip/navigate')
        };
      case 'ARRIVED_AT_FINAL_DELIVERY':
      case 'FINAL_DELIVERY_VERIFICATION':
        return {
          badgeLabel: 'Arrived at Final Delivery',
          badgeBg: '#FFEDD5',
          badgeTextColor: '#C2410C',
          btnLabel: 'Final Unload & Verify',
          btnColor: '#E8450F',
          IconComponent: Camera,
          onPress: () => router.push('/trip/delivery')
        };
      case 'REVIEW_COMPLETE':
        return {
          badgeLabel: 'Review & Complete',
          badgeBg: '#FFEDD5',
          badgeTextColor: '#C2410C',
          btnLabel: 'Complete Trip',
          btnColor: '#E8450F',
          IconComponent: CheckCircle2,
          onPress: () => router.push('/trip/delivery')
        };
      default:
        return {
          badgeLabel: statusLabel(t.status),
          badgeBg: '#D1FAE5',
          badgeTextColor: '#059669',
          btnLabel: 'Start Trip',
          btnColor: '#10B981',
          IconComponent: Play,
          onPress: () => {
            if (t.status === 'Scheduled' || t.status === 'Draft') { router.push('/trip/navigate'); }
            else if (t.status === 'Loading' || t.status === 'AtPickup') { router.push('/trip/pickup'); }
            else { router.push('/trip/delivery'); }
          }
        };
    }
  };

  return (
    <ImageBackground source={homeBg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { refetch(); fetchScheduled(); }} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingTag}>{t('title_welcome_back', 'WELCOME BACK')}</Text>
            <View style={styles.nameRow}>
              <Text style={styles.driverName}>{firstName}</Text>
              <Hand size={18} color="#F5A623" strokeWidth={2.2} />
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openLanguageModal} activeOpacity={0.8} style={styles.langPill}>
              <Globe size={15} color="#E8450F" strokeWidth={2.2} />
              <Text style={styles.langPillText}>{langTag}</Text>
            </TouchableOpacity>

            <View style={styles.earningsPill}>
              <Banknote size={15} color="#16A34A" strokeWidth={2.2} />
              <Text style={styles.earningsText}>
                SAR {totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Current Trip Section ── */}
        {loading && !trip ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refetch}><Text style={styles.retryText}>Tap to retry</Text></TouchableOpacity>
          </View>
        ) : !trip ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('msg_no_active_trips', 'No active trip')}</Text>
            <Text style={styles.emptySub}>{t('msg_all_caught_up', "You're all caught up. Waiting for your next assignment.")}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{t('title_current_trip', 'Current Trip')}</Text>
            {(() => {
              const info = getWorkflowStateInfo(trip);
              const IconComp = info.IconComponent || Play;
              const accentColor = info.btnColor;

              return (
                <View style={styles.bigRoundJobCard}>
                  <View style={styles.jobCardContent}>
                    {/* Header Row */}
                    <View style={styles.jobHeader}>
                      <View style={styles.jobHeaderLeft}>
                        <Text style={styles.jobId} numberOfLines={1}>#{trip.ref_id ?? trip.id.slice(0, 8)}</Text>
                      </View>
                      <View style={[styles.stateCapsule, { backgroundColor: info.badgeBg }]}>
                        <Text style={[styles.stateCapsuleText, { color: info.badgeTextColor }]}>
                          {info.badgeLabel}
                        </Text>
                      </View>
                    </View>

                    {((pickupStop && (!pickupStop.location_lat || !pickupStop.location_lng)) || (dropoffStop && (!dropoffStop.location_lat || !dropoffStop.location_lng))) && (
                      <Text style={styles.noCoordsNote}>📍 Specific coordinates not entered for this location</Text>
                    )}

                    {/* Route timeline */}
                    <View style={styles.route}>
                      <View style={styles.routeRail}>
                        <View style={styles.dotPickup} />
                        <View style={styles.railLine} />
                        {trip.stops && trip.stops.length === 3 && (
                          <>
                            <View style={[styles.dotPickup, { backgroundColor: '#0284C7' }]} />
                            <View style={styles.railLine} />
                          </>
                        )}
                        <MapPin size={18} color="#EF4444" strokeWidth={2.4} fill="#EF4444" />
                      </View>
                      <View style={styles.routeCol}>
                        {(trip.stops || []).map((stop, sIdx) => {
                          const isLast = sIdx === (trip.stops || []).length - 1;
                          const stageLabel = sIdx === 0 ? 'PICKUP' : ((trip.stops || []).length === 3 && sIdx === 1) ? 'DELIVERY / RETURN PICKUP' : 'DELIVERY';
                          return (
                            <View key={stop.id} style={[styles.routeStop, isLast ? styles.routeStopLast : null]}>
                              <View style={styles.routeStopHead}>
                                <Text style={styles.routeStage}>{stageLabel}</Text>
                                <Text style={styles.routeWhen} numberOfLines={1}>
                                  {shortWhen(sIdx === 0 ? trip.planned_start : isLast ? trip.planned_end : null)}
                                </Text>
                              </View>
                              <Text style={styles.routePlace} numberOfLines={1}>
                                {stopLabel(stop) ?? 'Location not set'}
                              </Text>
                              {!!stopAddress(stop) && (
                                <Text style={styles.routeAddress} numberOfLines={2}>{stopAddress(stop)}</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.jobMeta}>
                      <View style={styles.metaCapsule}>
                        <Building2 size={13} color={Colors.gray400} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.metaLabel}>Customer</Text>
                          <Text style={styles.metaValue} numberOfLines={1}>{trip.customer?.name ?? '—'}</Text>
                        </View>
                      </View>
                      <View style={styles.metaCapsule}>
                        <MapPin size={13} color={Colors.gray400} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.metaLabel}>Distance</Text>
                          <Text style={styles.metaValue} numberOfLines={1}>{getExactDistance()}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Big & Round Action Row */}
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity
                        style={[styles.bigRoundStartBtn, { backgroundColor: accentColor }, advancing && { opacity: 0.6 }]}
                        activeOpacity={0.85}
                        onPress={info.onPress}
                        disabled={advancing}
                      >
                        <View style={styles.btnIconCircle}>
                          <IconComp size={16} color={accentColor} strokeWidth={2.5} />
                        </View>
                        <Text style={styles.bigRoundStartBtnText} numberOfLines={1}>
                          {advancing ? 'Updating…' : info.btnLabel}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.bigRoundDelayBtn}
                        activeOpacity={0.85}
                        onPress={() => setDelayModalVisible(true)}
                      >
                        <Clock size={18} color="#D97706" strokeWidth={2.2} />
                        <Text style={styles.bigRoundDelayBtnText}>Delay</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })()}
          </>
        )}

        {/* ── Scheduled Trips Section ── */}
        {scheduledTrips.length > 0 && (
          <>
            <View style={styles.scheduledHeader}>
              <Text style={styles.sectionLabel}>{t('title_scheduled_trips', 'Scheduled Trips')}</Text>
              <Text style={styles.scheduledCount}>{scheduledTrips.length} trips</Text>
            </View>
            {scheduledTrips.map((st) => {
              const pickup = st.stops?.find((s) => s.stop_type === 'Pickup');
              const dropoff = st.stops?.find((s) => s.stop_type === 'Dropoff');
              const fromName = stopLabel(pickup);
              const toName = stopLabel(dropoff);
              return (
                <TouchableOpacity key={st.id} style={styles.miniCard} activeOpacity={0.85}>
                  <View style={styles.miniCardTop}>
                    <Text style={styles.miniCardId}>#{st.ref_id ?? st.id.slice(0, 8)}</Text>
                    <Badge label="Scheduled" variant="neutral" />
                  </View>
                  {!!(fromName && toName) && (
                    <View style={styles.miniRoute}>
                      <MapPin size={13} color={Colors.primary} strokeWidth={2.2} />
                      <Text style={styles.miniRouteText} numberOfLines={1}>{fromName} → {toName}</Text>
                    </View>
                  )}
                  <View style={styles.miniCardBottom}>
                    <View style={styles.miniMeta}>
                      <Building2 size={13} color={Colors.gray500} strokeWidth={2} />
                      <Text style={styles.miniMetaText} numberOfLines={1}>{st.customer?.name ?? '—'}</Text>
                    </View>
                    <View style={styles.miniMeta}>
                      <Calendar size={13} color={Colors.gray500} strokeWidth={2} />
                      <Text style={styles.miniMetaText}>{shortWhen(st.planned_start, '—')}</Text>
                    </View>
                    {Boolean(st.trip_charges && Number(st.trip_charges) > 0) && (
                      <View style={styles.miniChargeBadge}>
                        <Text style={styles.miniChargeText}>SAR {formatCharge(st.trip_charges)}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {scheduledLoading && scheduledTrips.length === 0 && !loading && (
          <ActivityIndicator color={Colors.gray400} style={{ marginTop: Spacing.lg }} />
        )}
      </ScrollView>

      <DelayReportModal
        visible={delayModalVisible}
        tripId={trip?.id ?? null}
        onClose={() => setDelayModalVisible(false)}
        onSuccess={() => refetch()}
      />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: 2,
  },
  headerLeft: {
    justifyContent: 'center',
  },
  greetingTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gray400,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.gray900,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  langPill: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    ...Shadows.sm,
  },
  langPillText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: Colors.gray900,
  },
  earningsPill: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    borderRadius: 19,
    ...Shadows.sm,
  },
  earningsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },

  centerBox: { paddingVertical: Spacing['3xl'], alignItems: 'center', gap: Spacing.sm },
  errorText: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center' },
  retryText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },

  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.gray900, marginBottom: Spacing.xs },
  emptySub: { fontSize: Typography.sm, color: Colors.gray500, textAlign: 'center' },

  sectionLabel: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },

  jobCard: { marginBottom: Spacing.lg, padding: Spacing.lg },
  bigRoundJobCard: {
    marginBottom: Spacing.lg,
    backgroundColor: '#0B0F17',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    ...Shadows.md,
  },
  jobCardContent: {
    padding: Spacing.lg,
  },
  stateCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stateCapsuleText: {
    fontSize: Typography.xs,
    fontWeight: '800',
  },
  metaCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  bigRoundStartBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    ...Shadows.md,
  },
  btnIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bigRoundStartBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  bigRoundDelayBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
  bigRoundDelayBtnText: {
    fontSize: Typography.xs,
    fontWeight: '900',
    color: '#D97706',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  jobHeaderLeft: { flex: 1 },
  jobId: { fontSize: Typography.xl, fontWeight: '800', color: Colors.white },

  // Route timeline
  route: { flexDirection: 'row', gap: Spacing.md },
  routeRail: { alignItems: 'center', paddingTop: 4 },
  dotPickup: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 3, borderColor: Colors.success ?? '#22C55E', backgroundColor: 'transparent',
  },
  railLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: Colors.gray700, marginVertical: 4 },
  routeCol: { flex: 1 },
  routeStop: { marginBottom: Spacing.lg },
  routeStopLast: { marginBottom: 0 },
  routeStopHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  routeStage: { fontSize: Typography.xs, color: Colors.gray400, letterSpacing: 1, fontWeight: '700' },
  routeWhen: { fontSize: Typography.xs, fontWeight: '600', color: Colors.gray400, flexShrink: 1, textAlign: 'right' },
  routePlace: { fontSize: Typography.base, fontWeight: '700', color: Colors.white, marginTop: 2 },
  routeAddress: { fontSize: Typography.xs, color: Colors.gray400, marginTop: 2, lineHeight: 16 },

  divider: { height: 1, backgroundColor: Colors.gray700, marginVertical: Spacing.lg },

  jobMeta: { flexDirection: 'row', marginBottom: Spacing.lg },
  metaItem: { flex: 1, paddingRight: Spacing.sm },
  metaItemLast: { paddingRight: 0 },
  metaLabel: { fontSize: Typography.xs, color: Colors.gray400, marginBottom: 3 },
  metaValue: { fontSize: Typography.sm, color: Colors.white, fontWeight: '700' },
  startBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  startBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.base },
  doneNote: { color: Colors.gray400, fontSize: Typography.sm, textAlign: 'center' },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  delayReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  delayReportBtnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: '#92400E',
  },
  noCoordsNote: {
    fontSize: Typography.xs,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },

  // ── Scheduled Trips ──
  scheduledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  scheduledCount: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },

  miniCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    ...Shadows.sm,
  },
  miniCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  miniCardId: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: Colors.gray900,
  },
  miniRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.xs,
  },
  miniRouteText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray700,
    flex: 1,
  },
  miniCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  miniMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniMetaText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '500',
  },
  miniChargeBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  miniChargeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
});

export default HomeScreen;
