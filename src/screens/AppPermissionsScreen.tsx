import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import { RootStackParamList } from '../navigation/types';

const PERMISSIONS_HERO_IMG = require('../../assets/flashcards/Handshake Agreement Illustration.png');

export const PERMISSIONS_STORAGE_KEY = '@mscurechain_permissions_acknowledged_v1';

export default function AppPermissionsScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AppPermissions'>>();
  const { t } = useTranslation();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isRequesting, setIsRequesting] = useState(false);

  const returnTo = route.params?.returnTo || 'Login';

  const handleContinue = async () => {
    setIsRequesting(true);
    try {
      // 1. Request Camera permission for hospital QR scan
      try {
        if (!cameraPermission?.granted) {
          await requestCameraPermission();
        }
      } catch (camErr) {
        console.warn('[Permissions] Camera permission skipped or failed:', camErr);
      }

      // 2. Request Location permission for nearby hospital discovery
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch (locErr) {
        console.warn('[Permissions] Location permission skipped or failed:', locErr);
      }

      // 3. Mark permissions as acknowledged
      await AsyncStorage.setItem(PERMISSIONS_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('[Permissions] Error persisting permission state:', e);
    } finally {
      setIsRequesting(false);
      // Navigate to selected target (Register, Login, or Dashboard)
      if (returnTo === 'Register') {
        navigation.navigate('Register');
      } else if (returnTo === 'Dashboard') {
        navigation.navigate('Dashboard');
      } else {
        navigation.navigate('Login');
      }
    }
  };

  const heroHeight = Math.min(screenHeight * 0.32, 240);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Top Header Bar ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <Text style={styles.headerTitle}>{t('permissions.title', { defaultValue: 'App Permissions' })}</Text>
      </View>

      {/* ── Friendly Handshake & Floating Badges Illustration ── */}
      <View style={[styles.heroContainer, { height: heroHeight }]}>
        <Image
          source={PERMISSIONS_HERO_IMG}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      {/* ── Deep Navy Bottom Sheet with Detailed Consent Information ── */}
      <View style={[styles.navySheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Camera Permission Details */}
          <Text style={styles.paragraphText}>
            {t('permissions.cameraDesc', {
              defaultValue:
                'The camera feature has been added for the specific purpose of scanning a QR code at a health facility, confirming all details, and sharing health-related consent-based information and data with one click by the user. The camera shall not access any personal information or data of the user.',
            })}
          </Text>

          {/* Storage Access */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{t('permissions.storageTitle', { defaultValue: 'Storage Access' })}</Text>
            <Text style={styles.paragraphText}>
              {t('permissions.storageDesc', {
                defaultValue:
                  "The app uses the mobile device's external storage to access files and documents. The app uses the cache memory of the mobile device for the purpose of enabling the user to access medical and health records in the form of PDFs or any other format that can also be downloaded by the user onto the mobile device.",
              })}
            </Text>
          </View>

          {/* Location Access */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{t('permissions.locationTitle', { defaultValue: 'Location Access' })}</Text>
            <Text style={styles.paragraphText}>
              {t('permissions.locationDesc', {
                defaultValue:
                  'Geolocation data is being collected in order to enable QR code scanning for getting token numbers and to enable nearby MSCureChain facility search.',
              })}
            </Text>
          </View>
        </ScrollView>

        {/* ── Full Width Vibrant Orange Continue Button ── */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.continueButton, isRequesting && styles.continueButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={isRequesting}
            accessibilityRole="button"
            accessibilityLabel={t('permissions.continueBtn', { defaultValue: 'Continue' })}
          >
            {isRequesting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>
                {t('permissions.continueBtn', { defaultValue: 'Continue' })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2A4A',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  heroContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  navySheet: {
    flex: 1,
    backgroundColor: '#1B3676',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 22,
    marginTop: 8,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingBottom: 16,
  },
  sectionBlock: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  paragraphText: {
    fontSize: 13,
    lineHeight: 19.5,
    color: '#E2E8F0',
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_400Regular',
  },
  actionContainer: {
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: '#E65C19',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E65C19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
});
