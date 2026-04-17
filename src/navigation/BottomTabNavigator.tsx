import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Calendar,
  Activity,
  CreditCard,
  User,
  Brain,
} from 'lucide-react-native';

import DashboardScreen from '@/screens/DashboardScreen';
import AppointmentsScreen from '@/screens/AppointmentsScreen';
import AISymptomCheckerScreen from '@/screens/AISymptomCheckerScreen';
import PaymentsScreen from '@/screens/PaymentsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import { COLORS } from '@/constants/designSystem';

/**
 * Tab screen names intentionally match the stack navigation names used in
 * DashboardScreen (e.g. navigate('Appointments'), navigate('Vitals'), …)
 * so that React Navigation finds these screens in the nearest Tab navigator
 * first, switching tabs instead of pushing a new stack frame.
 */
export type BottomTabParamList = {
  /** Maps to DashboardScreen */
  Home: undefined;
  /** navigate('Appointments') from any tab child resolves here */
  Appointments: undefined;
  /** navigate('AISymptomChecker') resolves here */
  AISymptomChecker: undefined;
  /** navigate('Payments') resolves here */
  Payments: undefined;
  /** navigate('Profile') resolves here */
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// ── Pill‑style active icon wrapper ──────────────────────────────────────────
function TabIcon({
  Icon,
  focused,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon
        size={24}
        color={focused ? COLORS.primary : '#94A3B8'}
        strokeWidth={focused ? 2.5 : 2.0}
      />
    </View>
  );
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Calendar} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AISymptomChecker"
        component={AISymptomCheckerScreen}
        options={{
          tabBarLabel: 'AI Symptoms',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Brain} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          tabBarLabel: 'Payments',
          tabBarIcon: ({ focused }) => <TabIcon Icon={CreditCard} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const TAB_HEIGHT = Platform.OS === 'ios' ? 95 : 75;

const styles = StyleSheet.create({
  tabBar: {
    height: TAB_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    // Premium shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingTop: 6,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  iconWrap: {
    width: 50,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#EEF4FF',
  },
});
