import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge, Badge, Avatar } from '../../components';

const TIMELINE_STEPS = [
  { id: 1, label: 'Trip Created', time: '5 Jul 2024 22:10', done: true, active: false },
  { id: 2, label: 'Driver Assigned', time: '5 Jul 2024 22:45', done: true, active: false },
  { id: 3, label: 'Pickup Verified', time: '6 Jul 2024 06:15', done: true, active: false },
  { id: 4, label: 'In Transit', time: '6 Jul 2024 06:30', done: true, active: true },
  { id: 5, label: 'Destination Reached', time: 'ETA 14:30', done: false, active: false },
  { id: 6, label: 'Delivery Confirmed', time: 'Pending', done: false, active: false },
];

const TripDetailsScreen = ({ navigation, route }: any) => {
  const tripId = route?.params?.tripId || 'TRP-2024-0891';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Dark Header Card */}
        <View style={styles.darkHeader}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerBody}>
            <View style={styles.headerTop}>
              <Text style={styles.tripId}>#{tripId}</Text>
              <StatusBadge status="in_transit" label="In Transit" />
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={styles.routeDotGreen} />
                <Text style={styles.routeCity}>Riyadh Industrial Zone</Text>
              </View>
              <View style={styles.routeArrow}>
                <View style={styles.dashedLine} />
                <Text style={styles.routeArrowIcon}>→</Text>
              </View>
              <View style={styles.routePoint}>
                <View style={styles.routeDotOrange} />
                <Text style={styles.routeCity}>Jeddah Port, Gate 7</Text>
              </View>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStat}>
                <Text style={styles.headerStatLabel}>Distance</Text>
                <Text style={styles.headerStatValue}>950 km</Text>
              </View>
              <View style={styles.headerStat}>
                <Text style={styles.headerStatLabel}>ETA</Text>
                <Text style={styles.headerStatValue}>14:30 AST</Text>
              </View>
              <View style={styles.headerStat}>
                <Text style={styles.headerStatLabel}>Progress</Text>
                <Text style={styles.headerStatValue}>51%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Timeline</Text>
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, i) => (
              <View key={step.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineCircle,
                    step.done ? styles.timelineCircleDone : null,
                    step.active ? styles.timelineCircleActive : null,
                  ]}>
                    {step.done && !step.active && <Text style={styles.timelineCheck}>✓</Text>}
                    {step.active && <View style={styles.timelinePulse} />}
                  </View>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, step.done ? styles.timelineLineDone : null]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, step.active ? styles.timelineLabelActive : null]}>
                    {step.label}
                  </Text>
                  <Text style={styles.timelineTime}>{step.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Cargo Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cargo Details</Text>
          <View style={styles.detailCard}>
            {[
              { label: 'Description', value: 'Consumer Electronics' },
              { label: 'Weight', value: '2,400 kg' },
              { label: 'Volume', value: '18 m³' },
              { label: 'Pallets', value: '12 pallets' },
              { label: 'Temperature', value: 'Ambient (15–25°C)' },
              { label: 'Hazmat', value: 'None' },
              { label: 'Customer', value: 'Saudi Electronics Co.' },
              { label: 'PO Number', value: 'PO-2024-78901' },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[styles.detailRow, i < arr.length - 1 ? styles.detailRowBorder : null]}
              >
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Assignment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignment</Text>
          <View style={styles.assignCard}>
            <View style={styles.assignRow}>
              <Avatar initials="AK" size={48} />
              <View style={styles.assignInfo}>
                <Text style={styles.assignName}>Ahmed Al-Rashidi</Text>
                <Text style={styles.assignRole}>Driver · DRV-2024-0112</Text>
                <View style={styles.assignRating}>
                  {/* TODO: replace icon placeholders with lucide-react-native */}
                  <Text style={styles.star}>★ 4.9</Text>
                  <Text style={styles.assignTrips}>243 trips</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callBtn} activeOpacity={0.8} onPress={() => {}}>
                <Text style={styles.callBtnText}>📞</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.assignDivider} />
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleIcon}>🚛</Text>
              <View>
                <Text style={styles.vehicleName}>TRK-2041 · Mercedes-Benz Actros</Text>
                <Text style={styles.vehiclePlate}>Plate: أ ب ج 1234</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8} onPress={() => {}}>
            <Text style={styles.secondaryBtnText}>📍 Track Live</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={() => {}}>
            <Text style={styles.primaryBtnText}>Edit Trip</Text>
          </TouchableOpacity>
        </View>
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
  headerBody: {
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripId: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routePoint: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  routeDotOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  routeCity: {
    fontSize: Typography.xs,
    color: Colors.gray300,
    textAlign: 'center',
  },
  routeArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.5,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray600,
  },
  routeArrowIcon: {
    color: Colors.gray400,
    fontSize: 16,
  },
  headerStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.gray800,
    paddingTop: Spacing.md,
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: 2,
  },
  headerStatValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  section: {
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  timeline: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  timelineCircleDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  timelineCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  timelineCheck: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '900',
  },
  timelinePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: Colors.gray200,
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: Colors.success,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  timelineLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.gray700,
  },
  timelineLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  detailLabel: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  detailValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  assignCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  assignInfo: {
    flex: 1,
  },
  assignName: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  assignRole: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: 3,
  },
  assignRating: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  star: {
    fontSize: Typography.xs,
    color: '#F59E0B',
    fontWeight: '700',
  },
  assignTrips: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    fontSize: 18,
  },
  assignDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginBottom: Spacing.md,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vehicleIcon: {
    fontSize: 28,
  },
  vehicleName: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  vehiclePlate: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '700',
  },
});

export default TripDetailsScreen;
