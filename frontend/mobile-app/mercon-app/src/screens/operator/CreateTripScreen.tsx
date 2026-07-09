import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Input } from '../../components';

const CUSTOMERS = ['Saudi Electronics Co.', 'Al-Jazeera Trading', 'Gulf Auto Parts', 'Aramco Supply'];
const DRIVERS = [
  { id: 'DRV-0112', name: 'Ahmed Al-Rashidi', status: 'available' },
  { id: 'DRV-0147', name: 'Khalid Al-Zahrani', status: 'available' },
  { id: 'DRV-0089', name: 'Faisal Al-Ghamdi', status: 'on_trip' },
];
const VEHICLES = [
  { id: 'TRK-2041', model: 'Mercedes Actros', status: 'available' },
  { id: 'TRK-2038', model: 'Volvo FH 540', status: 'available' },
  { id: 'TRK-2035', model: 'MAN TGX', status: 'on_trip' },
];

const CreateTripScreen = ({ navigation }: any) => {
  const [customer, setCustomer] = useState('');
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [cargoDesc, setCargoDesc] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [notes, setNotes] = useState('');

  const isValid = customer && pickup && destination && date && selectedDriver && selectedVehicle;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Trip</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Section: Customer */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.pickerCard}>
          {CUSTOMERS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.pickerItem, customer === c ? styles.pickerItemActive : null]}
              activeOpacity={0.8}
              onPress={() => setCustomer(c)}
            >
              <Text style={[styles.pickerItemText, customer === c ? styles.pickerItemTextActive : null]}>
                {c}
              </Text>
              {customer === c && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: Route */}
        <Text style={styles.sectionTitle}>Route</Text>
        <View style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Pickup Location</Text>
            <TextInput
              style={styles.input}
              value={pickup}
              onChangeText={setPickup}
              placeholder="e.g. Riyadh Industrial Zone, Gate 3"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.formDivider} />
          <View style={styles.formGroup}>
            <Text style={styles.label}>Destination</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Jeddah Port, Gate 7"
              placeholderTextColor={Colors.gray400}
            />
          </View>
        </View>

        {/* Section: Date & Time */}
        <Text style={styles.sectionTitle}>Departure</Text>
        <View style={styles.formCard}>
          <View style={styles.rowFields}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Section: Cargo */}
        <Text style={styles.sectionTitle}>Cargo</Text>
        <View style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={cargoDesc}
              onChangeText={setCargoDesc}
              placeholder="e.g. Consumer Electronics"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.formDivider} />
          <View style={styles.rowFields}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={cargoWeight}
                onChangeText={setCargoWeight}
                placeholder="e.g. 2400"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Pallets</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 12"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Section: Driver */}
        <Text style={styles.sectionTitle}>Assign Driver</Text>
        <View style={styles.pickerCard}>
          {DRIVERS.map((driver) => (
            <TouchableOpacity
              key={driver.id}
              style={[
                styles.driverItem,
                selectedDriver === driver.id ? styles.driverItemActive : null,
                driver.status === 'on_trip' ? styles.driverItemDisabled : null,
              ]}
              activeOpacity={driver.status === 'on_trip' ? 1 : 0.8}
              onPress={() => driver.status !== 'on_trip' && setSelectedDriver(driver.id)}
            >
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>
                  {driver.name.split(' ').map((n: string) => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, driver.status === 'on_trip' ? styles.disabledText : null]}>
                  {driver.name}
                </Text>
                <Text style={[styles.driverId, driver.status === 'on_trip' ? styles.disabledText : null]}>
                  {driver.id}
                </Text>
              </View>
              <View style={[styles.driverStatusBadge, driver.status === 'on_trip' ? styles.driverBadgeBusy : styles.driverBadgeAvail]}>
                <Text style={[styles.driverStatusText, driver.status === 'on_trip' ? styles.driverStatusBusy : styles.driverStatusAvail]}>
                  {driver.status === 'on_trip' ? 'On Trip' : 'Available'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: Vehicle */}
        <Text style={styles.sectionTitle}>Assign Vehicle</Text>
        <View style={styles.pickerCard}>
          {VEHICLES.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[
                styles.driverItem,
                selectedVehicle === v.id ? styles.driverItemActive : null,
                v.status === 'on_trip' ? styles.driverItemDisabled : null,
              ]}
              activeOpacity={v.status === 'on_trip' ? 1 : 0.8}
              onPress={() => v.status !== 'on_trip' && setSelectedVehicle(v.id)}
            >
              <View style={[styles.driverAvatar, styles.vehicleAvatarBg]}>
                {/* TODO: replace icon placeholders with lucide-react-native */}
                <Text style={styles.vehicleAvatarEmoji}>🚛</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, v.status === 'on_trip' ? styles.disabledText : null]}>
                  {v.id}
                </Text>
                <Text style={[styles.driverId, v.status === 'on_trip' ? styles.disabledText : null]}>
                  {v.model}
                </Text>
              </View>
              <View style={[styles.driverStatusBadge, v.status === 'on_trip' ? styles.driverBadgeBusy : styles.driverBadgeAvail]}>
                <Text style={[styles.driverStatusText, v.status === 'on_trip' ? styles.driverStatusBusy : styles.driverStatusAvail]}>
                  {v.status === 'on_trip' ? 'On Trip' : 'Available'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <View style={styles.formCard}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions, customs requirements, or delivery notes..."
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <Button
          title="Create Trip"
          onPress={() => navigation?.goBack()}
          disabled={!isValid}
        />

        {!isValid && (
          <Text style={styles.validationHint}>
            Fill in customer, route, date, driver and vehicle to create the trip.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.gray900,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  pickerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  pickerItemActive: {
    backgroundColor: '#FFF7ED',
  },
  pickerItemText: {
    fontSize: Typography.sm,
    color: Colors.gray700,
    fontWeight: '500',
  },
  pickerItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  formGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: Typography.sm,
    color: Colors.gray900,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  formDivider: {
    height: Spacing.md,
  },
  rowFields: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  driverItemActive: {
    backgroundColor: '#FFF7ED',
  },
  driverItemDisabled: {
    opacity: 0.5,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  vehicleAvatarBg: {
    backgroundColor: Colors.gray200,
  },
  vehicleAvatarEmoji: {
    fontSize: 20,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  driverId: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  disabledText: {
    color: Colors.gray400,
  },
  driverStatusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  driverBadgeAvail: {
    backgroundColor: '#DCFCE7',
  },
  driverBadgeBusy: {
    backgroundColor: Colors.gray100,
  },
  driverStatusText: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  driverStatusAvail: {
    color: Colors.success,
  },
  driverStatusBusy: {
    color: Colors.gray400,
  },
  notesInput: {
    fontSize: Typography.sm,
    color: Colors.gray900,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  validationHint: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: -Spacing.xs,
  },
});

export default CreateTripScreen;
