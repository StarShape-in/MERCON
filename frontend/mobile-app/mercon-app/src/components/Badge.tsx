import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, Typography, getStatusColors } from '../theme/tokens';

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  dot?: boolean;
  style?: ViewStyle;
}

/** Generic badge — pass color + bg or use StatusBadge for automatic status colors */
export function Badge({ label, color = Colors.statusPending, bg = Colors.statusPendingBg, dot, style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

/** Automatically picks colors based on trip/vehicle/document status string */
export function StatusBadge({ status, dot, style }: { status: string; dot?: boolean; style?: ViewStyle }) {
  const { color, bg } = getStatusColors(status);
  return <Badge label={status} color={color} bg={bg} dot={dot} style={style} />;
}

/** Solid colored badge (e.g. Priority: Critical) */
export function SolidBadge({ label, color = Colors.danger, style }: { label: string; color?: string; style?: ViewStyle }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.text, { color: Colors.white }]}>{label}</Text>
    </View>
  );
}

/** Filter chip — toggleable */
export function FilterChip({
  label, active, onPress, style,
}: { label: string; active?: boolean; onPress?: () => void; style?: ViewStyle }) {
  return (
    <View
      onTouchEnd={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: Colors.primary }
          : { backgroundColor: Colors.gray100 },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: active ? Colors.white : Colors.dark }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radius.full,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...Typography.caption,
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.full,
  },
  chipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
