import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detect if we are in Expo Go on Android where SDK 53+ forbids use of expo-notifications
const isExpoGoAndroid = 
  Platform.OS === 'android' && 
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants.expoConfig && !Constants.expoConfig.extra?.eas?.projectId));

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
   * Schedule the full follow-up reminder timeline
   * Timing: 3 days, 2 days, 1 day, 6 hours, 3 hours, and 1 hour before
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
      // Don't schedule past events (this filters old reminders automatically)
      if (date.getTime() <= now) return;
      
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: label,
            body,
            data: { prescriptionId: prescription._id, type: 'followup_countdown' },
            sound: true,
          },
          trigger: { type: 'date', date },
        });
        console.log(`[NotificationService] Scheduled: ${label} for ${date.toLocaleString()}`);
      } catch (e) {
        console.error(`[NotificationService] Failed to schedule ${label}:`, e);
      }
    };

    // 2. Clear previous specific prescription reminders before re-scheduling
    // (Manual clearing for this specific presc id is complex without stored ids, 
    // so we assume standard re-sync on refresh is acceptable).

    // 3. Define the countdown timeline
    const times = [
      { offsetDays: 3,  label: '🗓️ 3 Days to Go!',      body: `Your health journey continues! You have a follow-up with ${doctorName} in 3 days.` },
      { offsetDays: 2,  label: '📅 2 Days Left!',       body: `Quick reminder! Your follow-up visit with ${doctorName} is in 2 days.` },
      { offsetDays: 1,  label: '🔔 Tomorrow\'s the Day!', body: `Don't forget — you have a follow-up visit with ${doctorName} tomorrow.` },
      { offsetHours: 6, label: '⏰ 6 Hours to Go!',     body: `Your follow-up with ${doctorName} is in just 6 hours.` },
      { offsetHours: 3, label: '🕒 3 Hours to Go!',     body: `Checking in! Your follow-up visit with ${doctorName} is in 3 hours.` },
      { offsetHours: 1, label: '⌛ 1 Hour Left!',       body: `Get ready! Your follow-up with ${doctorName} is in just 1 hour.` },
    ];

    for (const t of times) {
      const triggerDate = new Date(targetDate);
      if (t.offsetDays) {
        triggerDate.setDate(triggerDate.getDate() - t.offsetDays);
        triggerDate.setHours(9, 0, 0, 0); // Morning reminder for daily alerts
      } else if (t.offsetHours) {
        triggerDate.setHours(triggerDate.getHours() - t.offsetHours);
      }
      
      await scheduleAt(triggerDate, t.label, t.body);
    }

    // 4. Fallback for TODAY: If they are scheduling this JUST NOW and it's happening today
    const hoursRemaining = (targetDate.getTime() - now) / (1000 * 60 * 60);
    if (hoursRemaining > 0 && hoursRemaining < 1) {
       // If less than 1 hour remains, send an instant fallback alert
       await this.scheduleInstantNotification("🚀 Urgent: Follow-up Soon!", `You have a visit with ${doctorName} scheduled for ${targetDate.toLocaleTimeString()}.`);
    }
  },

  /**
   * Schedule a random helpful notification (e.g. hydration, medication check)
   */
  async scheduleRandomHealthTip() {
    if (isExpoGoAndroid || !Notifications) return;

    const tips = [
      { title: "💧 Time for a Sip!", body: "Your body will thank you! Grab a glass of water and stay energized today." },
      { title: "💊 Quick Check-in!", body: "A healthy routine is key! Just a friendly nudge to take your medications on time." },
      { title: "🚶 Power Up!", body: "Feel like a walk? A short walk helps your body heal faster and boosts your mood." },
      { title: "🍏 Healthy Eating!", body: "Eating well is part of the cure. Try to include some greens in your next meal." },
      { title: "🧘 Mindful Minute!", body: "Take a deep breath. Reducing stress is a key part of your wellness journey." },
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    // Schedule it for some time in the next 1-4 hours randomly
    const randomHours = Math.floor(Math.random() * 3) + 1;
    const triggerDate = new Date();
    triggerDate.setHours(triggerDate.getHours() + randomHours);

    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: randomTip.title, body: randomTip.body, sound: true },
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
