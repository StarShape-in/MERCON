import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button } from '../../components';

const PickupVerificationScreen = ({ navigation }: any) => {
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pickup Verification</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Trip Summary Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Trip ID</Text>
            <Text style={styles.summaryValue}>#TRP-2024-0891</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>From</Text>
            <Text style={styles.summaryValue}>Riyadh</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cargo</Text>
            <Text style={styles.summaryValue}>Electronics</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.instructionIcon}>ℹ️</Text>
          <Text style={styles.instructionText}>
            Please take clear photos of the cargo before loading. Minimum 3 photos required.
          </Text>
        </View>

        {/* Camera Upload Area */}
        <TouchableOpacity style={styles.uploadArea} activeOpacity={0.8} onPress={() => {}}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.uploadTitle}>Take Photo</Text>
          <Text style={styles.uploadSub}>Tap to open camera</Text>
        </TouchableOpacity>

        {/* Photo Previews */}
        <Text style={styles.sectionTitle}>Photos ({photos.length}/3 minimum)</Text>
        <View style={styles.photosGrid}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.photoPreview, photos[i] ? styles.photoFilled : styles.photoEmpty]}>
              {photos[i] ? (
                <Image source={{ uri: photos[i] }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>＋</Text>
                  <Text style={styles.photoPlaceholderText}>Photo {i + 1}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.checklist}>
          {[
            'Front of cargo/shipment',
            'Side view with labels visible',
            'Loading bay / truck interior',
          ].map((item, i) => (
            <View key={i} style={styles.checkItem}>
              <View style={[styles.checkBox, photos.length > i ? styles.checkBoxDone : null]}>
                {photos.length > i && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <Button
          title="Continue to Navigation"
          onPress={() => navigation?.navigate('LiveNavigation')}
          disabled={photos.length < 3}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
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
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight || '#FFF7ED',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  instructionIcon: {
    fontSize: 18,
  },
  instructionText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
  },
  cameraIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  uploadTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  uploadSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  photoPreview: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  photoEmpty: {
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: Colors.gray50,
  },
  photoFilled: {
    borderWidth: 0,
  },
  photoImage: {
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
    color: Colors.gray400,
  },
  photoPlaceholderText: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginTop: 4,
  },
  checklist: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  checkText: {
    fontSize: Typography.sm,
    color: Colors.gray700,
  },
});

export default PickupVerificationScreen;
