import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors } from '../theme/tokens';

export interface TripStepperStep {
  id: number;
  label: string;
}

export interface TripProgressStepperProps {
  currentStep: number;
  steps?: TripStepperStep[];
  onStepPress?: (stepId: number) => void;
}

const DEFAULT_STEPS: TripStepperStep[] = [
  { id: 1, label: 'Go to Pickup' },
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
      {/* Circle & Line Row */}
      <View style={styles.stepRow}>
        {steps.map((s, idx) => {
          const isCompleted = currentStep > s.id;
          const isActive = currentStep === s.id;
          const isAccessible = onStepPress && currentStep > s.id;

          return (
            <React.Fragment key={s.id}>
              <TouchableOpacity
                style={[
                  styles.stepCircle,
                  isCompleted || isActive ? styles.stepActive : styles.stepInactive,
                ]}
                activeOpacity={isAccessible ? 0.7 : 1}
                disabled={!isAccessible}
                onPress={() => isAccessible && onStepPress(s.id)}
              >
                {isCompleted ? (
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepNum, isActive ? styles.stepNumActive : styles.stepNumInactive]}>
                    {s.id}
                  </Text>
                )}
              </TouchableOpacity>

              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    currentStep > s.id ? styles.stepLineActive : styles.stepLineInactive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Label Row */}
      <View style={styles.stepLabels}>
        {steps.map((s) => {
          const isActive = currentStep === s.id;
          const isCompleted = currentStep > s.id;

          return (
            <Text
              key={s.id}
              style={[
                styles.stepLabel,
                isActive ? styles.stepLabelActive : isCompleted ? styles.stepLabelCompleted : styles.stepLabelInactive,
              ]}
              numberOfLines={2}
            >
              {s.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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
    color: Colors.white,
  },
  stepNumInactive: {
    color: '#64748B',
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
    borderRadius: 1.5,
  },
  stepLineActive: {
    backgroundColor: '#E8450F',
  },
  stepLineInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: '#E8450F',
  },
  stepLabelCompleted: {
    color: '#334155',
  },
  stepLabelInactive: {
    color: '#94A3B8',
  },
});
