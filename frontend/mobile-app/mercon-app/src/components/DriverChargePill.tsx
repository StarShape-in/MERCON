import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Wallet, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTripHistory } from '../lib/use-trip-history';
import { getTripChargeValue } from '../screens/driver/DriverChargesScreen';
import { useLanguage } from '../lib/language-context';

interface DriverChargePillProps {
  amount?: number;
  style?: ViewStyle;
}

export function DriverChargePill({ amount, style }: DriverChargePillProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { trips: historyList } = useTripHistory();

  const totalEarnings = useMemo(() => {
    if (typeof amount === 'number') return amount;
    return historyList.reduce((sum, t) => {
      if (t.status === 'Completed' || t.status === 'Invoiced') {
        return sum + getTripChargeValue(t);
      }
      return sum;
    }, 0);
  }, [amount, historyList]);

  return (
    <TouchableOpacity
      style={[styles.driverChargePill, style]}
      activeOpacity={0.85}
      onPress={() => router.push('/driver-charges' as any)}
    >
      <View style={styles.walletIconCircle}>
        <Wallet size={15} color="#FA634E" strokeWidth={2.2} />
      </View>
      <View style={styles.chargeTextCol}>
        <Text style={styles.chargeAmount}>
          SAR {totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={styles.chargeLabel}>{t('label_driver_charge', 'Driver Charge')}</Text>
      </View>
      <ChevronRight size={14} color="#9898A4" strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  driverChargePill: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3E3C3D',
    borderRadius: 19,
    paddingHorizontal: 12,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeTextCol: {
    justifyContent: 'center',
  },
  chargeAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 15,
  },
  chargeLabel: {
    fontSize: 9.5,
    color: '#D8D8DC',
    lineHeight: 11,
    fontWeight: '500',
  },
});
