import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Truck, Package, MapPin, Flag } from 'lucide-react-native';

export interface TripStepperStep {
  id: number;
  label: string;
  icon: any;
}

export interface TripProgressStepperProps {
  currentStep: number; // 1 = Pickup, 2 = Loading, 3 = Delivery, 4 = Complete
  isCompletedAll?: boolean;
  onStepPress?: (stepId: number) => void;
}

const DEFAULT_STEPS: TripStepperStep[] = [
  { id: 1, label: 'Pickup', icon: Truck },
  { id: 2, label: 'Loading', icon: Package },
  { id: 3, label: 'Delivery', icon: MapPin },
  { id: 4, label: 'Complete', icon: Flag },
];

export const TripProgressStepper: React.FC<TripProgressStepperProps> = ({
  currentStep,
  isCompletedAll = false,
  onStepPress,
}) => {
  const allDone = isCompletedAll || currentStep >= 4;

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        {DEFAULT_STEPS.map((step, index) => {
          const IconComp = step.icon;
          const isCompleted = allDone || currentStep > step.id;
          const isActive = !allDone && currentStep === step.id;
          const isUpcoming = !allDone && currentStep < step.id;
          const isLast = index === DEFAULT_STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step Node Container */}
              <View style={styles.stepItem}>
                <TouchableOpacity
                  style={[
                    styles.nodeCircle,
                    allDone && styles.nodeAllDone,
                    isCompleted && !allDone && styles.nodeCompleted,
                    isActive && styles.nodeActive,
                    isUpcoming && styles.nodeUpcoming,
                  ]}
                  activeOpacity={onStepPress ? 0.7 : 1}
                  disabled={!onStepPress}
                  onPress={() => onStepPress && onStepPress(step.id)}
                >
                  {allDone ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : isCompleted ? (
                    <Check size={13} color="#10B981" strokeWidth={2.8} />
                  ) : isActive ? (
                    <IconComp size={14} color="#FFFFFF" strokeWidth={2.4} />
                  ) : (
                    <IconComp size={14} color="#94A3B8" strokeWidth={2} />
                  )}
                </TouchableOpacity>

                {/* Step Label */}
                <Text
                  style={[
                    styles.label,
                    allDone && styles.labelAllDone,
                    isCompleted && !allDone && styles.labelCompleted,
                    isActive && styles.labelActive,
                    isUpcoming && styles.labelUpcoming,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
                {allDone && (
                  <Text style={styles.subtextCompleted}>Completed</Text>
                )}
              </View>

              {/* Connected Line Segment */}
              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    allDone
                      ? styles.connectorAllDone
                      : isCompleted
                      ? styles.connectorCompleted
                      : styles.connectorInactive,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  nodeAllDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  nodeActive: {
    backgroundColor: '#FA634E',
    borderColor: '#FA634E',
    shadowColor: '#FA634E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  nodeUpcoming: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  connectorLine: {
    height: 2.5,
    flex: 1,
    marginTop: 15,
    marginHorizontal: -8,
    zIndex: 1,
  },
  connectorAllDone: {
    backgroundColor: '#10B981',
  },
  connectorCompleted: {
    backgroundColor: '#10B981',
  },
  connectorInactive: {
    backgroundColor: '#E2E8F0',
  },
  label: {
    fontSize: 10.5,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: '700',
  },
  labelAllDone: {
    color: '#10B981',
    fontWeight: '800',
  },
  labelCompleted: {
    color: '#10B981',
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
  subtextCompleted: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 1,
  },
});

export default TripProgressStepper;
