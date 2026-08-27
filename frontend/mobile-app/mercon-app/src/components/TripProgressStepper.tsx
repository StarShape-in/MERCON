import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Rect, Circle, Line, G, Text as SvgText, Polygon } from 'react-native-svg';
import { Check, Truck } from 'lucide-react-native';
import { Colors } from '../theme/tokens';

export interface TripStepperStep {
  id: number;
  label: string;
}

export interface TripProgressStepperProps {
  currentStep: number;
  steps?: TripStepperStep[];
  onStepPress?: (stepId: number) => void;
  showIllustrations?: boolean;
}

const DEFAULT_STEPS: TripStepperStep[] = [
  { id: 1, label: 'Go to Pickup' },
  { id: 2, label: 'Loading' },
  { id: 3, label: 'In Transit' },
  { id: 4, label: 'Delivery' },
];

// Top 3D Pickup Warehouse Illustration
const PickupWarehouseGraphic = () => (
  <Svg width={46} height={38} viewBox="0 0 46 38">
    {/* Roof Map Pin */}
    <G transform="translate(16, 0)">
      <Path d="M7 0C3.13 0 0 3.13 0 7C0 11.5 7 16 7 16C7 16 14 11.5 14 7C14 3.13 10.87 0 7 0Z" fill="#E8450F" />
      <Circle cx={7} cy={7} r={2.5} fill="#FFFFFF" />
    </G>
    {/* Base Platform */}
    <Rect x={2} y={30} width={42} height={4} rx={2} fill="#E2E8F0" />
    <Rect x={4} y={28} width={38} height={3} rx={1.5} fill="#10B981" />
    {/* Warehouse Main Building */}
    <Rect x={8} y={16} width={30} height={13} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.2} />
    {/* Roof */}
    <Polygon points="5,16 23,7 41,16" fill="#E8450F" />
    {/* Garage Entrance */}
    <Rect x={17} y={20} width={12} height={9} fill="#1E293B" rx={1} />
    {/* Stacked Cargo Boxes */}
    <Rect x={10} y={23} width={5} height={5} fill="#F59E0B" rx={0.5} />
    <Rect x={32} y={24} width={4.5} height={4.5} fill="#D97706" rx={0.5} />
  </Svg>
);

// Top 3D Mercon Logistics Driving Truck
const MerconTruckGraphic = () => (
  <Svg width={68} height={38} viewBox="0 0 68 38">
    {/* Floating Roof Pin Badge */}
    <G transform="translate(32, 0)">
      <Circle cx={8} cy={8} r={7.5} fill="#E8450F" />
      <Path d="M5 6.5 H9.5 L11.5 9.5 H12.5 V11 H4.5 V6.5 Z" fill="#FFFFFF" />
      <Circle cx={6.5} cy={11.5} r={1.2} fill="#E8450F" />
      <Circle cx={10.5} cy={11.5} r={1.2} fill="#E8450F" />
    </G>

    {/* Speed Lines */}
    <Line x1={0} y1={14} x2={10} y2={14} stroke="#E8450F" strokeWidth={2} strokeDasharray="3,2" opacity={0.8} />
    <Line x1={3} y1={20} x2={12} y2={20} stroke="#E8450F" strokeWidth={1.8} strokeDasharray="4,2" opacity={0.9} />
    <Line x1={1} y1={26} x2={8} y2={26} stroke="#E8450F" strokeWidth={1.5} opacity={0.6} />

    {/* White Cargo Container */}
    <Rect x={14} y={6} width={34} height={22} rx={1.8} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.2} />

    {/* Mercon Logo: Bold M + Speed Lines + Branding */}
    <Path d="M 18 10 L 22 10 L 25 19 L 22 19 Z" fill="#E8450F" />
    <Path d="M 23 10 L 27 10 L 30 19 L 27 19 Z" fill="#0F172A" />
    <Line x1={16} y1={12} x2={18} y2={12} stroke="#E8450F" strokeWidth={1.2} />
    <Line x1={15} y1={14} x2={18} y2={14} stroke="#E8450F" strokeWidth={1.2} />
    <Line x1={16} y1={16} x2={18} y2={16} stroke="#E8450F" strokeWidth={1.2} />
    <SvgText x={18} y={24} fontSize={3.8} fontWeight="900" fill="#E8450F">MERCON LOGISTICS</SvgText>

    {/* Orange Cabin */}
    <Path d="M 48 11 L 58 11 Q 62 11 63 15 L 64 23 Q 64 28 58 28 L 48 28 Z" fill="#E8450F" />
    <Path d="M 51 12 L 57 12 Q 59 12 60 15 L 60 20 L 51 20 Z" fill="#64748B" />

    {/* Headlight & Bumper */}
    <Rect x={63.5} y={23} width={2} height={3} fill="#F59E0B" rx={0.8} />
    <Rect x={48} y={26.5} width={15} height={2} fill="#334155" />

    {/* Wheels */}
    <Circle cx={23} cy={29} r={3.8} fill="#1E293B" stroke="#94A3B8" strokeWidth={1.5} />
    <Circle cx={23} cy={29} r={1.5} fill="#E2E8F0" />

    <Circle cx={55} cy={29} r={3.8} fill="#1E293B" stroke="#94A3B8" strokeWidth={1.5} />
    <Circle cx={55} cy={29} r={1.5} fill="#E2E8F0" />
  </Svg>
);

// Top 3D Delivery Building Graphic
const DeliveryBuildingGraphic = () => (
  <Svg width={46} height={38} viewBox="0 0 46 38">
    {/* Flag Pole & Orange Flag */}
    <Line x1={34} y1={0} x2={34} y2={16} stroke="#64748B" strokeWidth={1.5} />
    <Path d="M 34 1 L 44 5 L 34 9 Z" fill="#E8450F" />

    {/* Base Platform */}
    <Rect x={2} y={30} width={42} height={4} rx={2} fill="#E2E8F0" />
    <Rect x={4} y={28} width={38} height={3} rx={1.5} fill="#94A3B8" />

    {/* Delivery Building Main Facade */}
    <Rect x={8} y={14} width={28} height={15} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.2} />
    <Rect x={8} y={11} width={28} height={4} fill="#E8450F" />

    {/* Windows */}
    <Rect x={12} y={17} width={6} height={5} fill="#38BDF8" rx={0.5} />
    <Rect x={21} y={17} width={6} height={5} fill="#38BDF8" rx={0.5} />

    {/* Dock Door */}
    <Rect x={28} y={18} width={7} height={11} fill="#334155" rx={1} />

    {/* Cargo Boxes Outside */}
    <Rect x={18} y={24} width={4.5} height={4.5} fill="#F59E0B" rx={0.5} />
    <Rect x={13} y={25} width={4} height={4} fill="#D97706" rx={0.5} />

    {/* Tree Bush */}
    <Circle cx={5} cy={25} r={3} fill="#10B981" />
  </Svg>
);

export const TripProgressStepper: React.FC<TripProgressStepperProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
  onStepPress,
  showIllustrations = false,
}) => {
  const [trackWidth, setTrackWidth] = useState<number>(0);

  // Animated values for truck position, engine bounce, and active step radar pulse
  const truckX = useRef(new Animated.Value(0)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  // Track layout measurement
  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  // Continuous truck engine vibration driving animation
  useEffect(() => {
    const bounceAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceY, {
          toValue: -2.5,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnim.start();
    return () => bounceAnim.stop();
  }, [bounceY]);

  // Active step radar pulse aura animation
  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale, {
          toValue: 1.45,
          duration: 1300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.55,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [pulseScale, pulseOpacity, currentStep]);

  // Step calculations
  const stepCount = steps.length;
  // Inner track padding = 12px. Node diameter = 28. Center of node 0 = 12 + 14 = 26px.
  const paddingLeft = 26;
  const usableWidth = trackWidth > 52 ? trackWidth - 52 : 0;
  const stepSpacing = stepCount > 1 ? usableWidth / (stepCount - 1) : 0;

  const targetIdx = Math.min(Math.max(currentStep - 1, 0), stepCount - 1);
  const targetCenterX = paddingLeft + stepSpacing * targetIdx;

  // Attached to top-right of active step node circle
  const targetTruckX = targetCenterX + 2;

  useEffect(() => {
    if (trackWidth <= 0) return;
    Animated.spring(truckX, {
      toValue: targetTruckX,
      friction: 8,
      tension: 45,
      useNativeDriver: true,
    }).start();
  }, [targetTruckX, trackWidth, truckX]);

  return (
    <View style={styles.container}>
      {/* Top 3D Landmark Graphics Row (only if explicitly enabled) */}
      {showIllustrations && (
        <View style={styles.graphicsRow}>
          <PickupWarehouseGraphic />
          <MerconTruckGraphic />
          <DeliveryBuildingGraphic />
        </View>
      )}

      {/* Track Row */}
      <View style={styles.trackWrapper} onLayout={handleLayout}>
        {/* Connecting Track Line Segments */}
        {trackWidth > 0 &&
          steps.slice(0, stepCount - 1).map((_, idx) => {
            const startX = paddingLeft + stepSpacing * idx;
            const segmentWidth = stepSpacing;
            const isFilled = currentStep > idx + 1;

            return (
              <View
                key={`segment-${idx}`}
                style={[
                  styles.segmentLine,
                  {
                    left: startX,
                    width: segmentWidth,
                    backgroundColor: isFilled ? '#10B981' : 'transparent',
                    borderBottomWidth: isFilled ? 0 : 2,
                    borderBottomColor: '#CBD5E1',
                    borderStyle: isFilled ? 'solid' : 'dashed',
                  },
                ]}
              />
            );
          })}

        {/* Animated Floating Truck Badge attached to Active Step Node */}
        {trackWidth > 0 && (
          <Animated.View
            style={[
              styles.movingTruckContainer,
              {
                transform: [
                  { translateX: truckX },
                  { translateY: bounceY },
                ],
              },
            ]}
          >
            <View style={styles.truckBadge}>
              <Truck size={11} color="#FFFFFF" strokeWidth={2.6} />
            </View>
          </Animated.View>
        )}

        {/* Step Node Circles */}
        <View style={styles.nodesRow}>
          {steps.map((s) => {
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;
            const isAccessible = onStepPress && currentStep > s.id;

            return (
              <View key={s.id} style={styles.nodeWrapper}>
                {isActive && (
                  <Animated.View
                    style={[
                      styles.activePulseRing,
                      {
                        transform: [{ scale: pulseScale }],
                        opacity: pulseOpacity,
                      },
                    ]}
                  />
                )}

                <TouchableOpacity
                  style={[
                    styles.stepCircle,
                    isCompleted
                      ? styles.stepCompleted
                      : isActive
                      ? styles.stepActive
                      : styles.stepInactive,
                  ]}
                  activeOpacity={isAccessible ? 0.7 : 1}
                  disabled={!isAccessible}
                  onPress={() => isAccessible && onStepPress && onStepPress(s.id)}
                >
                  {isCompleted ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : isActive ? (
                    <Truck size={14} color="#FFFFFF" strokeWidth={2.4} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNum,
                        isActive ? styles.stepNumActive : styles.stepNumInactive,
                      ]}
                    >
                      {s.id}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Label & Status Subtext Row */}
      <View style={styles.labelsRow}>
        {steps.map((s) => {
          const isActive = currentStep === s.id;
          const isCompleted = currentStep > s.id;

          let statusText = 'Upcoming';
          if (isCompleted) statusText = 'Completed';
          if (isActive) statusText = 'In Progress';

          return (
            <View key={s.id} style={styles.labelCell}>
              <Text
                style={[
                  styles.stepLabel,
                  isActive
                    ? styles.stepLabelActive
                    : isCompleted
                    ? styles.stepLabelCompleted
                    : styles.stepLabelInactive,
                ]}
                numberOfLines={1}
              >
                {s.label}
              </Text>
              <Text
                style={[
                  styles.statusSubtext,
                  isCompleted
                    ? styles.subCompleted
                    : isActive
                    ? styles.subActive
                    : styles.subInactive,
                ]}
                numberOfLines={1}
              >
                {statusText}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  trackWrapper: {
    position: 'relative',
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentLine: {
    position: 'absolute',
    height: 3.5,
    borderRadius: 2,
    top: 13,
    zIndex: 1,
  },
  movingTruckContainer: {
    position: 'absolute',
    top: -6,
    left: 0,
    zIndex: 10,
  },
  truckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8450F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#E8450F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  nodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    zIndex: 2,
  },
  nodeWrapper: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activePulseRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(232, 69, 15, 0.3)',
    zIndex: 0,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepActive: {
    backgroundColor: '#E8450F',
  },
  stepInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepNumInactive: {
    color: '#64748B',
  },
  graphicsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  labelCell: {
    flex: 1,
    alignItems: 'center',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: '#E8450F',
    fontWeight: '800',
  },
  stepLabelCompleted: {
    color: '#0F172A',
  },
  stepLabelInactive: {
    color: '#94A3B8',
  },
  statusSubtext: {
    textAlign: 'center',
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  subCompleted: {
    color: '#10B981',
  },
  subActive: {
    color: '#E8450F',
  },
  subInactive: {
    color: '#94A3B8',
  },
});
