import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detect if we are in Expo Go on Android where SDK 53+ forbids use of expo-notifications
const isExpoGoAndroid = 
  Platform.OS === 'android' && 
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !Constants.expoConfig?.extra?.eas?.projectId);

// Lazy-load Notifications only if supported to prevent the fatal error at import time
let Notifications: any = null;
if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
    
    // Initial configuration
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[NotificationService] Failed to lazy-load expo-notifications:', e);
  }
}

export const notificationService = {
  /**
   * Request permissions and get push token (if supported)
   */
  async registerForPushNotificationsAsync() {
    if (isExpoGoAndroid || !Notifications) {
      console.info('[NotificationService] Push tokens NOT supported in Expo Go for Android (SDK 53+). Use a development build.');
      return null;
    }

    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.info('[NotificationService] No PROJECT_ID found in app.json. Push tokens disabled.');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('[NotificationService] Alert: Permissions were not granted for notifications');
        return null;
      }
      
      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('[NotificationService] Push Token Acquired:', token);
      } catch (e) {
        console.warn('[NotificationService] Error acquiring push token:', e);
      }
    } else {
      console.log('[NotificationService] Physical device required for push tokens');
    }

    return token;
  },

  /**
   * Schedule a local notification
   */
  async scheduleFollowupReminder(doctorName: string, followupDate: string | Date) {
    if (isExpoGoAndroid || !Notifications) return;

    const targetDate = new Date(followupDate);
    targetDate.setHours(9, 0, 0, 0);

    if (targetDate.getTime() < Date.now()) return;

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🏥 Upcoming Follow-up Visit",
          body: `You have a scheduled follow-up with ${doctorName} today. Please check your medical records.`,
          data: { doctorName, followupDate },
          sound: true,
        },
        trigger: {
          type: 'date', // Use string instead of enum to follow JS-only mode if needed
          date: targetDate,
        },
      });
      console.log(`[NotificationService] Reminder scheduled for ${doctorName}`);
      return identifier;
    } catch (e) {
      console.warn('[NotificationService] Failed to schedule local notification:', e);
    }
  },

  /**
   * Schedule an instant notification
   */
  async scheduleInstantNotification(title: string, body: string) {
    if (isExpoGoAndroid || !Notifications) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: {
          type: 'timeInterval',
          seconds: 1,
        },
      });
    } catch (e) {
      console.error('[NotificationService] Instant notification error:', e);
    }
  },

  /**
   * Cancel all notifications
   */
  async cancelAll() {
    if (Notifications) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }
};
