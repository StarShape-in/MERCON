import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, FlatList, Image,
  Dimensions, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell, ScanFace, MapPin, Volume2, Moon, Globe, SignalHigh, Info, ShieldCheck,
  ScrollText, LifeBuoy, Bug, Truck, KeyRound, Trash2, LogOut, ArrowLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { DriverBottomNav } from '../../navigation/DriverBottomNav';
import { useAuth } from '../../lib/auth-context';
import { useLanguage } from '../../lib/language-context';

const SettingsScreen = ({ navigation }: any) => {
  const router = useRouter();
  const { signOut } = useAuth();
  const { language, openLanguageModal, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('Profile');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);

  const getLanguageLabel = () => {
    if (language === 'en') return 'English';
    if (language === 'ur') return 'اردو (Urdu)';
    return 'اردو / English';
  };

  const TOGGLE_ROWS: { Icon: LucideIcon; labelKey: string; defaultLabel: string; descKey: string; defaultDesc: string; value: boolean; onChange: (v: boolean) => void }[] = [
    {
      Icon: Bell,
      labelKey: 'setting_push_notifications',
      defaultLabel: 'Push Notifications',
      descKey: 'setting_push_desc',
      defaultDesc: 'Trip updates, reminders and alerts',
      value: pushNotifications,
      onChange: setPushNotifications,
    },
    {
      Icon: ScanFace,
      labelKey: 'setting_biometric',
      defaultLabel: 'Biometric Login',
      descKey: 'setting_biometric_desc',
      defaultDesc: 'Use fingerprint or face to sign in',
      value: biometric,
      onChange: setBiometric,
    },
    {
      Icon: MapPin,
      labelKey: 'setting_location_sharing',
      defaultLabel: 'Location Sharing',
      descKey: 'setting_location_desc',
      defaultDesc: 'Share location during active trips',
      value: locationSharing,
      onChange: setLocationSharing,
    },
    {
      Icon: Volume2,
      labelKey: 'setting_sound_alerts',
      defaultLabel: 'Sound Alerts',
      descKey: 'setting_sound_desc',
      defaultDesc: 'Play audio for navigation & alerts',
      value: soundAlerts,
      onChange: setSoundAlerts,
    },
    {
      Icon: Moon,
      labelKey: 'setting_dark_mode',
      defaultLabel: 'Dark Mode',
      descKey: 'setting_dark_desc',
      defaultDesc: 'Switch to dark theme',
      value: darkMode,
      onChange: setDarkMode,
    },
  ];

  const CHEVRON_ROWS: { Icon: LucideIcon; labelKey: string; defaultLabel: string; value?: string; onPress?: () => void }[] = [
    {
      Icon: Globe,
      labelKey: 'title_language',
      defaultLabel: 'Language',
      value: getLanguageLabel(),
      onPress: openLanguageModal,
    },
    {
      Icon: SignalHigh,
      labelKey: 'setting_data_usage',
      defaultLabel: 'Data Usage',
      value: 'Standard',
      onPress: () => Alert.alert('Coming Soon', 'Data usage settings will be available soon.'),
    },
    {
      Icon: Info,
      labelKey: 'title_about_app',
      defaultLabel: 'About MERCON',
      onPress: () => Alert.alert('About MERCON', 'MERCON Logistics Platform v2.1.0'),
    },
    {
      Icon: ShieldCheck,
      labelKey: 'setting_privacy_policy',
      defaultLabel: 'Privacy Policy',
      onPress: () => Alert.alert('Privacy Policy', 'MERCON values your privacy and data security.'),
    },
    {
      Icon: ScrollText,
      labelKey: 'setting_terms',
      defaultLabel: 'Terms of Service',
      onPress: () => Alert.alert('Terms of Service', 'Standard Mercon Terms & Conditions apply.'),
    },
    {
      Icon: LifeBuoy,
      labelKey: 'title_help_support',
      defaultLabel: 'Help & Support',
      onPress: () => Alert.alert('Help & Support', 'Contact support@mercon.sa for 24/7 assistance.'),
    },
    {
      Icon: Bug,
      labelKey: 'setting_report_bug',
      defaultLabel: 'Report a Bug',
      onPress: () => Alert.alert('Report a Bug', 'Please describe the bug to support@mercon.sa.'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.gray900} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('title_app_settings', 'Settings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* App Version Card */}
        <View style={styles.versionCard}>
          <View style={styles.versionLogoBox}>
            <Truck size={24} color={Colors.white} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.versionAppName}>MERCON Driver</Text>
            <Text style={styles.versionNum}>
              {t('label_version', 'Version')} <Text style={{ writingDirection: 'ltr' }}>2.1.0 (Build 210)</Text>
            </Text>
          </View>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>{t('status_up_to_date', 'Up to date')}</Text>
          </View>
        </View>

        {/* Preferences (Toggle Rows) */}
        <Text style={styles.groupLabel}>{t('title_preferences', 'Preferences')}</Text>
        <View style={styles.groupCard}>
          {TOGGLE_ROWS.map((row, i) => (
            <View
              key={row.labelKey}
              style={[styles.row, i < TOGGLE_ROWS.length - 1 ? styles.rowBorder : null]}
            >
              <View style={styles.rowIconBox}>
                <row.Icon size={18} color={Colors.gray600} strokeWidth={2} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{t(row.labelKey, row.defaultLabel)}</Text>
                <Text style={styles.rowDesc}>{t(row.descKey, row.defaultDesc)}</Text>
              </View>
              <Switch
                value={row.value}
                onValueChange={row.onChange}
                trackColor={{ false: Colors.gray300, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>

        {/* App & Legal (Chevron Rows) */}
        <Text style={styles.groupLabel}>{t('title_app_legal', 'App & Legal')}</Text>
        <View style={styles.groupCard}>
          {CHEVRON_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.labelKey}
              style={[styles.row, i < CHEVRON_ROWS.length - 1 ? styles.rowBorder : null]}
              activeOpacity={0.8}
              onPress={row.onPress}
            >
              <View style={styles.rowIconBox}>
                <row.Icon size={18} color={Colors.gray600} strokeWidth={2} />
              </View>
              <Text style={styles.rowLabelSingle}>{t(row.labelKey, row.defaultLabel)}</Text>
              <View style={styles.rowRight}>
                {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                <ChevronRight size={18} color={Colors.gray400} strokeWidth={2} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account */}
        <Text style={styles.groupLabel}>{t('title_account', 'Account')}</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Coming Soon', 'Password changes can be done through your operator.')}
          >
            <View style={styles.rowIconBox}>
              <KeyRound size={18} color={Colors.gray600} strokeWidth={2} />
            </View>
            <Text style={styles.rowLabelSingle}>{t('setting_change_password', 'Change Password')}</Text>
            <ChevronRight size={18} color={Colors.gray400} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Contact Support', 'To delete your account, contact your fleet operator.')}
          >
            <View style={styles.rowIconBox}>
              <Trash2 size={18} color={Colors.error} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabelSingle, styles.dangerText]}>{t('setting_delete_account', 'Delete Account')}</Text>
            <ChevronRight size={18} color={Colors.gray400} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        >
          <LogOut size={20} color={Colors.error} strokeWidth={2.2} />
          <Text style={styles.logoutText}>{t('action_logout', 'Logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          MERCON Logistics Platform · Saudi Arabia{'\n'}
          support@mercon.sa · +966 11 234 5678
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 90,
    gap: Spacing.xs,
  },
  versionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  versionLogoBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionAppName: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  versionNum: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  versionBadge: {
    marginLeft: 'auto',
    backgroundColor: '#DCFCE7',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  versionBadgeText: {
    fontSize: Typography.xs,
    color: Colors.success,
    fontWeight: '700',
  },
  groupLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  groupCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.gray900,
  },
  rowDesc: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 1,
  },
  rowLabelSingle: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.gray900,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  dangerText: {
    color: Colors.error,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginTop: Spacing.md,
  },
  logoutText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.error,
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.gray400,
    lineHeight: 18,
    marginTop: Spacing.md,
  },
});

export default SettingsScreen;
