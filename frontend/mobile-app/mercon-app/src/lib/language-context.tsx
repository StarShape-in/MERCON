import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Globe, Check, X } from 'lucide-react-native';
import { safeSecureStore as SecureStore } from './secure-store';
import { TRANSLATIONS, LanguageMode, TranslationItem } from './translations';
import { Colors, Radius, Spacing, Typography, Shadows } from '../theme/tokens';

const LANGUAGE_KEY = 'mercon_user_language';

interface LanguageContextType {
  language: LanguageMode;
  setLanguage: (mode: LanguageMode) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  isLanguageModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key: string, fallback?: string) => fallback || key,
  isLanguageModalOpen: false,
  openLanguageModal: () => {},
  closeLanguageModal: () => {},
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageMode>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Load stored language preference
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
        if (stored && (stored === 'en' || stored === 'ur' || stored === 'ur-en')) {
          setLanguageState(stored as LanguageMode);
        }
      } catch (err) {
        console.warn('Failed to load language setting:', err);
      }
    })();
  }, []);

  const setLanguage = async (mode: LanguageMode) => {
    setLanguageState(mode);
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, mode);
    } catch (err) {
      console.warn('Failed to save language setting:', err);
    }
  };

  /**
   * Translates a given key based on current language mode.
   * Dynamic user data (names, IDs, plate numbers, dates) should NOT use t() or should be passed directly.
   */
  const t = (key: string, fallback?: string): string => {
    const item: TranslationItem | undefined = TRANSLATIONS[key];

    if (!item) {
      // If key is not found, fallback to provided fallback text or key
      return fallback || key;
    }

    if (language === 'en') {
      return item.en;
    } else if (language === 'ur') {
      return item.ur;
    } else if (language === 'ur-en') {
      // Format requested: "urdu and english both should come with urdu written/ english written"
      return `${item.ur} / ${item.en}`;
    }

    return item.en;
  };

  const openLanguageModal = () => setIsModalOpen(true);
  const closeLanguageModal = () => setIsModalOpen(false);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isLanguageModalOpen: isModalOpen,
        openLanguageModal,
        closeLanguageModal,
      }}
    >
      {children}

      {/* Global Language Selector Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeLanguageModal}
      >
        <Pressable style={styles.backdrop} onPress={closeLanguageModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Globe size={22} color={Colors.primary} strokeWidth={2.2} />
                <Text style={styles.modalTitle}>
                  {language === 'ur' ? 'زبان منتخب کریں' : language === 'ur-en' ? 'زبان منتخب کریں / Select Language' : 'Select Language'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeLanguageModal} style={styles.closeBtn}>
                <X size={20} color={Colors.gray500} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {language === 'ur'
                ? 'درخواست کے لیے اپنی پسندیدہ زبان منتخب کریں۔'
                : language === 'ur-en'
                ? 'درخواست کے لیے اپنی پسندیدہ زبان منتخب کریں۔ / Choose your preferred app language.'
                : 'Choose your preferred app language.'}
            </Text>

            <View style={styles.optionsList}>
              {/* Option 1: English */}
              <TouchableOpacity
                style={[styles.optionCard, language === 'en' && styles.optionCardActive]}
                activeOpacity={0.8}
                onPress={async () => {
                  await setLanguage('en');
                  closeLanguageModal();
                }}
              >
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, language === 'en' && styles.optionLabelActive]}>
                    English
                  </Text>
                  <Text style={styles.optionSub}>Standard English interface</Text>
                </View>
                {language === 'en' && <Check size={20} color={Colors.primary} strokeWidth={2.5} />}
              </TouchableOpacity>

              {/* Option 2: Urdu */}
              <TouchableOpacity
                style={[styles.optionCard, language === 'ur' && styles.optionCardActive]}
                activeOpacity={0.8}
                onPress={async () => {
                  await setLanguage('ur');
                  closeLanguageModal();
                }}
              >
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, language === 'ur' && styles.optionLabelActive]}>
                    اردو (Urdu)
                  </Text>
                  <Text style={styles.optionSub}>مکمل اردو انٹرفیس</Text>
                </View>
                {language === 'ur' && <Check size={20} color={Colors.primary} strokeWidth={2.5} />}
              </TouchableOpacity>

              {/* Option 3: Urdu / English (Bilingual) */}
              <TouchableOpacity
                style={[styles.optionCard, language === 'ur-en' && styles.optionCardActive]}
                activeOpacity={0.8}
                onPress={async () => {
                  await setLanguage('ur-en');
                  closeLanguageModal();
                }}
              >
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, language === 'ur-en' && styles.optionLabelActive]}>
                    اردو / English
                  </Text>
                  <Text style={styles.optionSub}>اردو اور انگریزی دونوں (Bilingual)</Text>
                </View>
                {language === 'ur-en' && <Check size={20} color={Colors.primary} strokeWidth={2.5} />}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalDesc: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardActive: {
    backgroundColor: Colors.primary + '10', // 10% opacity primary
    borderColor: Colors.primary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.gray800,
  },
  optionLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  optionSub: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
});
