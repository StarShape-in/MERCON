import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  FileText, Truck, Settings, IdCard, CalendarClock, Phone, CalendarDays,
  Bell, Globe, ShieldCheck, Info, LifeBuoy, LogOut, ChevronRight, Camera,
  CheckCircle2, User, Award, MapPin, Check,
  type LucideIcon,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Avatar, Badge } from '../../components';
import { useAuth } from '../../lib/auth-context';
import { useProfile } from '../../lib/use-profile';
import { initialsOf } from '../../lib/profile';
import { useCargoPodPhotos, docTypeLabel } from '../../lib/documents';
import { API_URL } from '../../lib/api';
import { useLanguage } from '../../lib/language-context';

const FILE_BASE = API_URL.replace(/\/api\/?$/, '');

function openFile(fileUrl: string) {
  const url = fileUrl.startsWith('http') ? fileUrl : `${FILE_BASE}${fileUrl}`;
  Linking.openURL(url).catch(() => {});
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const ProfileScreen = () => {
  const router = useRouter();
  const { profile: authProfile, signOut } = useAuth();
  const { profile, loading, error, refetch: refetchProfile } = useProfile();
  const { photos: uploadedPhotos, loading: docsLoading, refetch: refetchPhotos } = useCargoPodPhotos();
  const { language, openLanguageModal, t } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchPhotos();
    }, [refetchProfile, refetchPhotos])
  );

  const name = profile?.name ?? authProfile?.name ?? 'Driver';
  const refId = profile?.ref_id ?? authProfile?.ref_id ?? '—';
  const status = profile?.status ?? authProfile?.status ?? 'Available';

  const getLanguageLabel = () => {
    if (language === 'en') return 'English';
    if (language === 'ur') return 'Urdu';
    return 'Urdu / English';
  };

  const SETTING_ROWS: { Icon: LucideIcon; labelKey: string; defaultLabel: string; value?: string; arrow?: boolean; route?: string; onPress?: () => void }[] = [
    { Icon: Camera,      labelKey: 'nav_cargo_pod_photos', defaultLabel: 'Cargo & POD Photos', route: '/cargo-pod-photos', arrow: true },
    { Icon: Bell,        labelKey: 'nav_notifications', defaultLabel: 'Notifications', route: '/notifications', arrow: true },
    { Icon: Globe,       labelKey: 'title_language', defaultLabel: 'Language', value: getLanguageLabel(), arrow: true, onPress: openLanguageModal },
    { Icon: ShieldCheck, labelKey: 'setting_privacy_policy', defaultLabel: 'Privacy Policy', arrow: true, route: '/settings' },
    { Icon: Info,        labelKey: 'title_about_app', defaultLabel: 'About MERCON', arrow: true, route: '/settings' },
    { Icon: LifeBuoy,    labelKey: 'title_help_support', defaultLabel: 'Help & Support', arrow: true, route: '/settings' },
  ];

  const details: { Icon: LucideIcon; labelKey: string; defaultLabel: string; value: string }[] = profile
    ? [
        { Icon: IdCard, labelKey: 'label_license_number', defaultLabel: 'License No.', value: profile.license_number || '—' },
        { Icon: CalendarClock, labelKey: 'label_license_expiry', defaultLabel: 'License Expiry', value: formatDate(profile.license_expiry) },
        { Icon: Phone, labelKey: 'label_phone', defaultLabel: 'Phone', value: profile.phone_primary ? profile.phone_primary : '—' },
        {
          Icon: Truck,
          labelKey: 'nav_vehicle',
          defaultLabel: 'Assigned Vehicle',
          value: profile.current_vehicle?.plate_number ?? 'None (unassigned)',
        },
        { Icon: CalendarDays, labelKey: 'label_member_since', defaultLabel: 'Member Since', value: formatDate(profile.createdAt) },
      ]
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Driver Identity Hero Card (Solid Charcoal Dark) ── */}
        <View style={styles.darkHeroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrapper}>
              <Avatar initials={initialsOf(name)} size={72} />
              <View style={styles.statusDotRing}>
                <View style={styles.statusDot} />
              </View>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              
              <View style={styles.verifiedRow}>
                <ShieldCheck size={14} color="#16A34A" strokeWidth={2.5} />
                <Text style={styles.verifiedText}>Verified Commercial Driver</Text>
              </View>

              <View style={styles.heroTagsRow}>
                <View style={styles.refBadge}>
                  <Text style={styles.driverId}>#{refId}</Text>
                </View>
                {!!status && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{status}</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.langPillDark} onPress={openLanguageModal} activeOpacity={0.85}>
              <Globe size={14} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.langTextDark}>{language === 'ur' ? 'UR' : 'EN'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Instrument Metrics Grid (4 Stat Cards) ── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Truck size={18} color="#16A34A" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricValue}>142</Text>
            <Text style={styles.metricLabel}>Trips Done</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Award size={18} color="#D97706" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricValue}>98.4%</Text>
            <Text style={styles.metricLabel}>On-Time Rate</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#DBEAFE' }]}>
              <MapPin size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricValue}>14.2k</Text>
            <Text style={styles.metricLabel}>Total Distance</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconCircle, { backgroundColor: '#E0E7FF' }]}>
              <ShieldCheck size={18} color="#4F46E5" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricValue}>5.0</Text>
            <Text style={styles.metricLabel}>Safety Score</Text>
          </View>
        </View>

        {/* ── Active Vehicle & License Card ── */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.titleIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Truck size={16} color="#16A34A" strokeWidth={2.2} />
              </View>
              <Text style={styles.sectionTitle}>Assigned Vehicle & License</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/vehicle' as any)}
            >
              <Text style={styles.viewAllText}>Vehicle Details →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.vehiclePillRow}>
            <View style={styles.vehicleInfoCol}>
              <Text style={styles.vehiclePlate}>
                {profile?.current_vehicle?.plate_number ?? 'No Truck Assigned'}
              </Text>
              <Text style={styles.vehicleSub}>
                {profile?.current_vehicle ? 'Heavy Commercial Transport' : 'Contact fleet manager to assign vehicle'}
              </Text>
            </View>
            <View style={styles.vehicleBadgeActive}>
              <Check size={12} color="#16A34A" strokeWidth={3} />
              <Text style={styles.vehicleBadgeActiveText}>Active</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions Grid ── */}
        <View style={styles.quickActions}>
          {[
            { Icon: FileText, labelKey: 'nav_documents', defaultLabel: 'Documents', route: '/documents', color: '#2563EB', bg: '#EFF6FF' },
            { Icon: Truck, labelKey: 'nav_vehicle', defaultLabel: 'Vehicle', route: '/vehicle', color: '#16A34A', bg: '#DCFCE7' },
            { Icon: Camera, labelKey: 'nav_cargo_pod_photos', defaultLabel: 'Photos', route: '/cargo-pod-photos', color: '#9333EA', bg: '#F3E8FF' },
            { Icon: Settings, labelKey: 'nav_settings', defaultLabel: 'Settings', route: '/settings', color: '#4B5563', bg: '#F3F4F6' },
          ].map((action) => (
            <TouchableOpacity
              key={action.labelKey}
              style={styles.quickCard}
              activeOpacity={0.85}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.quickIconBox, { backgroundColor: action.bg }]}>
                <action.Icon size={20} color={action.color} strokeWidth={2.2} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={1}>{t(action.labelKey, action.defaultLabel)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Uploaded Photos Gallery ── */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={styles.titleIconBox}>
                <Camera size={16} color={Colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.sectionTitle}>
                {t('title_uploaded_photos', 'My Uploaded Photos')} ({uploadedPhotos.length})
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/cargo-pod-photos' as any)}>
              <Text style={styles.viewAllText}>{t('action_view_all', 'View All')} →</Text>
            </TouchableOpacity>
          </View>

          {docsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
          ) : uploadedPhotos.length === 0 ? (
            <View style={styles.emptyPhotosContainer}>
              <Camera size={28} color={Colors.gray400} strokeWidth={1.8} />
              <Text style={styles.emptyPhotosText}>
                {t('msg_no_photos', 'No cargo or POD photos uploaded yet.')}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
              {uploadedPhotos.map((doc) => {
                const fullUrl = doc.file_url.startsWith('http') ? doc.file_url : `${FILE_BASE}${doc.file_url}`;
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.photoCard}
                    activeOpacity={0.85}
                    onPress={() => openFile(doc.file_url)}
                  >
                    <Image source={{ uri: fullUrl }} style={styles.photoImg} resizeMode="cover" />
                    <View style={styles.photoMeta}>
                      <Text style={styles.photoTitle} numberOfLines={1}>
                        {docTypeLabel(doc.doc_type)}
                      </Text>
                      <Text style={styles.photoSub} numberOfLines={1}>
                        {doc.trip_ref_id ? `Trip #${doc.trip_ref_id}` : formatDate(doc.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Driver Details Card ── */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.titleIconBox, { backgroundColor: '#DCFCE7' }]}>
                <User size={16} color="#16A34A" strokeWidth={2.2} />
              </View>
              <Text style={styles.sectionTitle}>{t('title_driver_details', 'Driver Details')}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
          ) : error ? (
            <Text style={{ color: Colors.error, fontSize: Typography.sm, padding: Spacing.sm }}>{error}</Text>
          ) : (
            details.map((row, i) => (
              <View
                key={row.labelKey}
                style={[styles.infoRow, i < details.length - 1 ? styles.rowBorder : null]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.rowIconCircle}>
                    <row.Icon size={16} color={Colors.gray600} strokeWidth={2} />
                  </View>
                  <Text style={styles.rowLabel}>{t(row.labelKey, row.defaultLabel)}</Text>
                </View>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── App Settings Ledger ── */}
        <View style={styles.sectionCard}>
          {SETTING_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.labelKey}
              style={[styles.infoRow, i < SETTING_ROWS.length - 1 ? styles.rowBorder : null]}
              activeOpacity={0.8}
              onPress={() => (row.onPress ? row.onPress() : row.route && router.push(row.route as any))}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconCircle}>
                  <row.Icon size={16} color={Colors.gray600} strokeWidth={2} />
                </View>
                <Text style={styles.rowLabel}>{t(row.labelKey, row.defaultLabel)}</Text>
              </View>
              <View style={styles.rowRight}>
                {row.value && <Text style={styles.rowValueText}>{row.value}</Text>}
                {row.arrow && <ChevronRight size={18} color={Colors.gray400} strokeWidth={2} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 100% Full Round Pill Logout Button ── */}
        <TouchableOpacity style={styles.bigRoundLogoutBtn} activeOpacity={0.85} onPress={() => signOut()}>
          <LogOut size={18} color={Colors.error} strokeWidth={2.2} />
          <Text style={styles.bigRoundLogoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MERCON Driver App • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 90,
    gap: Spacing.md + 2,
  },
  darkHeroCard: {
    backgroundColor: '#0B0F17',
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  statusDotRing: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0B0F17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
  },
  heroInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.white,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86EFAC',
  },
  heroTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  refBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  driverId: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.gray300,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  statusBadgeText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: '#15803D',
  },
  langPillDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  langTextDark: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: Colors.white,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Shadows.sm,
  },
  metricIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.gray900,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.gray500,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  titleIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight ?? '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
  },
  viewAllText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  vehiclePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  vehicleInfoCol: {
    flex: 1,
    gap: 2,
  },
  vehiclePlate: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.gray900,
  },
  vehicleSub: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '500',
  },
  vehicleBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  vehicleBadgeActiveText: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: '#15803D',
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Shadows.sm,
  },
  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    color: Colors.gray800,
    fontWeight: '700',
  },
  emptyPhotosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  emptyPhotosText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    textAlign: 'center',
  },
  photosScroll: {
    gap: Spacing.md,
  },
  photoCard: {
    width: 124,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  photoImg: {
    width: '100%',
    height: 84,
    backgroundColor: Colors.gray200,
  },
  photoMeta: {
    padding: Spacing.xs,
  },
  photoTitle: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.gray900,
  },
  photoSub: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  rowIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: Typography.sm,
    color: Colors.gray800,
    fontWeight: '600',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: Typography.sm,
    color: Colors.gray900,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  rowValueText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },
  bigRoundLogoutBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    ...Shadows.sm,
  },
  bigRoundLogoutText: {
    fontSize: Typography.base,
    fontWeight: '900',
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.gray400,
    fontWeight: '600',
    marginTop: -Spacing.xs,
  },
});

export default ProfileScreen;
