import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEYS } from '@/api/axiosConfig';
import { socketService } from '@/services/socketService';
import { apiClient, PATIENT_ENDPOINTS, NOTIFICATION_ENDPOINTS } from '@/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface LiveNotification {
  _id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface AppointmentUpdate {
  appointmentId: string;
  status: string;
  message?: string;
}

interface SocketContextValue {
  isConnected: boolean;
  notifications: LiveNotification[];
  unreadCount: number;
  latestAppointmentUpdate: AppointmentUpdate | null;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  refreshNotifications: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────
const SocketContext = createContext<SocketContextValue>({
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  latestAppointmentUpdate: null,
  markNotificationRead: () => {},
  markAllRead: () => {},
  refreshNotifications: () => {},
});

export const useSocket = () => useContext(SocketContext);

// ─── Provider ──────────────────────────────────────────────────────────────
export function SocketProvider({ children }: { children: React.ReactNode }) {
  console.log('[SocketProvider] Initializing...');
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [latestAppointmentUpdate, setLatestAppointmentUpdate] = useState<AppointmentUpdate | null>(null);
  const userIdRef = useRef<string | null>(null);

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  // Load initial notifications from backend
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get(NOTIFICATION_ENDPOINTS.BASE);
      const rawData = res.data;
      
      let list = [];
      if (Array.isArray(rawData)) {
        list = rawData;
      } else if (rawData && Array.isArray(rawData.data)) {
        list = rawData.data;
      } else if (rawData && typeof rawData === 'object') {
        // Find any array property that might be the list
        const possibleArray = Object.values(rawData).find(v => Array.isArray(v)) as any[];
        if (possibleArray) list = possibleArray;
      }

      console.log('[SocketContext] Fetched real notifications count:', list.length);
      setNotifications(list);
    } catch (err) {
      console.warn('[SocketContext] Notification fetch failed:', err);
    }
  }, []);


  // Mark single notification read
  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await apiClient.put(NOTIFICATION_ENDPOINTS.READ(id));
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {}
  }, []);

  // Mark all read
  const markAllRead = useCallback(async () => {
    try {
      await apiClient.put(NOTIFICATION_ENDPOINTS.READ_ALL);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  }, []);

  useEffect(() => {
    const base64Decode = (str: string) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      str = str.replace(/=+$/, '');
      if (str.length % 4 === 1) return '';
      for (
        let bc = 0, bs = 0, buffer, i = 0;
        (buffer = str.charAt(i++));
        ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
          ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
          : 0
      ) {
        buffer = chars.indexOf(buffer);
      }
      return output;
    };

    const init = async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
        if (!token) return;

        const parts = token.split('.');
        if (parts.length !== 3) return;
        
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(base64Decode(base64));
        const userId = payload.id || payload._id || payload.sub;
        if (!userId) throw new Error('No user ID found in token');
        
        userIdRef.current = userId;
        socketService.connect(userId, token);
        await refreshNotifications();
      } catch (err) {
        console.error('[SocketContext] Init error:', err);
      }
    };

    init();

    const intervalId = setInterval(() => {
      setIsConnected(socketService.isConnected());
    }, 2000);

    const unsubNew = socketService.on<LiveNotification>('notification:new', (data) => {
      setNotifications(prev => [{ ...data, isRead: false }, ...prev]);
    });

    const unsubCancelled = socketService.on<AppointmentUpdate>('appointment_cancelled', (data) => {
      setLatestAppointmentUpdate({ ...data, status: 'cancelled' });
      setNotifications(prev => [{
        _id: Date.now().toString(),
        message: data.message || 'Your appointment was cancelled.',
        type: 'appointment_cancelled',
        isRead: false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    });

    const unsubConfirmed = socketService.on<AppointmentUpdate>('appointment_confirmed', (data) => {
      setLatestAppointmentUpdate({ ...data, status: 'confirmed' });
      setNotifications(prev => [{
        _id: Date.now().toString(),
        message: data.message || '✅ Your appointment has been confirmed!',
        type: 'appointment_confirmed',
        isRead: false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    });

    const unsubCompleted = socketService.on<AppointmentUpdate>('appointment_completed', (data) => {
      setLatestAppointmentUpdate({ ...data, status: 'completed' });
    });

    return () => {
      clearInterval(intervalId);
      unsubNew();
      unsubCancelled();
      unsubConfirmed();
      unsubCompleted();
      socketService.disconnect();
    };
  }, [refreshNotifications]);

  return (
    <SocketContext.Provider value={{
      isConnected,
      notifications,
      unreadCount,
      latestAppointmentUpdate,
      markNotificationRead,
      markAllRead,
      refreshNotifications,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
