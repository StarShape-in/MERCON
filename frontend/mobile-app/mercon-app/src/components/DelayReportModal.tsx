import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Image, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { X, Camera, Video, Image as ImageIcon, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../theme/tokens';
import { Button } from './Button';
import { chooseMedia, capturePhoto, captureVideo, type CapturedMedia } from '../lib/camera';
import { tripService } from '../lib/trips';
import { getApiErrorMessage } from '../lib/api';

const REASON_PRESETS = [
  { id: 'traffic', label: 'Heavy Traffic / Jam', icon: '🚦' },
  { id: 'road_closure', label: 'Road Closure / Construction', icon: '🚧' },
  { id: 'dock_wait', label: 'Loading Dock Queue / Wait', icon: '🚛' },
  { id: 'vehicle_breakdown', label: 'Vehicle Technical Issue', icon: '🛠️' },
  { id: 'customs', label: 'Customs / Border Clearance', icon: '📑' },
  { id: 'weather', label: 'Bad Weather Conditions', icon: '🌧️' },
];

interface DelayReportModalProps {
  visible: boolean;
  tripId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DelayReportModal({ visible, tripId, onClose, onSuccess }: DelayReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState('');
  const [media, setMedia] = useState<CapturedMedia | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'media' | 'details'>('media');

  const handlePickMedia = async (kind: 'photo' | 'video' | 'gallery') => {
    try {
      let res: CapturedMedia | null = null;
      if (kind === 'photo') {
        const photo = await capturePhoto();
        if (photo) res = { uri: photo.uri, type: 'image', mimeType: photo.mimeType, fileName: photo.fileName };
      } else if (kind === 'video') {
        res = await captureVideo();
      } else {
        res = await chooseMedia();
      }
      if (res) {
        setMedia(res);
        setStep('details');
      }
    } catch (e) {
      Alert.alert('Media Capture Error', getApiErrorMessage(e));
    }
  };

  const handleReset = () => {
    setSelectedReason(null);
    setCustomNotes('');
    setMedia(null);
    setLoading(false);
    setStep('media');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      // Build final delay reason text
      const finalReason = [
        selectedReason ? REASON_PRESETS.find((r) => r.id === selectedReason)?.label : null,
        customNotes.trim() ? customNotes.trim() : null,
      ].filter(Boolean).join(' - ') || 'Driver reported delay';

      // 1. Upload photo/video evidence if attached
      if (media) {
        await tripService.uploadPhoto(tripId, 'cargo', {
          uri: media.uri,
          mimeType: media.mimeType,
          fileName: media.fileName ?? (media.type === 'video' ? 'delay-video.mp4' : 'delay-photo.jpg'),
          location: media.location,
        });
      }

      // 2. Update trip status to Delayed with reason
      await tripService.updateStatus(tripId, 'Delayed', finalReason);

      Alert.alert('Delay Reported', 'Your delay report has been submitted to dispatch.');
      handleClose();
      onSuccess();
    } catch (e) {
      Alert.alert('Could Not Report Delay', getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AlertTriangle size={20} color="#D97706" strokeWidth={2.2} />
              <Text style={styles.title}>Report Trip Delay</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
              <X size={20} color={Colors.gray500} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {/* STEP 1: CAPTURE MEDIA EVIDENCE */}
            {step === 'media' && (
              <View style={styles.stepBlock}>
                <Text style={styles.stepTitle}>1. Capture Evidence (Photo or Video)</Text>
                <Text style={styles.stepSub}>Take a photo or video of the delay (e.g. traffic, breakdown, wait time).</Text>

                <View style={styles.mediaActionGrid}>
                  <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.8} onPress={() => handlePickMedia('photo')}>
                    <Camera size={26} color={Colors.primary} strokeWidth={2} />
                    <Text style={styles.mediaBtnText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.8} onPress={() => handlePickMedia('video')}>
                    <Video size={26} color="#7C3AED" strokeWidth={2} />
                    <Text style={styles.mediaBtnText}>Record Video</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.mediaBtn} activeOpacity={0.8} onPress={() => handlePickMedia('gallery')}>
                    <ImageIcon size={26} color="#0284C7" strokeWidth={2} />
                    <Text style={styles.mediaBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.skipBtn} onPress={() => setStep('details')}>
                  <Text style={styles.skipBtnText}>Skip Evidence (Proceed to Reason) →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: REASON SELECTION & OPTIONAL CUSTOM TYPING */}
            {step === 'details' && (
              <View style={styles.stepBlock}>
                {media && (
                  <View style={styles.mediaPreviewCard}>
                    <View style={styles.mediaPreviewLeft}>
                      {media.type === 'video' ? (
                        <Video size={22} color="#7C3AED" />
                      ) : (
                        <Image source={{ uri: media.uri }} style={styles.thumbnail} />
                      )}
                      <View>
                        <Text style={styles.mediaPreviewTitle}>
                          {media.type === 'video' ? 'Video Evidence Recorded' : 'Photo Attached'}
                        </Text>
                        <Text style={styles.mediaPreviewSub}>Tap trash to remove</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setMedia(null)} hitSlop={8}>
                      <Trash2 size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.stepTitle}>2. Select Delay Reason</Text>
                <View style={styles.presetsGrid}>
                  {REASON_PRESETS.map((preset) => {
                    const selected = selectedReason === preset.id;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[styles.presetChip, selected && styles.presetChipSelected]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedReason(selected ? null : preset.id)}
                      >
                        <Text style={styles.presetIcon}>{preset.icon}</Text>
                        <Text style={[styles.presetLabel, selected && styles.presetLabelSelected]}>
                          {preset.label}
                        </Text>
                        {selected && <CheckCircle2 size={14} color={Colors.primary} style={styles.checkIcon} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>Additional Notes / Custom Reason (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customNotes}
                  onChangeText={setCustomNotes}
                  placeholder="Type extra notes or custom reason (optional)..."
                  placeholderTextColor={Colors.gray400}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          {step === 'details' && (
            <View style={styles.footer}>
              <Button
                title={loading ? 'Submitting…' : 'Submit Delay Report'}
                onPress={handleSubmit}
                disabled={loading}
                size="lg"
                style={styles.submitBtn}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '88%',
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.gray900,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  body: {
    maxHeight: 460,
  },
  bodyContent: {
    padding: Spacing.lg,
  },
  stepBlock: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  stepSub: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: -Spacing.xs,
  },
  mediaActionGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  mediaBtn: {
    flex: 1,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  mediaBtnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.gray900,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  skipBtnText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray500,
  },
  mediaPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  mediaPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
  },
  mediaPreviewTitle: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: '#166534',
  },
  mediaPreviewSub: {
    fontSize: 10,
    color: '#15803D',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 6,
  },
  presetChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  presetIcon: {
    fontSize: 14,
  },
  presetLabel: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray700,
  },
  presetLabelSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 2,
  },
  inputLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.gray700,
    marginTop: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: Typography.xs,
    color: Colors.gray900,
    minHeight: 70,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  submitBtn: {
    borderRadius: Radius.xl,
  },
});
