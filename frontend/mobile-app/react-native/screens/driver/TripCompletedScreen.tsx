import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Badge } from '../../components';

const TripCompletedScreen = ({ navigation }: any) => {
  const summaryItems = [
    { label: 'Trip ID', value: '#TRP-2024-0891' },
    { label: 'Route', value: 'Riyadh → Jeddah' },
    { label: 'Distance', value: '950 km' },
    { label: 'Duration', value: '8h 45m' },
    { label: 'Cargo', value: 'Electronics (2.4T)' },
    { label: 'Delivery Time', value: '14:28 AST (On Time)' },
    { label: 'Customer', value: 'Saudi Electronics Co.' },
    { label: 'Earnings', value: 'SAR 420.00' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.gray100} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success Header */}
        <View style={styles.successSection}>
          <View style={styles.checkCircle}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Badge label="On Time" variant="success" style={styles.onTimeBadge} />
          <Text style={styles.heading}>Trip Completed!</Text>
          <Text style={styles.subheading}>
            Excellent work! The delivery has been confirmed and your trip is now complete.
          </Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Rate Your Experience</Text>
          <Text style={styles.ratingSubtitle}>How was this trip?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} activeOpacity={0.8} onPress={() => {}}>
                {/* TODO: replace icon placeholders with lucide-react-native */}
                <Text style={styles.star}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trip Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Trip Summary</Text>
          {summaryItems.map((item, i) => (
            <View
              key={item.label}
              style={[styles.summaryRow, i < summaryItems.length - 1 ? styles.summaryRowBorder : null]}
            >
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={[styles.summaryValue, item.label === 'Earnings' ? styles.earningsValue : null]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Performance */}
        <View style={styles.performanceRow}>
          {[
            { icon: '⭐', value: '4.9', label: 'Rating' },
            { icon: '⏰', value: '96%', label: 'On-Time' },
            { icon: '📦', value: '100%', label: 'Cargo OK' },
          ].map((item) => (
            <View key={item.label} style={styles.perfCard}>
              <Text style={styles.perfIcon}>{item.icon}</Text>
              <Text style={styles.perfValue}>{item.value}</Text>
              <Text style={styles.perfLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Button
          title="Return to Home"
          onPress={() => navigation?.navigate('Home')}
        />

        <TouchableOpacity
          style={styles.viewTripsBtn}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate('Trips')}
        >
          <Text style={styles.viewTripsBtnText}>View All Trips</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.lg,
  },
  checkIcon: {
    fontSize: 40,
    color: Colors.white,
    fontWeight: '900',
  },
  onTimeBadge: {
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  ratingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  ratingTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 2,
  },
  ratingSubtitle: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  star: {
    fontSize: 36,
    color: '#F59E0B',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  summaryTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  summaryLabel: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  summaryValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  earningsValue: {
    color: Colors.success,
    fontSize: Typography.base,
  },
  performanceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  perfCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadows.sm,
  },
  perfIcon: {
    fontSize: 24,
  },
  perfValue: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.gray900,
  },
  perfLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  viewTripsBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  viewTripsBtnText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default TripCompletedScreen;
