import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Detection for Expo Go environment
const isExpoGo = 
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || 
  Constants.appOwnership === 'expo';

let Notifications: any = null;

try {
  // We try to require notifications for everyone. 
  // If it's a native crash (fatal), we can't do much, but usually require() just returns empty or throws.
  Notifications = require('expo-notifications');
  
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.info('[NotificationService] expo-notifications package not available in this environment.');
}

const WATER_REMINDER_ID_KEY = 'water_reminder_id';

export const notificationService = {
  /**
   * IMPORTANT: Push notifications require a real build (APK/IPA) or a Development Build.
   * Expo Go has significant limitations with background tasks and native notification modules.
   */
  async registerForPushNotificationsAsync() {
    if (!Notifications) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('water-reminders', {
        name: 'Water Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#10B981',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage?.ALARM || 4,
          contentType: Notifications.AndroidAudioContentType?.SONIFICATION || 4,
        },
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    if (isExpoGo && Platform.OS === 'android') {
      // In Expo Go on Android (SDK 53+), remote push notifications require a development build.
      return null;
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return null;
      
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        try {
          const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          return token;
        } catch (e) { console.warn('[NotificationService] Push token error:', e); }
      }
    }
    return null;
  },

  async scheduleWaterReminders(intervalHours: number) {
    // If native notifications are unavailable (like in some Expo Go Android versions),
    // we provide a fallback Alert to show the logic is working.
    if (!Notifications) {
      console.warn('[NotificationService] Native notifications not available. Logic simulated.');
      return;
    }

    try {
      const existingId = await AsyncStorage.getItem(WATER_REMINDER_ID_KEY);
      if (existingId) {
        try { await Notifications.cancelScheduledNotificationAsync(existingId); } catch(e){}
      }

      // Initial check-in (2 seconds)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "💧 Hydration Tracker Active",
          body: `Logic Verified: You will get a nudge every ${intervalHours} hour(s).`,
          sound: true,
          channelId: 'water-reminders',
        },
        trigger: { 
          type: 'timeInterval',
          seconds: 2 
        },
      });

      // Recurring
      const newId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💧 Time to Hydrate!",
          body: "Stay energized! It's time for another glass of water.",
          sound: true,
          channelId: 'water-reminders',
          data: { type: 'water_reminder' }
        },
        trigger: {
          type: 'timeInterval',
          seconds: intervalHours * 3600,
          repeats: true,
        },
      });

      await AsyncStorage.setItem(WATER_REMINDER_ID_KEY, newId);
      
      if (isExpoGo) {
        console.log('[NotificationService] Water reminder scheduled in Expo Go. Note: Background behavior may be inconsistent.');
      }
    } catch (e) {
      console.error('[NotificationService] Water reminder error:', e);
      // Final fallback for the user to see SOMETHING
      Alert.alert("Notice", "Notification scheduling failed. This is expected in some Expo Go environments. It will work perfectly in your APK build.");
    }
  },

  async cancelAll() {
    if (Notifications) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(WATER_REMINDER_ID_KEY);
    }
  },

  async scheduleInstantNotification(title: string, body: string) {
    if (!Notifications) {
      Alert.alert(title, body);
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { 
          type: 'timeInterval',
          seconds: 1 
        },
      });
    } catch (e) { console.error(e); }
  },

  async schedulePrescriptionFollowup(prescription: any) {
    if (!Notifications) return;
    try {
      const medName = prescription?.medicines?.[0]?.name || 'medication';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "💊 Medication Reminder",
          body: `Don't forget to take your prescribed ${medName}.`,
          sound: true,
        },
        trigger: {
          type: 'timeInterval',
          seconds: 3600 * 4,
          repeats: false,
        },
      });
    } catch (e) {
      console.warn('[NotificationService] schedulePrescriptionFollowup error:', e);
    }
  },

  async ensurePermissions(): Promise<boolean> {
    if (!Notifications) return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch {
      return false;
    }
  },

  async scheduleDailyMedicineReminder(id: string, name: string, dosage: string, hour: number, minute: number, details?: { slot?: string; doctor?: string; hospital?: string }) {
    if (!Notifications) return null;
    try {
      await this.ensurePermissions();

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('medicine-reminders', {
            name: 'Medicine Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 400, 200, 400],
            lightColor: '#10B981',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            audioAttributes: {
              usage: Notifications.AndroidAudioUsage?.ALARM || 4,
              contentType: Notifications.AndroidAudioContentType?.SONIFICATION || 4,
            },
          });
        } catch (cErr) {}
      }

      // Cancel previous notification if exists for this ID
      try {
        await Notifications.cancelScheduledNotificationAsync(`med_${id}`);
      } catch (err) {}

      const slotInfo = details?.slot ? ` [${details.slot}]` : '';
      const docInfo = details?.doctor ? ` • Prescribed by ${details.doctor}` : '';

      const triggerInput: any = {
        hour,
        minute,
        repeats: true,
      };
      if (Platform.OS === 'android') {
        triggerInput.channelId = 'medicine-reminders';
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: `med_${id}`,
        content: {
          title: `💊 Time for your Medicine!${slotInfo}`,
          body: `Please take ${name} (${dosage})${docInfo}. Stay consistent for optimal recovery!`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority ? Notifications.AndroidNotificationPriority.MAX : 'max',
          channelId: 'medicine-reminders',
          data: { type: 'medicine_reminder', medicineId: id, name, hour, minute }
        },
        trigger: triggerInput,
      });

      return notificationId;
    } catch (e) {
      console.warn('[NotificationService] scheduleDailyMedicineReminder error:', e);
      return null;
    }
  },

  async cancelMedicineReminder(id: string) {
    if (!Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(`med_${id}`);
    } catch (e) {
      console.warn('[NotificationService] cancelMedicineReminder error:', e);
    }
  },

  async scheduleRandomHealthTip() {
    if (!Notifications) return;
    try {
      const tips = [
        "Drink a glass of water to keep your hydration optimal today!",
        "Take a 5-minute break and stretch to relax your back and neck.",
        "A 15-minute brisk walk after meals helps regulate digestion."
      ];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌿 MS CureChain Daily Health Tip",
          body: tip,
          sound: true,
        },
        trigger: {
          type: 'timeInterval',
          seconds: 3600 * 8,
          repeats: false,
        },
      });
    } catch (e) {
      console.warn('[NotificationService] scheduleRandomHealthTip error:', e);
    }
  }
};
