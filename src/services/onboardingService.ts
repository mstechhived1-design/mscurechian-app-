import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage key for the onboarding completion state.
 * Versioned so that significant future app redesigns can trigger onboarding if needed.
 */
export const ONBOARDING_STORAGE_KEY = '@mscurechain_onboarding_completed_v1';

/**
 * Checks whether the user has already completed or skipped the onboarding flow.
 * Returns true if completed, false on fresh installs or if not found.
 */
export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('[OnboardingService] Error reading onboarding flag:', error);
    // On storage failure, fail safe by not blocking the user (proceed to login)
    return false;
  }
};

/**
 * Marks onboarding as completed in persistent storage.
 * Called when the user taps 'Skip' or 'Get Started'.
 */
export const setOnboardingCompleted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    console.log('[OnboardingService] Onboarding flag successfully marked as completed');
  } catch (error) {
    console.error('[OnboardingService] Error saving onboarding flag:', error);
  }
};

/**
 * Helper to reset onboarding flag (useful for testing or debugging).
 */
export const resetOnboardingForTesting = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    console.log('[OnboardingService] Onboarding flag reset for testing');
  } catch (error) {
    console.error('[OnboardingService] Error resetting onboarding flag:', error);
  }
};
