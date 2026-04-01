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
   * Schedule multiple reminders for a follow-up visit
   * Timing: 3 days, 2 days, 1 day, and 6 hours before
   */
  async schedulePrescriptionFollowup(prescription: any) {
    if (isExpoGoAndroid || !Notifications) return;

    const followupDateStr = prescription.followupDate || prescription.followUpDate || prescription.nextVisit;
    if (!followupDateStr) return;

    const targetDate = new Date(followupDateStr);
    const now = Date.now();
    const doctorName = prescription.doctor?.user?.name || prescription.doctor?.name || 'your specialist';
    
    // 1. Helper to schedule a single point in time
    const scheduleAt = async (date: Date, label: string, body: string) => {
      if (date.getTime() <= now) return;
      
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🏥 ${label}`,
            body,
            data: { prescriptionId: prescription._id, type: 'followup_reminder' },
            sound: true,
          },
          trigger: { type: 'date', date },
        });
        console.log(`[NotificationService] Scheduled: ${label} for ${date.toLocaleString()}`);
      } catch (e) {
        console.error(`[NotificationService] Failed to schedule ${label}:`, e);
      }
    };

    // 2. Schedule the timeline
    const times = [
      { offsetDays: 3, label: '3-Day Reminder', body: `Your follow-up with ${doctorName} is in 3 days.` },
      { offsetDays: 2, label: '2-Day Reminder', body: `Don't forget your follow-up with ${doctorName} in 2 days.` },
      { offsetDays: 1, label: 'Final Reminder', body: `You have a follow-up visit scheduled with ${doctorName} tomorrow.` },
      { offsetHours: 6, label: 'Upcoming Visit', body: `Your follow-up with ${doctorName} is in just 6 hours.` },
    ];

    for (const t of times) {
      const triggerDate = new Date(targetDate);
      if (t.offsetDays) {
        triggerDate.setDate(triggerDate.getDate() - t.offsetDays);
        triggerDate.setHours(9, 0, 0, 0); // Morning reminder
      } else if (t.offsetHours) {
        triggerDate.setHours(triggerDate.getHours() - t.offsetHours);
      }
      
      await scheduleAt(triggerDate, t.label, t.body);
    }
  },

  /**
   * Schedule a random helpful notification (e.g. hydration, medication check)
   */
  async scheduleRandomHealthTip() {
    if (isExpoGoAndroid || !Notifications) return;

    const tips = [
      { title: "💧 Stay Hydrated", body: "Drinking enough water is essential for your recovery. Keep a bottle nearby!" },
      { title: "💊 Medication Check", body: "Remember to take your prescribed medications on time for the best results." },
      { title: "🚶 Gentle Movement", body: "If your doctor allows, a short 5-minute walk can improve your circulation." },
      { title: "🍏 Healthy Eating", body: "A balanced diet helps your body heal faster. Try to include more greens today." },
      { title: "🧘 Mindful Minute", body: "Take a deep breath. Reducing stress is a key part of your wellness journey." },
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    // Schedule it for some time in the next 1-4 hours randomly
    const randomHours = Math.floor(Math.random() * 3) + 1;
    const triggerDate = new Date();
    triggerDate.setHours(triggerDate.getHours() + randomHours);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: randomTip.title,
          body: randomTip.body,
          sound: true,
        },
        trigger: { type: 'date', date: triggerDate },
      });
      console.log(`[NotificationService] Scheduled random tip for ${triggerDate.toLocaleTimeString()}`);
    } catch (e) {
      console.error('[NotificationService] Random tip error:', e);
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
