import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button } from '../../components';

const EmergencyScreen = ({ navigation }: any) => {
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [incidentType, setIncidentType] = useState('');

  const incidentTypes = [
    { id: 'accident', label: 'Road Accident', icon: '💥' },
    { id: 'breakdown', label: 'Vehicle Breakdown', icon: '🔧' },
    { id: 'medical', label: 'Medical Emergency', icon: '🏥' },
    { id: 'security', label: 'Security Threat', icon: '🛡️' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.error }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.error} />
      <ScrollView contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
        {/* Red Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>🚨</Text>
            <Text style={styles.headerTitle}>Emergency Report</Text>
            <Text style={styles.headerSub}>Your location is being shared with operator</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Call Operator */}
          <TouchableOpacity style={styles.callBtn} activeOpacity={0.8} onPress={() => {}}>
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callText}>Call Operator Now</Text>
            <Text style={styles.callSub}>+966 11 234 5678</Text>
          </TouchableOpacity>

          {/* Incident Type */}
          <Text style={styles.sectionTitle}>Incident Type</Text>
          <View style={styles.incidentGrid}>
            {incidentTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.incidentItem, incidentType === type.id && styles.incidentItemActive]}
                activeOpacity={0.8}
                onPress={() => setIncidentType(type.id)}
              >
                <Text style={styles.incidentEmoji}>{type.icon}</Text>
                <Text style={[styles.incidentLabel, incidentType === type.id && styles.incidentLabelActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo Upload */}
          <Text style={styles.sectionTitle}>Incident Photos</Text>
          <View style={styles.photoGrid}>
            {[0, 1, 2, 3].map((i) => (
              <TouchableOpacity
                key={i}
                style={[styles.photoSlot, photos[i] ? styles.photoFilled : null]}
                activeOpacity={0.8}
                onPress={() => {}}
              >
                {photos[i] ? (
                  <Image source={{ uri: photos[i] }} style={styles.photoImg} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderIcon}>📷</Text>
                    <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.sectionTitle}>Incident Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe what happened. Include location details, injuries, and any immediate assistance needed..."
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Current Location */}
          <View style={styles.locationCard}>
            <Text style={styles.locationIcon}>📍</Text>
            <View>
              <Text style={styles.locationLabel}>Current Location (GPS)</Text>
              <Text style={styles.locationValue}>King Fahd Road, Riyadh · 24.7136° N, 46.6753° E</Text>
            </View>
          </View>

          <Button
            title="Send Emergency Report"
            onPress={() => {}}
            style={styles.sendBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: Spacing['3xl'],
  },
  header: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.white,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.white,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  body: {
    backgroundColor: Colors.gray100,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing.lg,
    marginTop: -Spacing.lg,
    gap: Spacing.md,
  },
  callBtn: {
    backgroundColor: Colors.error,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.lg,
  },
  callIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  callText: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.white,
  },
  callSub: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginTop: Spacing.sm,
  },
  incidentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  incidentItem: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  incidentItemActive: {
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  incidentEmoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  incidentLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.gray700,
    textAlign: 'center',
  },
  incidentLabelActive: {
    color: Colors.error,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 1.3,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  photoFilled: {
    borderStyle: 'solid',
    borderColor: Colors.gray300,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 24,
  },
  photoPlaceholderText: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: Typography.sm,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
    minHeight: 120,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  locationIcon: {
    fontSize: 20,
  },
  locationLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: 2,
  },
  locationValue: {
    fontSize: Typography.sm,
    color: Colors.gray900,
    fontWeight: '600',
  },
  sendBtn: {
    marginTop: Spacing.sm,
  },
});

export default EmergencyScreen;
