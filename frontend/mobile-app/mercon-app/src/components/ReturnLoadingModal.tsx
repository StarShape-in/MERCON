import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { CheckCircle2, RotateCcw, MapPin, ArrowRight, ArrowLeft, X } from 'lucide-react-native';
import { useLanguage } from '../lib/language-context';

export interface ReturnLoadingModalProps {
  visible: boolean;
  onConfirm: () => void;
  onClose?: () => void;
  destinationName?: string;
  destinationAddress?: string;
}

export const ReturnLoadingModal: React.FC<ReturnLoadingModalProps> = ({
  visible,
  onConfirm,
  onClose,
  destinationName,
  destinationAddress,
}) => {
  const { t, language } = useLanguage();
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose || onConfirm}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Top Right Close Button */}
          {onClose && (
            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={18} color="#94A3B8" strokeWidth={2.2} />
            </TouchableOpacity>
          )}

          {/* Icon Cluster: Checkmark Badge with Return Overlay */}
          <View style={styles.iconClusterWrapper}>
            <View style={styles.iconCircleSuccess}>
              <CheckCircle2 size={36} color="#10B981" strokeWidth={2.4} />
            </View>
            <View style={styles.iconBadgeReturn}>
              <RotateCcw size={13} color="#FFFFFF" strokeWidth={2.6} />
            </View>
          </View>

          {/* Modal Title */}
          <Text style={styles.title}>{t('title_return_modal', 'Delivery Completed!')}</Text>

          {/* Pill Badge */}
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>{t('badge_outbound_finished', 'Outbound Leg Finished · Round Trip')}</Text>
          </View>

          {/* Subtitle Description */}
          <Text style={styles.description}>
            {t('desc_proceed_return', 'Outbound delivery confirmed. Proceed to Return Cargo Loading at:')}
          </Text>

          {/* Return Loading Depot Highlight Box */}
          <View style={styles.locationBox}>
            <View style={styles.locationHeaderRow}>
              <View style={styles.locationPinCircle}>
                <MapPin size={13} color="#FA634E" strokeWidth={2.5} />
              </View>
              <Text style={styles.locationStepHeader}>{t('label_return_point', 'RETURN LOADING POINT')}</Text>
            </View>

            <Text style={styles.locationName} numberOfLines={2}>
              {destinationName || t('label_return_loading_depot', 'Return Loading Depot')}
            </Text>

            {destinationAddress ? (
              <Text style={styles.locationAddr} numberOfLines={2}>
                {destinationAddress}
              </Text>
            ) : null}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={onConfirm}
          >
            <Text style={styles.primaryBtnText}>{t('action_start_return_loading', 'Start Return Loading')}</Text>
            {language === 'ur' ? (
              <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.6} style={styles.btnArrowIcon} />
            ) : (
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.6} style={styles.btnArrowIcon} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 375,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconClusterWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  iconCircleSuccess: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadgeReturn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FA634E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  pillBadge: {
    backgroundColor: '#EEF1F6',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  description: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  locationBox: {
    width: '100%',
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#FED7D2',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 16,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationPinCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  locationStepHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FA634E',
    letterSpacing: 0.6,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 20,
  },
  locationAddr: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#FA634E',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FA634E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnArrowIcon: {
    marginLeft: 8,
  },
});
