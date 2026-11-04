import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Calendar,
  ReceiptText,
  User,
  QrCode,
} from 'lucide-react-native';

import DashboardScreen from '@/screens/DashboardScreen';
import AppointmentsScreen from '@/screens/AppointmentsScreen';
import PaymentsScreen from '@/screens/PaymentsScreen';
import ProfileScreen from '@/screens/ProfileScreen';

export type BottomTabParamList = {
  Home: undefined;
  Appointments: undefined;
  ScanQR: undefined;
  Payments: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const PRIMARY_BLUE = '#1769E0';
const INACTIVE_GRAY = '#94A3B8';

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
        color={focused ? PRIMARY_BLUE : INACTIVE_GRAY}
        strokeWidth={focused ? 2.3 : 1.8}
      />
      {focused && <View style={styles.activeIndicator} />}
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
        tabBarActiveTintColor: PRIMARY_BLUE,
        tabBarInactiveTintColor: INACTIVE_GRAY,
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
        name="ScanQR"
        component={DashboardScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation as any).navigate('QRScanner');
          },
        })}
        options={{
          tabBarLabel: 'Scan QR',
          tabBarIcon: () => (
            <View style={styles.qrCenterCircle}>
              <QrCode size={22} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          ),
          tabBarItemStyle: styles.qrTabItem,
        }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          tabBarLabel: 'Bill History',
          tabBarIcon: ({ focused }) => <TabIcon Icon={ReceiptText} focused={focused} />,
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
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 16,
    paddingBottom: Platform.OS === 'ios' ? 18 : 6,
    paddingTop: 4,
  },
  tabItem: {
    paddingTop: 1,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  iconWrap: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCenterCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -12,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  qrTabItem: {
    paddingTop: 0,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -18,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY_BLUE,
  },
});

