import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Platform,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { QrCode, Languages, X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../navigation/types';
import { setOnboardingCompleted } from '../services/onboardingService';
import { PERMISSIONS_STORAGE_KEY } from './AppPermissionsScreen';

// ── Flashcard High-Resolution Illustration Assets ──
const FLASHCARD_IMG_1 = require('../../assets/flashcards/Digital Healthcare App Illustration.png');
const FLASHCARD_IMG_2 = require('../../assets/flashcards/Digital Health ID Card Illustration.png');
const FLASHCARD_IMG_3 = require('../../assets/flashcards/Doctor and Patient Handshake Illustration.png');
const FLASHCARD_IMG_4 = require('../../assets/flashcards/Global Connections Infographic.png');
const FLASHCARD_IMG_5 = require('../../assets/flashcards/MSCureChain Handheld App Illustration.png');

interface FlashCardItem {
  id: string;
  title: string;
  description: string;
  image: any;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export default function OnboardingScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { t, i18n } = useTranslation();

  const [activeIndex, setActiveIndex] = useState(0);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const flatListRef = useRef<any>(null);
  const isNavigatingRef = useRef(false);

  const currentLangCode = (i18n.language || 'en').split('-')[0];
  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  // Dynamic Flash Cards responding immediately to language changes via i18n
  const flashCards: FlashCardItem[] = useMemo(
    () => [
      {
        id: 'card-1',
        title: t('onboarding.card1Title', { defaultValue: 'What is MSCureChain?' }),
        description: t('onboarding.card1Desc', {
          defaultValue:
            'It is a citizen-facing application that will enable you to view, manage, and do consent-based sharing of health records.',
        }),
        image: FLASHCARD_IMG_1,
      },
      {
        id: 'card-2',
        title: t('onboarding.card2Title', { defaultValue: 'What is your Health ID?' }),
        description: t('onboarding.card2Desc', {
          defaultValue:
            'It is an easy-to-remember personal health record account, which you can use to enable the exchange of health records.',
        }),
        image: FLASHCARD_IMG_2,
      },
      {
        id: 'card-3',
        title: t('onboarding.card3Title', { defaultValue: 'Scan to Share at Hospitals' }),
        description: t('onboarding.card3Desc', {
          defaultValue:
            'Scan hospital counter QR codes to instantly share your profile, skip long lines, and get instant OPD tokens.',
        }),
        image: FLASHCARD_IMG_3,
      },
      {
        id: 'card-4',
        title: t('onboarding.card4Title', { defaultValue: 'Search Network Hospitals' }),
        description: t('onboarding.card4Desc', {
          defaultValue:
            'Search any nearby health facility, doctor, or department and get health records.',
        }),
        image: FLASHCARD_IMG_4,
      },
      {
        id: 'card-5',
        title: t('onboarding.card5Title', { defaultValue: 'Easy Access' }),
        description: t('onboarding.card5Desc', {
          defaultValue:
            'All your health records, including lab reports, prescriptions, and digital certificates, are at your fingertips!',
        }),
        image: FLASHCARD_IMG_5,
      },
    ],
    [t]
  );

  const handleLanguageChange = async (code: string) => {
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('user-language', code);
    } catch (e) {
      console.warn('[Onboarding] Error changing language:', e);
    } finally {
      setLangModalVisible(false);
    }
  };

  // Navigate to Registration or Login with Permissions check
  const handleAuthAction = useCallback(
    async (target: 'Register' | 'Login') => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      try {
        await setOnboardingCompleted();
        const permissionsAck = await AsyncStorage.getItem(PERMISSIONS_STORAGE_KEY);

        if (!permissionsAck) {
          navigation.navigate('AppPermissions', { returnTo: target });
        } else {
          navigation.navigate(target);
        }
      } catch (e) {
        console.warn('[Onboarding] Error during auth transition:', e);
        navigation.navigate(target);
      } finally {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 800);
      }
    },
    [navigation]
  );

  const handleOpenQR = useCallback(() => {
    navigation.navigate('QRScanner');
  }, [navigation]);

  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const contentOffsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(contentOffsetX / screenWidth);
      if (newIndex >= 0 && newIndex < flashCards.length) {
        setActiveIndex(newIndex);
      }
    },
    [screenWidth, flashCards.length]
  );

  // Responsive hero dimensions
  const heroWidth = Math.min(screenWidth - 32, 340);
  const heroHeight = Math.min(screenHeight * 0.44, 300);

  const renderCardItem = ({ item }: { item: FlashCardItem; index: number }) => {
    return (
      <View style={[styles.cardContainer, { width: screenWidth }]}>
        {/* Hero Visual Container */}
        <View style={[styles.heroVisualWrapper, { width: heroWidth, height: heroHeight }]}>
          <Image
            source={item.image}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Text Section */}
        <View style={styles.textSection}>
          <Text style={styles.headlineText} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Top Utility Header: QR Scanner Shortcut & Language Switcher ── */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 14) }]}>
        {/* QR Scanner Shortcut Circle */}
        <TouchableOpacity
          onPress={handleOpenQR}
          activeOpacity={0.7}
          style={styles.qrBadgeButton}
          accessibilityLabel="Scan QR Code"
          accessibilityRole="button"
        >
          <QrCode size={19} color="#0F2A4A" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Language Selector Pill */}
        <TouchableOpacity
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.7}
          style={styles.languageButton}
          accessibilityLabel="Change Language"
          accessibilityRole="button"
        >
          <Languages size={17} color="#0F2A4A" strokeWidth={2} style={styles.langIcon} />
          <Text style={styles.languageText}>{currentLangObj.label}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main Flash Cards Carousel ── */}
      <View style={styles.carouselWrapper}>
        <FlatList
          ref={flatListRef}
          data={flashCards}
          keyExtractor={(item) => item.id}
          renderItem={renderCardItem}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.flatList}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
        />
      </View>

      {/* ── Bottom Section: Expanding Pill Indicators & Dual Action Buttons ── */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* 5 Dots / Expanding Pill Indicators */}
        <View style={styles.paginationRow}>
          {flashCards.map((_, i) => {
            const isActive = activeIndex === i;
            return (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dotBase,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Dual Bottom CTA Buttons: Register (Outlined) & Login (Solid Orange) */}
        <View style={styles.actionButtonsRow}>
          {/* Register Button */}
          <Pressable
            onPress={() => handleAuthAction('Register')}
            style={({ pressed }) => [
              styles.btnRegister,
              pressed && styles.btnPressedOutline,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Register"
          >
            <Text style={styles.btnRegisterText}>{t('onboarding.register', { defaultValue: 'Register' })}</Text>
          </Pressable>

          {/* Login Button */}
          <Pressable
            onPress={() => handleAuthAction('Login')}
            style={({ pressed }) => [
              styles.btnLogin,
              pressed && styles.btnPressedSolid,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Login"
          >
            <Text style={styles.btnLoginText}>{t('onboarding.login', { defaultValue: 'Login' })}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Language Selector Modal ── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('onboarding.chooseLanguage', { defaultValue: 'Choose Language' })}</Text>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.languageOptionsList}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLangCode;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleLanguageChange(lang.code)}
                    style={[styles.languageItem, isSelected && styles.languageItemSelected]}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[styles.languageItemLabel, isSelected && styles.languageItemLabelSelected]}>
                        {lang.label}
                      </Text>
                      <Text style={styles.languageItemNative}>{lang.native}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
  },
  qrBadgeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#0F2A4A',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  langIcon: {
    marginRight: 6,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2A4A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  carouselWrapper: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  heroVisualWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    width: '100%',
    paddingHorizontal: 26,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  headlineText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2A4A',
    marginBottom: 10,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  descriptionText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#334155',
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_400Regular',
  },
  bottomSection: {
    paddingHorizontal: 22,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
    height: 12,
  },
  dotBase: {
    height: 6.5,
    borderRadius: 3.5,
    marginHorizontal: 3.5,
  },
  dotActive: {
    width: 32,
    backgroundColor: '#0F2A4A',
  },
  dotInactive: {
    width: 13,
    backgroundColor: '#CBD5E1',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  btnRegister: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D9531E',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRegisterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D9531E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  btnPressedOutline: {
    backgroundColor: 'rgba(217, 83, 30, 0.08)',
  },
  btnLogin: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#D9531E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D9531E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnLoginText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  btnPressedSolid: {
    backgroundColor: '#B84013',
  },

  /* ── Modal Styles ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2A4A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  languageOptionsList: {
    gap: 10,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  languageItemSelected: {
    borderColor: '#D9531E',
    backgroundColor: '#FFF7ED',
  },
  languageItemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2A4A',
  },
  languageItemLabelSelected: {
    color: '#D9531E',
  },
  languageItemNative: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D9531E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
