import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DigitalAtriumLoader } from '@/components/SanctuaryComponents';

import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import ProfileSetupScreen from '@/screens/ProfileSetupScreen';
import BookAppointmentScreen from '@/screens/BookAppointmentScreen';
import BookingPaymentScreen from '@/screens/BookingPaymentScreen';
import BookingConfirmationScreen from '@/screens/BookingConfirmationScreen';
import BMICalculatorScreen from '@/screens/BMICalculatorScreen';
import AISymptomCheckerScreen from '@/screens/AISymptomCheckerScreen';
import LabReportsScreen from '@/screens/ReportsScreen';
import ChatScreen from '@/screens/ChatScreen';
import SOSScreen from '@/screens/SOSScreen';
import HealthRecordsScreen from '@/screens/HealthRecordsScreen';
import HospitalsScreen from '@/screens/HospitalsScreen';
import UpcomingAppointmentsScreen from '@/screens/UpcomingAppointmentsScreen';
import DischargeRecordsScreen from '@/screens/DischargeRecordsScreen';
import DischargeDetailScreen from '@/screens/DischargeDetailScreen';
import FeedbackScreen from '@/screens/FeedbackScreen';
import TermsAndConditionsScreen from '@/screens/TermsAndConditionsScreen';
import QRScannerScreen from '@/screens/QRScannerScreen';
import FoodRecommendationScreen from '@/screens/FoodRecommendationScreen';
import WaterReminderScreen from '@/screens/WaterReminderScreen';
import MedicineReminderScreen from '@/screens/MedicineReminderScreen';
import AchievementsScreen from '@/screens/AchievementsScreen';
import VitalsScreen from '@/screens/VitalsScreen';
import AppointmentsScreen from '@/screens/AppointmentsScreen';
import PaymentsScreen from '@/screens/PaymentsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import EmergencyMedicalIdScreen from '@/screens/EmergencyMedicalIdScreen';
import LiveQueueScreen from '@/screens/LiveQueueScreen';
import NotificationCenterScreen from '@/screens/NotificationCenterScreen';
import OfflineVaultScreen from '@/screens/OfflineVaultScreen';
import FamilyMembersScreen from '@/screens/FamilyMembersScreen';

// BottomTabNavigator hosts: Home (Dashboard), Appointments, Vitals, Payments, Profile
import BottomTabNavigator from './BottomTabNavigator';
import apiClient, { TOKEN_KEYS } from '@/api/axiosConfig';
import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[AppNavigator] Checking authentication state...');
        const token = await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);

        if (!token) {
          console.log('[AppNavigator] No token found, showing login screen');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.log('[AppNavigator] Token found, attempting validation');

        try {
          const response = await apiClient.get('/auth/me');
          if (response.status === 200) {
            console.log('[AppNavigator] Token validation successful');
            setIsAuthenticated(true);
          } else {
            console.log('[AppNavigator] Token validation failed (status:', response.status, ')');
            await AsyncStorage.multiRemove([TOKEN_KEYS.ACCESS_TOKEN, TOKEN_KEYS.REFRESH_TOKEN]);
            setIsAuthenticated(false);
          }
        } catch (validationError: any) {
          console.log('[AppNavigator] Token validation error:', validationError.message);
          await AsyncStorage.multiRemove([TOKEN_KEYS.ACCESS_TOKEN, TOKEN_KEYS.REFRESH_TOKEN]);
          setIsAuthenticated(false);
        }
      } catch (e: any) {
        console.error('[AppNavigator] Unexpected error in checkAuth:', e);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <DigitalAtriumLoader message="Initializing Secure Portal..." />;
  }

  return (
    <Stack.Navigator
      /**
       * "Dashboard" is the entry point for authenticated users.
       * It renders BottomTabNavigator which contains:
       *   Home (DashboardScreen), Appointments, Vitals, Payments, Profile
       *
       * Any navigate('Appointments') / navigate('Vitals') / etc. call within
       * those tab screens resolves to the Tab navigator first (switches tab),
       * rather than pushing a new Stack frame.
       *
       * Detail / flow screens (BookAppointment, SOS, Reports, …) live in this
       * Stack so they have a full-screen look with no bottom tab bar.
       */
      initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
      screenOptions={{ headerShown: false }}
    >
      {/* ── Auth ───────────────────────────────────────────────────────── */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

      {/* ── Main Tabs (authenticated entry point) ──────────────────────── */}
      <Stack.Screen name="Dashboard" component={BottomTabNavigator} />

      {/* ── Detail / Flow screens – no bottom tab bar ──────────────────── */}
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <Stack.Screen name="BookingPayment" component={BookingPaymentScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
      <Stack.Screen name="BMICalculator" component={BMICalculatorScreen} />
      <Stack.Screen name="AISymptomChecker" component={AISymptomCheckerScreen} />
      <Stack.Screen name="Reports" component={LabReportsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
      <Stack.Screen name="HealthRecords" component={HealthRecordsScreen} />
      <Stack.Screen name="Hospitals" component={HospitalsScreen} />
      <Stack.Screen name="UpcomingAppointments" component={UpcomingAppointmentsScreen} />
      <Stack.Screen name="DischargeRecords" component={DischargeRecordsScreen} />
      <Stack.Screen name="DischargeDetail" component={DischargeDetailScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="FoodRecommendation" component={FoodRecommendationScreen} />
      <Stack.Screen name="WaterReminder" component={WaterReminderScreen} />
      <Stack.Screen name="MedicineReminder" component={MedicineReminderScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="EmergencyMedicalId" component={EmergencyMedicalIdScreen} />
      <Stack.Screen name="LiveQueue" component={LiveQueueScreen} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <Stack.Screen name="OfflineVault" component={OfflineVaultScreen} />
      <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} />

      {/* ── Main Tab Screens Direct Stack Access ───────────────────────── */}
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="Vitals" component={VitalsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
