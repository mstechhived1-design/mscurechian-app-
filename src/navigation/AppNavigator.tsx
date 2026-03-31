import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import LoginScreen from '@/screens/LoginScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import AppointmentsScreen from '@/screens/AppointmentsScreen';
import BookingComingSoonScreen from '@/screens/BookingComingSoonScreen';
import BMICalculatorScreen from '@/screens/BMICalculatorScreen';
import AISymptomCheckerScreen from '@/screens/AISymptomCheckerScreen';
import LabReportsScreen from '@/screens/ReportsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ChatScreen from '@/screens/ChatScreen';
import SOSScreen from '@/screens/SOSScreen';
import VitalsScreen from '@/screens/VitalsScreen';
import PaymentsScreen from '@/screens/PaymentsScreen';
import HealthRecordsScreen from '@/screens/HealthRecordsScreen';
import HospitalsScreen from '@/screens/HospitalsScreen';
import DischargeRecordsScreen from '@/screens/DischargeRecordsScreen';
import DischargeDetailScreen from '@/screens/DischargeDetailScreen';
import FeedbackScreen from '@/screens/FeedbackScreen';
import { TOKEN_KEYS } from '@/api/axiosConfig';

import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

// Ensure the mobile app hits the live portals (doctors, emergencies, bookings, etc).
const BASE_URL = 'https://www.mscurechain.com/api';

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
        
        // VALIDATE token against the backend — don't trust stale tokens
        try {
          const response = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });

          if (response.status === 200) {
            console.log('[AppNavigator] Token validation successful');
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear it and force re-login
            console.log('[AppNavigator] Token validation failed (status:', response.status, ')');
            await AsyncStorage.multiRemove([TOKEN_KEYS.ACCESS_TOKEN, TOKEN_KEYS.REFRESH_TOKEN]);
            setIsAuthenticated(false);
          }
        } catch (validationError: any) {
          console.log('[AppNavigator] Token validation error:', validationError.message);
          // Token is expired or invalid — clear it
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
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating size="large" color="#006AF5" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="BookAppointment" component={BookingComingSoonScreen} />
      <Stack.Screen name="BMICalculator" component={BMICalculatorScreen} />
      <Stack.Screen name="AISymptomChecker" component={AISymptomCheckerScreen} />
      <Stack.Screen name="Reports" component={LabReportsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
      <Stack.Screen name="Vitals" component={VitalsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="HealthRecords" component={HealthRecordsScreen} />
      <Stack.Screen name="Hospitals" component={HospitalsScreen} />
      <Stack.Screen name="DischargeRecords" component={DischargeRecordsScreen} />
      <Stack.Screen name="DischargeDetail" component={DischargeDetailScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
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
