import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Truck, MapPin, ArrowLeft, CornerUpRight, Volume2, VolumeX, Siren } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';

const { width, height } = Dimensions.get('window');

const LiveNavigationScreen = ({ navigation }: any) => {
  const [muted, setMuted] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B1A" />

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.map}>
          {/* Simulated road overlay */}
          <View style={styles.roadVertical} />
          <View style={styles.roadHorizontal} />
          <View style={styles.currentLocation}>
            <Truck size={24} color={Colors.white} strokeWidth={2} />
          </View>
          <View style={styles.destinationPin}>
            <MapPin size={22} color={Colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.mapLabel}>LIVE MAP</Text>
          <Text style={styles.mapSubLabel}>Riyadh → Jeddah</Text>
        </View>

        {/* Top overlay */}
        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.backCircle} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
            <ArrowLeft size={22} color={Colors.white} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.nextTurnCard}>
            <CornerUpRight size={22} color={Colors.primary} strokeWidth={2.4} />
            <View>
              <Text style={styles.nextTurnLabel}>In 2.3 km</Text>
              <Text style={styles.nextTurnValue}>Turn right onto King Fahd Road</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.muteBtn} activeOpacity={0.8} onPress={() => setMuted(!muted)}>
            {muted
              ? <VolumeX size={22} color={Colors.white} strokeWidth={2} />
              : <Volume2 size={22} color={Colors.white} strokeWidth={2} />}
          </TouchableOpacity>
        </View>

        {/* Info Pills */}
        <View style={styles.pillsRow}>
          {[
            { label: 'Speed', value: '94 km/h' },
            { label: 'ETA', value: '14:30 AST' },
            { label: 'Distance', value: '487 km' },
          ].map((pill) => (
            <View key={pill.label} style={styles.pill}>
              <Text style={styles.pillLabel}>{pill.label}</Text>
              <Text style={styles.pillValue}>{pill.value}</Text>
            </View>
          ))}
        </View>

        {/* Emergency Button */}
        <TouchableOpacity
          style={styles.emergencyBtn}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate('Emergency')}
        >
          <Siren size={26} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Bottom Info Card */}
      <View style={styles.bottomCard}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.routeLabel}>Riyadh Industrial Zone → Jeddah Port</Text>
            <Text style={styles.tripId}>#TRP-2024-0891 · Electronics (2.4T)</Text>
          </View>
          <TouchableOpacity
            style={styles.arrivedBtn}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate('DestinationReached')}
          >
            <Text style={styles.arrivedBtnText}>Arrived</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>Riyadh</Text>
          <Text style={styles.progressPct}>51% complete</Text>
          <Text style={styles.progressText}>Jeddah</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2B1A',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    backgroundColor: '#2D4A2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadVertical: {
    position: 'absolute',
    width: 12,
    top: 0,
    bottom: 0,
    backgroundColor: '#4A6A4A',
    left: '45%',
  },
  roadHorizontal: {
    position: 'absolute',
    height: 10,
    left: 0,
    right: 0,
    backgroundColor: '#4A6A4A',
    top: '40%',
  },
  currentLocation: {
    position: 'absolute',
    left: '42%',
    top: '55%',
  },
  locationPin: {
    fontSize: 28,
  },
  destinationPin: {
    position: 'absolute',
    left: '42%',
    top: '15%',
  },
  destPinIcon: {
    fontSize: 28,
  },
  mapLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginTop: 80,
  },
  mapSubLabel: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  topOverlay: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: Colors.gray900,
    fontWeight: '700',
  },
  nextTurnCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  nextTurnIcon: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '900',
  },
  nextTurnLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  nextTurnValue: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.gray900,
  },
  muteBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteIcon: {
    fontSize: 18,
  },
  pillsRow: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  pillValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  emergencyBtn: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: 110,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  emergencyIcon: {
    fontSize: 24,
  },
  bottomCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  routeLabel: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
    maxWidth: width * 0.6,
  },
  tripId: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  arrivedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  arrivedBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: Radius.full,
    marginBottom: Spacing.xs,
  },
  progressFill: {
    width: '51%',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  progressPct: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default LiveNavigationScreen;
