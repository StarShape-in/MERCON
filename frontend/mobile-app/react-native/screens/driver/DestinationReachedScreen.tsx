import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button } from '../../components';

const { width, height } = Dimensions.get('window');

const DestinationReachedScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B1A" />

      {/* Map Placeholder with Overlay */}
      <View style={styles.mapBg}>
        <View style={styles.map}>
          <View style={styles.roadV} />
          <View style={styles.roadH} />
          <Text style={styles.destinationFlag}>🏁</Text>
          <Text style={styles.mapLabel}>JEDDAH PORT</Text>
          <Text style={styles.mapCoords}>21.4858° N, 39.1925° E</Text>
        </View>
        <View style={styles.darkOverlay} />
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Arrived Icon */}
        <View style={styles.arrivedIconWrap}>
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.arrivedEmoji}>📍</Text>
        </View>

        <Text style={styles.arrivedTitle}>You Have Arrived!</Text>
        <Text style={styles.arrivedSub}>
          You have reached your destination at Jeddah Port, Gate 7.
          Please proceed with delivery verification.
        </Text>

        {/* Trip Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🕒</Text>
            <Text style={styles.summaryValue}>8h 45m</Text>
            <Text style={styles.summaryLabel}>Travel Time</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>📏</Text>
            <Text style={styles.summaryValue}>950 km</Text>
            <Text style={styles.summaryLabel}>Distance</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>⛽</Text>
            <Text style={styles.summaryValue}>142 L</Text>
            <Text style={styles.summaryLabel}>Fuel Used</Text>
          </View>
        </View>

        {/* Location Confirmation */}
        <View style={styles.locationRow}>
          <View style={styles.locationDot} />
          <Text style={styles.locationText}>Jeddah Port, Industrial Area, Gate 7</Text>
        </View>

        <TouchableOpacity
          style={styles.endTripBtn}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate('DeliveryVerification')}
        >
          <Text style={styles.endTripText}>End Trip & Verify Delivery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.cancelText}>Not Yet — Continue Navigation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2B1A',
  },
  mapBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    flex: 1,
    backgroundColor: '#2D4A2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadV: {
    position: 'absolute',
    width: 12,
    top: 0,
    bottom: 0,
    backgroundColor: '#4A6A4A',
    left: '45%',
  },
  roadH: {
    position: 'absolute',
    height: 10,
    left: 0,
    right: 0,
    backgroundColor: '#4A6A4A',
    top: '40%',
  },
  destinationFlag: {
    fontSize: 40,
  },
  mapLabel: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginTop: Spacing.md,
  },
  mapCoords: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
    ...Shadows.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  arrivedIconWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  arrivedEmoji: {
    fontSize: 48,
  },
  arrivedTitle: {
    fontSize: Typography['2xl'],
    fontWeight: '800',
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  arrivedSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryIcon: {
    fontSize: 20,
  },
  summaryValue: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  summaryLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  locationText: {
    fontSize: Typography.sm,
    color: Colors.gray700,
    fontWeight: '600',
  },
  endTripBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  endTripText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.white,
  },
  cancelBtn: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    fontWeight: '600',
  },
});

export default DestinationReachedScreen;
