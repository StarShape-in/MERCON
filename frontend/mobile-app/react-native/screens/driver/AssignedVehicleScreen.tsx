import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, Badge } from '../../components';

const VEHICLE_DOCS = [
  { id: '1', label: 'Istimara (Registration)', status: 'valid', statusLabel: 'Valid', expiry: '12 Mar 2025' },
  { id: '2', label: 'Insurance Certificate', status: 'valid', statusLabel: 'Valid', expiry: '30 Jun 2025' },
  { id: '3', label: 'Annual Inspection', status: 'expiring', statusLabel: 'Due Soon', expiry: '25 Jul 2024' },
  { id: '4', label: 'Load Permit', status: 'valid', statusLabel: 'Valid', expiry: '31 Dec 2024' },
];

const SPECS = [
  { label: 'Make', value: 'Mercedes-Benz Actros' },
  { label: 'Year', value: '2022' },
  { label: 'Plate', value: 'أ ب ج 1234' },
  { label: 'VIN', value: 'WDB9634031L1234567' },
  { label: 'Engine', value: 'OM 471 — 510 HP' },
  { label: 'Capacity', value: '25,000 kg GVW' },
  { label: 'Fuel', value: 'Diesel' },
  { label: 'Mileage', value: '187,420 km' },
];

const AssignedVehicleScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Dark Header */}
        <View style={styles.darkHeader}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.vehicleIconBox}>
              <Text style={styles.vehicleEmoji}>🚛</Text>
            </View>
            <Text style={styles.vehicleId}>TRK-2041</Text>
            <Text style={styles.vehicleModel}>Mercedes-Benz Actros 2022</Text>
            <View style={styles.headerBadges}>
              <View style={styles.statusChip}>
                <View style={styles.statusDot} />
                <Text style={styles.statusChipText}>Active</Text>
              </View>
              <View style={styles.plateChip}>
                <Text style={styles.plateText}>أ ب ج 1234</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: '📏', label: 'Total KM', value: '187,420' },
            { icon: '🛣️', label: 'This Month', value: '12,450' },
            { icon: '⛽', label: 'Avg Fuel', value: '28 L/100' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Vehicle Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Specifications</Text>
          <View style={styles.specsGrid}>
            {SPECS.map((spec, i) => (
              <View
                key={spec.label}
                style={[styles.specRow, i < SPECS.length - 1 ? styles.specRowBorder : null]}
              >
                <Text style={styles.specLabel}>{spec.label}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Document Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document Status</Text>
          <View style={styles.docsCard}>
            {VEHICLE_DOCS.map((doc, i) => (
              <View
                key={doc.id}
                style={[styles.docRow, i < VEHICLE_DOCS.length - 1 ? styles.docRowBorder : null]}
              >
                <View style={styles.docLeft}>
                  {/* TODO: replace icon placeholders with lucide-react-native */}
                  <Text style={styles.docIcon}>📋</Text>
                  <View>
                    <Text style={styles.docLabel}>{doc.label}</Text>
                    <Text style={styles.docExpiry}>Exp: {doc.expiry}</Text>
                  </View>
                </View>
                <StatusBadge status={doc.status} label={doc.statusLabel} />
              </View>
            ))}
          </View>
        </View>

        {/* Maintenance */}
        <View style={styles.maintenanceCard}>
          <View style={styles.maintenanceHeader}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.maintenanceIcon}>🔧</Text>
            <Text style={styles.maintenanceTitle}>Next Scheduled Maintenance</Text>
          </View>
          <Text style={styles.maintenanceDate}>15 Jul 2024</Text>
          <Text style={styles.maintenanceSub}>200,000 km service — Al-Rashid Motors, Riyadh</Text>
          <View style={styles.maintenanceProgress}>
            <View style={styles.maintenanceProgressFill} />
          </View>
          <Text style={styles.maintenanceLeft}>12,580 km remaining</Text>
        </View>

        <TouchableOpacity style={styles.reportBtn} activeOpacity={0.8} onPress={() => {}}>
          <Text style={styles.reportBtnIcon}>🚨</Text>
          <Text style={styles.reportBtnText}>Report Vehicle Issue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: Spacing['3xl'],
  },
  darkHeader: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.white,
  },
  headerContent: {
    alignItems: 'center',
  },
  vehicleIconBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  vehicleEmoji: {
    fontSize: 36,
  },
  vehicleId: {
    fontSize: Typography['2xl'],
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
  },
  vehicleModel: {
    fontSize: Typography.sm,
    color: Colors.gray400,
    marginBottom: Spacing.md,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  statusChipText: {
    fontSize: Typography.xs,
    color: Colors.success,
    fontWeight: '700',
  },
  plateChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  plateText: {
    fontSize: Typography.xs,
    color: Colors.white,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 3,
    ...Shadows.sm,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: Typography.sm,
    fontWeight: '800',
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  specsGrid: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  specRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  specLabel: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  specValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  docsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  docRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  docIcon: {
    fontSize: 18,
  },
  docLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.gray900,
  },
  docExpiry: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 1,
  },
  maintenanceCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  maintenanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  maintenanceIcon: {
    fontSize: 20,
  },
  maintenanceTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  maintenanceDate: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  maintenanceSub: {
    fontSize: Typography.xs,
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  maintenanceProgress: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: Radius.full,
    marginBottom: Spacing.xs,
  },
  maintenanceProgressFill: {
    width: '94%',
    height: '100%',
    backgroundColor: '#D97706',
    borderRadius: Radius.full,
  },
  maintenanceLeft: {
    fontSize: Typography.xs,
    color: '#92400E',
    fontWeight: '600',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  reportBtnIcon: {
    fontSize: 20,
  },
  reportBtnText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.error,
  },
});

export default AssignedVehicleScreen;
