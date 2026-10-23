import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveAuthTokens, clearAuthTokens, TOKEN_KEYS } from '@/api';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'msc_biometric_auth_enabled';
const BIOMETRIC_SAVED_TOKEN = 'msc_biometric_access_token';
const BIOMETRIC_SAVED_REFRESH = 'msc_biometric_refresh_token';
const BIOMETRIC_SAVED_IDENTIFIER = 'msc_biometric_saved_identifier';

export type BiometricTypeName = 'FaceID' | 'Fingerprint' | 'Iris' | 'Biometrics' | 'None';

export interface BiometricStatus {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: BiometricTypeName;
  label: string;
}

/**
 * Cross-platform secure storage adapter.
 * Uses expo-secure-store on iOS/Android; falls back gracefully to AsyncStorage on web.
 */
const safeSecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
    } catch (err) {
      console.warn('[BiometricService] SecureStore set error, fallback to AsyncStorage', err);
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('[BiometricService] SecureStore get error, fallback to AsyncStorage', err);
      return await AsyncStorage.getItem(key);
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (err) {
      console.warn('[BiometricService] SecureStore delete error', err);
      await AsyncStorage.removeItem(key);
    }
  },
};

/**
 * Check whether device hardware supports biometrics and has enrolled fingerprints or face data.
 */
export const checkBiometricAvailability = async (): Promise<BiometricStatus> => {
  try {
    if (Platform.OS === 'web') {
      return {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        biometricType: 'None',
        label: 'Biometrics unavailable on web',
      };
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricTypeName = 'Biometrics';
    let label = 'Biometric Unlock';

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'FaceID';
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'Fingerprint';
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'Iris';
      label = 'Iris Scan';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      biometricType: hasHardware ? biometricType : 'None',
      label,
    };
  } catch (error) {
    console.error('[BiometricService] Error checking biometric availability:', error);
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometricType: 'None',
      label: 'Biometrics',
    };
  }
};

/**
 * Check if the user has opted to enable biometric login in their settings.
 */
export const isBiometricLoginEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
};

/**
 * Get saved user identifier (mobile/email) for quick login autofill.
 */
export const getSavedBiometricIdentifier = async (): Promise<string | null> => {
  try {
    return await safeSecureStorage.getItem(BIOMETRIC_SAVED_IDENTIFIER);
  } catch {
    return null;
  }
};

/**
 * Prompt the user for biometric authentication (FaceID or Fingerprint).
 */
export const authenticateWithBiometrics = async (
  promptTitle = 'MSCureChain Biometric Unlock',
  cancelLabel = 'Use Password',
): Promise<{ success: boolean; error?: string }> => {
  try {
    const availability = await checkBiometricAvailability();
    if (!availability.isAvailable) {
      return {
        success: false,
        error: !availability.hasHardware
          ? 'Device does not support biometric authentication.'
          : 'No biometric credentials enrolled on this device. Please set up Face ID or Fingerprint in device Settings.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptTitle,
      fallbackLabel: cancelLabel,
      cancelLabel,
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error === 'user_cancel' ? 'Authentication cancelled' : 'Biometric verification was not recognized.',
    };
  } catch (err: any) {
    console.error('[BiometricService] Authentication error:', err);
    return {
      success: false,
      error: err?.message || 'Biometric authentication failed.',
    };
  }
};

/**
 * Enable biometric login for the current account.
 * Persists secure tokens and sets user preference flag to true.
 */
export const enableBiometricLogin = async (credentials: {
  accessToken: string;
  refreshToken?: string;
  identifier?: string;
}): Promise<boolean> => {
  try {
    // Authenticate first before enabling
    const authResult = await authenticateWithBiometrics(
      'Scan to enable Biometric Login',
      'Cancel',
    );
    if (!authResult.success) {
      return false;
    }

    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    await safeSecureStorage.setItem(BIOMETRIC_SAVED_TOKEN, credentials.accessToken);
    if (credentials.refreshToken) {
      await safeSecureStorage.setItem(BIOMETRIC_SAVED_REFRESH, credentials.refreshToken);
    }
    if (credentials.identifier) {
      await safeSecureStorage.setItem(BIOMETRIC_SAVED_IDENTIFIER, credentials.identifier);
    }
    return true;
  } catch (err) {
    console.error('[BiometricService] Failed to enable biometric login:', err);
    return false;
  }
};

/**
 * Disable biometric login and remove all stored biometric credentials.
 */
export const disableBiometricLogin = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    await safeSecureStorage.deleteItem(BIOMETRIC_SAVED_TOKEN);
    await safeSecureStorage.deleteItem(BIOMETRIC_SAVED_REFRESH);
    await safeSecureStorage.deleteItem(BIOMETRIC_SAVED_IDENTIFIER);
  } catch (err) {
    console.error('[BiometricService] Failed to disable biometric login:', err);
  }
};

/**
 * Perform 1-tap biometric login.
 * Prompts user with native FaceID / Fingerprint dialog, and restores valid access tokens.
 */
export const performBiometricLogin = async (): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> => {
  try {
    const isEnabled = await isBiometricLoginEnabled();
    if (!isEnabled) {
      return { success: false, error: 'Biometric login is not enabled on this account.' };
    }

    // Attempt biometric scan
    const authResult = await authenticateWithBiometrics(
      'Sign in with Biometrics',
      'Enter Password',
    );
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Retrieve tokens from secure storage (or fallback to existing AsyncStorage tokens)
    let token = await safeSecureStorage.getItem(BIOMETRIC_SAVED_TOKEN);
    let refreshToken = await safeSecureStorage.getItem(BIOMETRIC_SAVED_REFRESH);

    if (!token) {
      // Fallback to active app tokens
      token = await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      refreshToken = await AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
    }

    if (!token) {
      return {
        success: false,
        error: 'No stored session found. Please sign in with your mobile number and password first.',
      };
    }

    // Re-save into active session
    await saveAuthTokens(token, refreshToken || '');
    return { success: true, accessToken: token };
  } catch (err: any) {
    console.error('[BiometricService] performBiometricLogin error:', err);
    return { success: false, error: err?.message || 'Biometric login error' };
  }
};

/**
 * Updates stored biometric credentials whenever tokens are updated or refreshed.
 */
export const updateBiometricStoredTokens = async (
  accessToken: string,
  refreshToken?: string,
): Promise<void> => {
  try {
    const enabled = await isBiometricLoginEnabled();
    if (enabled) {
      await safeSecureStorage.setItem(BIOMETRIC_SAVED_TOKEN, accessToken);
      if (refreshToken) {
        await safeSecureStorage.setItem(BIOMETRIC_SAVED_REFRESH, refreshToken);
      }
    }
  } catch (err) {
    console.warn('[BiometricService] Could not update stored biometric tokens:', err);
  }
};
