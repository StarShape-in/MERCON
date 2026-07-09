import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Input } from '../../components';

const DeliveryVerificationScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(1);
  const [receiverName, setReceiverName] = useState('');
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
          <Text style={styles.headerTitle}>Delivery Verification</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <TouchableOpacity
                style={[styles.stepCircle, step >= s ? styles.stepActive : null]}
                activeOpacity={0.8}
                onPress={() => step > s && setStep(s)}
              >
                <Text style={[styles.stepNum, step >= s ? styles.stepNumActive : null]}>
                  {step > s ? '✓' : s}
                </Text>
              </TouchableOpacity>
              {s < 2 && (
                <View style={[styles.stepLine, step > s ? styles.stepLineActive : null]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, step === 1 ? styles.stepLabelActive : null]}>
            Cargo Photos
          </Text>
          <Text style={[styles.stepLabel, step === 2 ? styles.stepLabelActive : null]}>
            Signature & Receiver
          </Text>
        </View>

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Document Delivered Cargo</Text>
            <Text style={styles.stepSub}>
              Take photos of the cargo upon delivery at Jeddah Port.
            </Text>
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
                    <View style={styles.photoEmpty}>
                      <Text style={styles.photoEmoji}>📷</Text>
                      <Text style={styles.photoEmptyText}>Photo {i + 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addPhotoBtn} activeOpacity={0.8} onPress={() => {}}>
              <Text style={styles.addPhotoText}>+ Add Photo</Text>
            </TouchableOpacity>
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                📋 Ensure all cargo items (12 pallets of electronics) are visible and accounted for.
              </Text>
            </View>
            <Button title="Continue to Signature" onPress={() => setStep(2)} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Receiver Signature</Text>
            <Text style={styles.stepSub}>
              Have the receiver sign below and enter their name.
            </Text>

            {/* Signature Box */}
            <View style={styles.signatureBox}>
              <View style={styles.signatureArea}>
                <Text style={styles.signaturePlaceholder}>Tap to sign</Text>
                <View style={styles.signatureLine} />
              </View>
              <Text style={styles.signatureLabel}>Receiver Signature</Text>
            </View>

            <Input
              label="Receiver Full Name"
              value={receiverName}
              onChangeText={setReceiverName}
              placeholder="e.g. Abdullah Al-Hamdan"
            />

            <Input
              label="Receiver ID / Company"
              placeholder="e.g. Saudi Electronics Co. — ID: 1234567890"
            />

            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Delivery Time</Text>
              <Text style={styles.timestampValue}>
                {new Date().toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </View>

            <Button
              title="Complete Trip"
              onPress={() => navigation?.navigate('TripCompleted')}
              disabled={!receiverName}
            />
          </View>
        )}
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    gap: 0,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: Colors.primary,
  },
  stepNum: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray500,
  },
  stepNumActive: {
    color: Colors.white,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.gray200,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  stepLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: Colors.primary,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.gray900,
  },
  stepSub: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    lineHeight: 20,
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
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  photoFilled: {
    borderStyle: 'solid',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoEmoji: {
    fontSize: 24,
  },
  photoEmptyText: {
    fontSize: Typography.xs,
    color: Colors.gray400,
  },
  addPhotoBtn: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  notice: {
    backgroundColor: '#FFF7ED',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  noticeText: {
    fontSize: Typography.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  signatureBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  signatureArea: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  signaturePlaceholder: {
    fontSize: Typography.sm,
    color: Colors.gray400,
    marginBottom: Spacing.xl,
  },
  signatureLine: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    height: 1,
    backgroundColor: Colors.gray300,
  },
  signatureLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    textAlign: 'center',
    padding: Spacing.sm,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  timestampLabel: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
  timestampValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
});

export default DeliveryVerificationScreen;
