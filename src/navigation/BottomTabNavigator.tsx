import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
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

export type BottomTabParamList = {
  Home: undefined;
  Appointments: undefined;
  AISymptomChecker: undefined;
  Payments: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

function TabIcon({
  Icon,
  focused,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Icon
        size={22}
        color={focused ? COLORS.primary : '#94A3B8'}
        strokeWidth={focused ? 2.4 : 1.9}
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
        tabBarButton: ({ ref, style, ...rest }: any) => (
          <Pressable
            {...rest}
            android_ripple={null}
            style={({ pressed }) => [style, pressed && { opacity: 0.85 }]}
          />
        ),
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
          tabBarLabel: 'Visits',
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

const TAB_HEIGHT = Platform.OS === 'ios' ? 84 : 64;

const styles = StyleSheet.create({
  tabBar: {
    height: TAB_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 16,
    paddingBottom: Platform.OS === 'ios' ? 18 : 6,
    paddingTop: 4,
  },
  tabItem: {
    paddingTop: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  iconWrap: {
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
