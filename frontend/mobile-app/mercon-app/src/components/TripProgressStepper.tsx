import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Truck } from 'lucide-react-native';

export interface TripStepperStep {
  id: number;
  label: string;
}

export interface TripProgressStepperProps {
  currentStep: number; // 1 = Pickup, 2 = Loading, 3 = In Transit, 4 = Delivery
  steps?: TripStepperStep[];
  onStepPress?: (stepId: number) => void;
  showIllustrations?: boolean;
}

const DEFAULT_STEPS: TripStepperStep[] = [
  { id: 1, label: 'Pickup' },
  { id: 2, label: 'Loading' },
  { id: 3, label: 'In Transit' },
  { id: 4, label: 'Delivery' },
];

export const TripProgressStepper: React.FC<TripProgressStepperProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
  onStepPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isUpcoming = currentStep < step.id;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step Item */}
              <View style={styles.stepItem}>
                <TouchableOpacity
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCompleted,
                    isActive && styles.nodeActive,
                    isUpcoming && styles.nodeUpcoming,
                  ]}
                  activeOpacity={onStepPress ? 0.7 : 1}
                  disabled={!onStepPress}
                  onPress={() => onStepPress && onStepPress(step.id)}
                >
                  {isCompleted ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : isActive ? (
                    <Truck size={13} color="#FFFFFF" strokeWidth={2.4} />
                  ) : (
                    <View style={styles.upcomingInnerDot} />
                  )}
                </TouchableOpacity>

                <Text
                  style={[
                    styles.label,
                    isCompleted && styles.labelCompleted,
                    isActive && styles.labelActive,
                    isUpcoming && styles.labelUpcoming,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {/* Connected Progress Line Segment */}
              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    isCompleted ? styles.connectorCompleted : styles.connectorInactive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    width: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 2,
    flex: 1,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  nodeCompleted: {
    backgroundColor: '#FA634E',
  },
  nodeActive: {
    backgroundColor: '#FA634E',
    shadowColor: '#FA634E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeUpcoming: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  upcomingInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  connectorLine: {
    height: 2,
    flex: 1,
    marginTop: 10,
    marginHorizontal: -10,
    zIndex: 1,
  },
  connectorCompleted: {
    backgroundColor: '#FA634E',
  },
  connectorInactive: {
    backgroundColor: '#E2E8F0',
  },
  label: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  labelCompleted: {
    color: '#3E3C3D',
    fontWeight: '700',
  },
  labelActive: {
    color: '#FA634E',
    fontWeight: '800',
  },
  labelUpcoming: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});

export default TripProgressStepper;

